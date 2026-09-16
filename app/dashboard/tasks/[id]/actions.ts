'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCallerOrgId } from '@/lib/db/team-members';
import type { CommentWithAuthor } from '@/lib/db/tasks';
import type { ProjectFile } from '@/lib/types';

/**
 * Verifies the task belongs to the caller's org before allowing mutations.
 */
async function verifyTaskOwnership(taskId: string): Promise<void> {
  const orgId = await getCallerOrgId();
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select('org_id')
    .eq('id', taskId)
    .single();
  if (error || !task) throw new Error('Task not found.');
  if (task.org_id !== orgId) throw new Error('Access denied.');
}

/**
 * Creates a comment on a task, storing the team member's name in author_name.
 */
export async function createCommentAction(
  taskId: string,
  content: string
): Promise<CommentWithAuthor> {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Not authenticated');

  // Verify task belongs to caller's org
  await verifyTaskOwnership(taskId);

  const orgId = await getCallerOrgId();
  let authorName: string | null = null;
  let teamMemberId: string | null = null;
  const { data: member } = await supabase
    .from('team_members')
    .select('id, name')
    .eq('email', user.email)
    .eq('org_id', orgId)
    .maybeSingle();
  teamMemberId = member?.id ?? null;
  authorName   = member?.name ?? null;

  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, content, user_id: teamMemberId, author_name: authorName })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create comment: ${error.message}`);
  return data as CommentWithAuthor;
}

/**
 * Uploads a file attachment to a task via FormData (File objects can't be
 * passed directly to Server Actions — they must be wrapped in FormData).
 */
export async function uploadFileAction(formData: FormData): Promise<ProjectFile> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const taskId = formData.get('taskId') as string;
  const file = formData.get('file') as File;

  if (!taskId || !file) throw new Error('Task ID and file are required.');

  // Verify task belongs to caller's org
  await verifyTaskOwnership(taskId);

  // Sanitize filename: strip path traversal and special characters
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
  const path = `tasks/${taskId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('project-files')
    .upload(path, file, { upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('project-files')
    .getPublicUrl(path);

  const { data, error } = await supabaseAdmin
    .from('files')
    .insert({ task_id: taskId, filename: file.name, file_url: publicUrl })
    .select()
    .single();

  if (error) throw new Error(`Failed to save file record: ${error.message}`);
  return data as ProjectFile;
}
