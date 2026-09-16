'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getTeamMemberByEmail } from '@/lib/db/team-members';
import { resolveLandingStatus } from '@/lib/db/task-statuses';
import {
  getMeetingNoteById,
  markMeetingNoteConverted,
  deleteMeetingNote,
  type ParsedTask,
} from '@/lib/db/meeting-notes';
import type { TaskPriority } from '@/lib/types';

const VALID_PRIORITIES: TaskPriority[] = ['urgent', 'high', 'normal', 'low'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TITLE = 500;
const MAX_DESCRIPTION = 10_000;
const MAX_BATCH = 100;

interface Caller {
  memberId: string;
  orgId: string;
  isAdmin: boolean;
}

/** Signed-in team member, or throw. */
async function requireCaller(): Promise<Caller> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Not signed in');

  const member = await getTeamMemberByEmail(user.email);
  if (!member?.org_id) throw new Error('No workspace found for this account');

  return {
    memberId: member.id,
    orgId: member.org_id,
    isAdmin: member.user_role === 'admin',
  };
}

/**
 * May this person put tasks into this project?
 *
 * Admins: any project in their workspace. Members: only projects they are on,
 * via project_members. Mirrors the rule the tasks and board pages already use.
 */
async function assertProjectAllowed(caller: Caller, projectId: string): Promise<void> {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('org_id', caller.orgId)
    .maybeSingle();

  if (error) throw new Error(`Failed to verify project: ${error.message}`);
  if (!project) throw new Error('That project does not exist in this workspace.');

  if (caller.isAdmin) return;

  const { data: membership } = await (supabaseAdmin as any)
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('member_id', caller.memberId)
    .eq('org_id', caller.orgId)
    .maybeSingle();

  if (!membership) throw new Error('You are not assigned to that project.');
}

/** Re-check one task from the browser. Model output plus user edits — neither
 *  is trusted at this point. Returns an error string instead of throwing so the
 *  caller can name which row was wrong. */
function validateTask(raw: unknown, index: number): ParsedTask | string {
  const t = raw as Record<string, unknown>;

  const title = typeof t?.title === 'string' ? t.title.trim() : '';
  if (!title) return `Task ${index + 1} has no title.`;
  if (title.length > MAX_TITLE) return `Task ${index + 1}: title is too long.`;

  let description: string | null = null;
  if (typeof t?.description === 'string' && t.description.trim()) {
    if (t.description.length > MAX_DESCRIPTION) {
      return `Task ${index + 1}: description is too long.`;
    }
    description = t.description.trim();
  }

  const priority = VALID_PRIORITIES.includes(t?.priority as TaskPriority)
    ? (t.priority as TaskPriority)
    : 'normal';

  let due_date: string | null = null;
  if (typeof t?.due_date === 'string' && t.due_date) {
    if (!DATE_RE.test(t.due_date)) return `Task ${index + 1}: date must be YYYY-MM-DD.`;
    const parsed = new Date(`${t.due_date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(t.due_date)) {
      return `Task ${index + 1}: that is not a real date.`;
    }
    due_date = t.due_date;
  }

  return {
    title,
    description,
    priority,
    due_date,
    assignee_name: typeof t?.assignee_name === 'string' ? t.assignee_name : null,
    assignee_id: typeof t?.assignee_id === 'string' && t.assignee_id ? t.assignee_id : null,
  };
}

export interface CreateTasksResult {
  created: number;
  projectId: string;
}

/**
 * Create real tasks from a reviewed draft.
 *
 * This is the only place meeting notes reach the `tasks` table. Everything
 * before it is a draft the user can throw away.
 */
export async function createTasksFromNotesAction(
  noteId: string,
  projectId: string,
  tasks: unknown[]
): Promise<CreateTasksResult> {
  const caller = await requireCaller();

  // The draft must belong to the caller's workspace.
  const note = await getMeetingNoteById(noteId);
  if (!note) throw new Error('Those meeting notes were not found.');
  if (note.status === 'converted') {
    throw new Error('Tasks were already created from these notes.');
  }

  await assertProjectAllowed(caller, projectId);

  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('Select at least one task to create.');
  }
  if (tasks.length > MAX_BATCH) {
    throw new Error(`Create at most ${MAX_BATCH} tasks at a time.`);
  }

  const valid: ParsedTask[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const result = validateTask(tasks[i], i);
    if (typeof result === 'string') throw new Error(result);
    valid.push(result);
  }

  // Every assignee must be a real member of this workspace. The browser can
  // send any UUID and supabaseAdmin bypasses RLS, so this check is the boundary.
  const assigneeIds = Array.from(
    new Set(valid.map((t) => t.assignee_id).filter((id): id is string => !!id))
  );

  if (assigneeIds.length > 0) {
    const { data: members, error } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .in('id', assigneeIds)
      .eq('org_id', caller.orgId);

    if (error) throw new Error(`Failed to verify assignees: ${error.message}`);

    const known = new Set((members ?? []).map((m) => m.id));
    for (const t of valid) {
      // Drop rather than reject: an unknown assignee should not lose the user
      // the whole batch.
      if (t.assignee_id && !known.has(t.assignee_id)) t.assignee_id = null;
    }
  }

  const status = await resolveLandingStatus(caller.orgId, projectId);

  const rows = valid.map((t) => ({
    org_id: caller.orgId,
    project_id: projectId,
    title: t.title,
    description: t.description,
    priority: t.priority,
    due_date: t.due_date,
    assignee_id: t.assignee_id,
    status,
  }));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('tasks')
    .insert(rows)
    .select('id');

  if (insertError) {
    console.error('[meeting-notes] insert failed', insertError.message);
    throw new Error('Could not create the tasks. Please try again.');
  }

  const created = inserted?.length ?? 0;

  // Assignees must be able to see the project they were just given work in.
  // updateTask does the same when an assignee changes.
  if (assigneeIds.length > 0) {
    await (supabaseAdmin as any).from('project_members').upsert(
      assigneeIds.map((memberId) => ({
        project_id: projectId,
        member_id: memberId,
        org_id: caller.orgId,
      })),
      { onConflict: 'project_id,member_id', ignoreDuplicates: true }
    );
  }

  await markMeetingNoteConverted(noteId, projectId, created);

  revalidatePath('/dashboard', 'layout');

  return { created, projectId };
}

/** Remove an upload and its stored transcript straight away. */
export async function deleteMeetingNoteAction(noteId: string): Promise<void> {
  await requireCaller();
  await deleteMeetingNote(noteId);
  revalidatePath('/dashboard/notes');
}
