'use server';
import { supabaseAdmin } from '../supabase-admin';
import { getCallerOrgId } from './team-members';

export interface TaskStatusRow {
  id: string;
  org_id: string;
  /** null = org-wide (appears on global /tasks + on every project board as a default).
   *  UUID = scoped to that specific project only. */
  project_id: string | null;
  slug: string;
  label: string;
  color: string;
  position: number;
  is_default: boolean;
  created_at: string;
}

/** Scope controls which rows `getTaskStatuses` returns.
 *  - `"all"` (default): every row in the org (org-wide + all project-scoped).
 *    Use in the task form preload where we don't yet know the task's project.
 *  - `{ projectId: null }`: org-wide only. Use on the global `/tasks` page.
 *  - `{ projectId: "…" }`: org-wide + that project's scoped rows. Use on a
 *    project's board so the user sees defaults + their project's custom columns.
 */
export type StatusScope = "all" | { projectId: string | null };

/** Matches a canonical UUID (hex groups 8-4-4-4-12). Used to sanitise any id we
 *  interpolate into a Postgres `.or()` filter — Supabase does not parameterise
 *  those, so an unvalidated id would allow filter injection. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_STATUSES: Omit<TaskStatusRow, 'id' | 'org_id' | 'project_id' | 'created_at'>[] = [
  { slug: 'todo', label: 'To Do', color: '#666666', position: 0, is_default: true },
  { slug: 'in_progress', label: 'In Progress', color: '#5e6ad2', position: 1, is_default: true },
  { slug: 'done', label: 'Done', color: '#26c97f', position: 2, is_default: true },
];

/** Fetch task statuses for the caller's org, optionally filtered by project scope. */
export async function getTaskStatuses(
  orgIdOverride?: string,
  scope: StatusScope = "all",
): Promise<TaskStatusRow[]> {
  const orgId = orgIdOverride ?? await getCallerOrgId();
  let query = (supabaseAdmin as any)
    .from('task_statuses')
    .select('*')
    .eq('org_id', orgId)
    .order('position', { ascending: true });

  if (scope !== "all") {
    if (scope.projectId === null) {
      query = query.is('project_id', null);
    } else {
      // Validate the projectId before interpolating into an .or() filter —
      // Supabase's PostgREST filter string is not parameterised, so an
      // attacker-controlled value could inject extra filter clauses.
      if (!UUID_REGEX.test(scope.projectId)) {
        throw new Error('Invalid projectId');
      }
      // Postgres OR filter: org-wide rows OR this project's rows
      query = query.or(`project_id.is.null,project_id.eq.${scope.projectId}`);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch task statuses: ${error.message}`);
  return data ?? [];
}

/** Fallback when a workspace somehow has no statuses at all. Matches the first
 *  slug in DEFAULT_STATUSES. */
const FALLBACK_STATUS = 'todo';

/**
 * Slug of the first column on a project's board — where a newly created task
 * belongs.
 *
 * Statuses are per-workspace and editable, so 'todo' is not guaranteed to
 * exist. The board builds its columns from task_statuses and silently drops any
 * task whose status matches no column, so a hardcoded slug makes tasks vanish
 * with no error the moment someone renames that column.
 *
 * Shared by the notes2board ingest endpoint and the meeting-notes action so the
 * two cannot drift apart.
 */
export async function resolveLandingStatus(
  orgId: string,
  projectId: string
): Promise<string> {
  const { data, error } = await (supabaseAdmin as any)
    .from('task_statuses')
    .select('slug, position, project_id')
    .eq('org_id', orgId)
    .order('position', { ascending: true });

  if (error || !data) return FALLBACK_STATUS;

  // Board columns = org-wide statuses plus the ones scoped to this project.
  // Filtered here rather than with a PostgREST .or() string, which is not
  // parameterised and would need the id sanitised before interpolation.
  const onThisBoard = (data as { slug: string; project_id: string | null }[]).find(
    (s) => s.project_id === null || s.project_id === projectId
  );

  return onThisBoard?.slug ?? FALLBACK_STATUS;
}

/** Ensure default statuses exist for an org (called during signup). Org-wide. */
export async function seedDefaultStatuses(orgId: string): Promise<void> {
  const rows = DEFAULT_STATUSES.map((s) => ({ ...s, org_id: orgId, project_id: null }));
  await (supabaseAdmin as any)
    .from('task_statuses')
    .upsert(rows, { onConflict: 'org_id,slug', ignoreDuplicates: true });
}

/** Create a custom task status. Inserts before the "Done" column.
 *
 *  - `projectId: null`  → org-wide (appears on the global /tasks page).
 *  - `projectId: "…"`   → scoped to that project only.
 */
export async function createTaskStatus(
  orgId: string,
  slug: string,
  label: string,
  color: string,
  projectId: string | null = null,
): Promise<TaskStatusRow> {
  // Position bookkeeping must operate ONLY on rows with the same project_id
  // scope as the row we're inserting — otherwise inserting a project-scoped
  // status would shift org-wide rows (and vice-versa), corrupting positions
  // across scopes.
  if (projectId !== null && !UUID_REGEX.test(projectId)) {
    throw new Error('Invalid projectId');
  }
  let sameScopeQuery = (supabaseAdmin as any)
    .from('task_statuses')
    .select('*')
    .eq('org_id', orgId)
    .order('position', { ascending: true });
  sameScopeQuery = projectId === null
    ? sameScopeQuery.is('project_id', null)
    : sameScopeQuery.eq('project_id', projectId);
  const { data: sameScopeData, error: sameScopeErr } = await sameScopeQuery;
  if (sameScopeErr) throw new Error(`Failed to load existing statuses: ${sameScopeErr.message}`);
  const existing: TaskStatusRow[] = sameScopeData ?? [];

  const doneStatus = existing.find((s) => s.slug === 'done');
  const donePosition = doneStatus?.position ?? existing.length;

  // Shift "done" and anything after it up by 1 (only within the same scope).
  const toShift = existing.filter((s) => s.position >= donePosition);
  for (const s of toShift) {
    await (supabaseAdmin as any)
      .from('task_statuses')
      .update({ position: s.position + 1 })
      .eq('id', s.id);
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('task_statuses')
    .insert({
      org_id: orgId,
      project_id: projectId,
      slug,
      label,
      color,
      position: donePosition,
      is_default: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task status: ${error.message}`);
  return data;
}

/** Delete a custom task status.
 *
 *  - If the status is project-scoped, only tasks in THAT project with that
 *    status are moved to "todo". Other projects are untouched.
 *  - If the status is org-wide, all tasks in the org with that status are moved.
 */
export async function deleteTaskStatus(statusId: string, orgId: string): Promise<void> {
  // Load the status row so we know its project scope + slug.
  const { data: status, error: fetchError } = await (supabaseAdmin as any)
    .from('task_statuses')
    .select('*')
    .eq('id', statusId)
    .eq('org_id', orgId)
    .single();

  if (fetchError || !status) throw new Error('Status not found');
  if (status.is_default) throw new Error('Cannot delete default statuses');

  // Move affected tasks to "todo". Scope the update to the status's project
  // so we don't disturb tasks in other projects.
  let taskUpdate = supabaseAdmin
    .from('tasks')
    .update({ status: 'todo' })
    .eq('status', status.slug)
    .eq('org_id', orgId);

  if (status.project_id) {
    taskUpdate = taskUpdate.eq('project_id', status.project_id);
  }

  await taskUpdate;

  // Delete the status row.
  const { error } = await (supabaseAdmin as any)
    .from('task_statuses')
    .delete()
    .eq('id', statusId)
    .eq('org_id', orgId);

  if (error) throw new Error(`Failed to delete task status: ${error.message}`);

  // Re-compact positions ONLY among rows with the same project_id as the
  // deleted row. Using a wider scope would reshuffle org-wide rows when a
  // project-scoped status is deleted (and vice-versa).
  let remainingQuery = (supabaseAdmin as any)
    .from('task_statuses')
    .select('*')
    .eq('org_id', orgId)
    .order('position', { ascending: true });
  remainingQuery = status.project_id === null
    ? remainingQuery.is('project_id', null)
    : remainingQuery.eq('project_id', status.project_id);
  const { data: remainingData, error: remainingErr } = await remainingQuery;
  if (remainingErr) throw new Error(`Failed to re-compact statuses: ${remainingErr.message}`);
  const remaining: TaskStatusRow[] = remainingData ?? [];
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].position !== i) {
      await (supabaseAdmin as any)
        .from('task_statuses')
        .update({ position: i })
        .eq('id', remaining[i].id);
    }
  }
}
