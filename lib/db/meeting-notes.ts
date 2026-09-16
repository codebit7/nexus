'use server';
import { supabaseAdmin } from '../supabase-admin';
import { getCallerOrgId } from './team-members';

/**
 * A task the AI pulled out of a transcript. This is model output held in a
 * draft — it is NOT a task yet, and none of it is trusted until the user has
 * reviewed it and the server has re-validated it on create.
 */
export interface ParsedTask {
  title: string;
  description: string | null;
  /** nexus-app scale. The AI's low/medium/high is mapped before it lands here. */
  priority: 'urgent' | 'high' | 'normal' | 'low';
  /** YYYY-MM-DD or null. */
  due_date: string | null;
  /** Name the AI read in the transcript, e.g. "Bilal". Not an id. */
  assignee_name: string | null;
  /** Resolved against team_members when the name matched exactly one person. */
  assignee_id: string | null;
}

export interface MeetingNoteRow {
  id: string;
  org_id: string;
  created_by: string | null;
  title: string;
  source: string;
  file_name: string | null;
  transcript: string | null;
  parsed_tasks: ParsedTask[] | null;
  status: 'draft' | 'converted';
  project_id: string | null;
  task_count: number;
  created_at: string;
  converted_at: string | null;
  /** Set once the 30-day sweep has cleared transcript and parsed_tasks. */
  purged_at: string | null;
}

/** List row for the history page — never carries the transcript. */
export type MeetingNoteListItem = Omit<MeetingNoteRow, 'transcript' | 'parsed_tasks'> & {
  project_name: string | null;
  author_name: string | null;
};

const LIST_COLUMNS =
  'id, org_id, created_by, title, source, file_name, status, project_id, task_count, created_at, converted_at, purged_at';

/**
 * Save a freshly parsed transcript as a draft.
 *
 * Written before the user reviews anything. That is the whole point: the id
 * goes in the URL, so a refresh, a closed tab or a different device reloads the
 * same draft instead of re-running the AI and paying for it twice.
 */
export async function createMeetingNote(input: {
  title: string;
  source: 'upload' | 'paste';
  fileName: string | null;
  transcript: string;
  parsedTasks: ParsedTask[];
  createdBy: string | null;
}): Promise<MeetingNoteRow> {
  const orgId = await getCallerOrgId();

  const { data, error } = await (supabaseAdmin as any)
    .from('meeting_notes')
    .insert({
      org_id: orgId,
      created_by: input.createdBy,
      title: input.title,
      source: input.source,
      file_name: input.fileName,
      transcript: input.transcript,
      parsed_tasks: input.parsedTasks,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to save meeting notes: ${error.message}`);
  return data as MeetingNoteRow;
}

/** One draft, scoped to the caller's org. Null when it does not exist there. */
export async function getMeetingNoteById(id: string): Promise<MeetingNoteRow | null> {
  const orgId = await getCallerOrgId();

  const { data, error } = await (supabaseAdmin as any)
    .from('meeting_notes')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch meeting notes: ${error.message}`);
  return (data as MeetingNoteRow) ?? null;
}

/**
 * History list. Admins see the whole workspace; members see only their own
 * uploads, because a transcript can hold things not everyone should read.
 */
export async function getMeetingNotes(
  opts: { memberId?: string } = {}
): Promise<MeetingNoteListItem[]> {
  const orgId = await getCallerOrgId();

  let query = (supabaseAdmin as any)
    .from('meeting_notes')
    .select(`${LIST_COLUMNS}, projects(name), team_members(name)`)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (opts.memberId) query = query.eq('created_by', opts.memberId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch meeting notes: ${error.message}`);

  return ((data ?? []) as any[]).map(({ projects, team_members, ...rest }) => ({
    ...rest,
    project_name: projects?.name ?? null,
    author_name: team_members?.name ?? null,
  })) as MeetingNoteListItem[];
}

/** Mark a draft as converted once its tasks exist. */
export async function markMeetingNoteConverted(
  id: string,
  projectId: string,
  taskCount: number
): Promise<void> {
  const orgId = await getCallerOrgId();

  const { error } = await (supabaseAdmin as any)
    .from('meeting_notes')
    .update({
      status: 'converted',
      project_id: projectId,
      task_count: taskCount,
      converted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to update meeting notes: ${error.message}`);
}

/**
 * Delete an upload outright.
 *
 * Separate from the 30-day sweep, which only blanks the text and keeps the row
 * for traceability. This is the "remove it now" button for a transcript that
 * should not be sitting there at all.
 */
export async function deleteMeetingNote(id: string): Promise<void> {
  const orgId = await getCallerOrgId();

  const { error } = await (supabaseAdmin as any)
    .from('meeting_notes')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to delete meeting notes: ${error.message}`);
}
