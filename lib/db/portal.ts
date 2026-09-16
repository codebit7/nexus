import { supabaseAdmin as supabase } from '../supabase-admin';
import type { Task, Invoice, Comment, ProjectFile, TeamMember } from '../types';
import { getTaskStatuses, type TaskStatusRow } from './task-statuses';

/**
 * Portal data access. Plain server-side helpers — deliberately NOT `'use server'`.
 *
 * Every function here takes `clientId` as an argument and trusts it. That is
 * fine for a module only the server can reach, but `'use server'` turns each
 * export into an endpoint the browser can call with any arguments it likes —
 * so `getPortalInvoices('<someone-elses-uuid>')` would have returned another
 * company's invoices. Nothing exploited it (the one client-side import is a
 * type, which is erased at build time), but a single ordinary import would have
 * opened all nine at once.
 *
 * The rule this follows is the same one in ./session.ts: a data-access layer is
 * not a server action. Callers resolve clientId from the `portal_client_id`
 * cookie and pass it down.
 */

export type PortalTask = Task & {
  assignee?: Pick<TeamMember, 'name' | 'avatar_url'> | null;
  comment_count?: number;
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

/**
 * Fetch all tasks for a client using an inner join on projects,
 * reducing 2 sequential queries to 1.
 */
export async function getPortalTasks(clientId: string): Promise<PortalTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:team_members(name, avatar_url), project:projects!inner(id), comments(count)')
    .eq('project.client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch portal tasks: ${error.message}`);

  return (data ?? []).map(({ project, comments, ...rest }: any) => ({
    ...rest,
    comment_count: comments?.[0]?.count ?? 0,
  })) as PortalTask[];
}

/**
 * Fetch a single task only if it belongs to a project owned by clientId.
 * Uses inner join — single query instead of 2.
 */
export async function getPortalTaskById(
  taskId: string,
  clientId: string
): Promise<PortalTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:team_members(name, avatar_url), project:projects!inner(id)')
    .eq('id', taskId)
    .eq('project.client_id', clientId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch portal task: ${error.message}`);
  if (!data) return null;

  const { project, ...rest } = data;
  return rest as PortalTask;
}

/**
 * Same as getPortalTaskById but also returns the project name.
 */
export async function getPortalTaskByIdWithProject(
  taskId: string,
  clientId: string
): Promise<(PortalTask & { projectName: string | null }) | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:team_members(name, avatar_url), project:projects!inner(id, name)')
    .eq('id', taskId)
    .eq('project.client_id', clientId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch portal task: ${error.message}`);
  if (!data) return null;

  const { project, ...rest } = data;
  return { ...rest, projectName: (project as { id: string; name: string } | null)?.name ?? null } as PortalTask & { projectName: string | null };
}

/**
 * Fetch task statuses (including custom boards) for the client's org.
 * Falls back to an empty array if the client has no org.
 */
export async function getPortalTaskStatuses(clientId: string): Promise<TaskStatusRow[]> {
  const { data: client, error } = await supabase
    .from('clients')
    .select('org_id')
    .eq('id', clientId)
    .maybeSingle();

  if (error) throw new Error(`Failed to resolve client org: ${error.message}`);
  if (!client?.org_id) return [];

  return getTaskStatuses(client.org_id);
}

// ─── Comments ─────────────────────────────────────────────────────────────────

/**
 * Fetch comments for a task, but only if the task belongs to a project
 * owned by clientId. Uses inner join for ownership validation.
 */
export async function getPortalComments(taskId: string, clientId: string): Promise<Comment[]> {
  // First verify the task belongs to this client
  const { data: task } = await supabase
    .from('tasks')
    .select('id, project:projects!inner(id)')
    .eq('id', taskId)
    .eq('project.client_id', clientId)
    .maybeSingle();

  if (!task) return [];

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch comments: ${error.message}`);
  return data;
}

/**
 * Create a comment on behalf of a portal client.
 * user_id is set to clientId so we can detect "Your" vs "Team" messages on display.
 */
export async function createPortalComment(
  taskId: string,
  content: string,
  clientId: string
): Promise<Comment> {
  // Confirm the task really belongs to this client before writing.
  //
  // Every read helper here already does this; the one write did not, relying on
  // its single caller to check first. That caller does — but a write path is the
  // wrong place to depend on someone else remembering.
  const { data: owned } = await supabase
    .from('tasks')
    .select('id, project:projects!inner(id)')
    .eq('id', taskId)
    .eq('project.client_id', clientId)
    .maybeSingle();

  if (!owned) throw new Error('Task not found or access denied.');

  // Fetch client name to store as author_name
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('comments')
    .insert({
      task_id:     taskId,
      content,
      user_id:     clientId,
      author_name: client?.name ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create comment: ${error.message}`);
  return data;
}

/**
 * Fetch files for a task, but only if the task belongs to a project
 * owned by clientId. Uses inner join for ownership validation.
 */
export async function getPortalFilesByTaskId(taskId: string, clientId: string): Promise<ProjectFile[]> {
  // Verify task belongs to this client
  const { data: task } = await supabase
    .from('tasks')
    .select('id, project:projects!inner(id)')
    .eq('id', taskId)
    .eq('project.client_id', clientId)
    .maybeSingle();

  if (!task) return [];

  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch files for task ${taskId}: ${error.message}`);
  return data;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getPortalInvoices(clientId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch portal invoices: ${error.message}`);
  return data;
}

// ─── Files ────────────────────────────────────────────────────────────────────

export type PortalFileWithContext = ProjectFile & {
  taskTitle: string;
  taskId: string;
  projectId: string;
  projectName: string;
};

/**
 * Fetch all files for a client using nested joins:
 * files → tasks (inner) → projects (inner, filtered by client_id).
 * Reduces 3 sequential queries to 1.
 */
export async function getPortalFiles(clientId: string): Promise<PortalFileWithContext[]> {
  const { data, error } = await supabase
    .from('files')
    .select(
      '*, task:tasks!inner(id, title, project_id, project:projects!inner(id, name))'
    )
    .eq('task.project.client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch portal files: ${error.message}`);

  return (data ?? []).map((f: any) => ({
    id: f.id,
    task_id: f.task_id,
    filename: f.filename,
    file_url: f.file_url,
    created_at: f.created_at,
    taskId: f.task?.id ?? f.task_id ?? '',
    taskTitle: f.task?.title ?? 'Unknown Task',
    projectId: f.task?.project?.id ?? '',
    projectName: f.task?.project?.name ?? 'Unknown Project',
  }));
}
