'use server';
import { supabaseAdmin } from '../supabase-admin';
import { getCallerOrgId } from './team-members';

export interface TagRow {
  id: string;
  org_id: string;
  name: string;
  color: string;
  created_at: string;
}

/** Fetch every tag in the caller's org, sorted by name. */
export async function getTags(orgIdOverride?: string): Promise<TagRow[]> {
  const orgId = orgIdOverride ?? (await getCallerOrgId());
  const { data, error } = await (supabaseAdmin as any)
    .from('tags')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });
  if (error) throw new Error(`Failed to fetch tags: ${error.message}`);
  return data ?? [];
}

/** Tags attached to a single task (authoritative — joins through task_tags). */
export async function getTagsForTask(taskId: string): Promise<TagRow[]> {
  const orgId = await getCallerOrgId();
  const { data, error } = await (supabaseAdmin as any)
    .from('task_tags')
    .select('tags(*)')
    .eq('task_id', taskId)
    .eq('org_id', orgId);
  if (error) throw new Error(`Failed to fetch task tags: ${error.message}`);
  const rows = (data ?? []).map((r: { tags: TagRow | null }) => r.tags).filter(Boolean) as TagRow[];
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/** Bulk: map task_id → TagRow[]. Cheap enough for a kanban page. */
export async function getTagsForTasks(
  taskIds: string[],
): Promise<Record<string, TagRow[]>> {
  if (taskIds.length === 0) return {};
  const orgId = await getCallerOrgId();
  const { data, error } = await (supabaseAdmin as any)
    .from('task_tags')
    .select('task_id, tags(*)')
    .in('task_id', taskIds)
    .eq('org_id', orgId);
  if (error) throw new Error(`Failed to fetch tags for tasks: ${error.message}`);

  const map: Record<string, TagRow[]> = {};
  for (const row of (data ?? []) as { task_id: string; tags: TagRow | null }[]) {
    if (!row.tags) continue;
    if (!map[row.task_id]) map[row.task_id] = [];
    map[row.task_id].push(row.tags);
  }
  for (const list of Object.values(map)) list.sort((a, b) => a.name.localeCompare(b.name));
  return map;
}

/** Create a new tag. If one with the same name already exists in the org, returns it. */
export async function upsertTag(
  orgId: string,
  name: string,
  color: string,
): Promise<TagRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Tag name is required');

  // Idempotent: if the tag already exists, just return it instead of failing
  // the unique constraint. Prevents duplicate-tag errors when two people
  // create "backend" at the same time.
  const { data: existing, error: fetchErr } = await (supabaseAdmin as any)
    .from('tags')
    .select('*')
    .eq('org_id', orgId)
    .ilike('name', trimmed)
    .maybeSingle();
  if (fetchErr) throw new Error(`Failed to look up tag: ${fetchErr.message}`);
  if (existing) return existing;

  const { data, error } = await (supabaseAdmin as any)
    .from('tags')
    .insert({ org_id: orgId, name: trimmed, color })
    .select()
    .single();
  if (error) throw new Error(`Failed to create tag: ${error.message}`);
  return data;
}

/** Replace the full set of tags on a task. Idempotent. */
export async function setTaskTags(taskId: string, tagIds: string[]): Promise<void> {
  const orgId = await getCallerOrgId();

  // Verify the task belongs to the caller's org — supabaseAdmin bypasses RLS.
  const { data: task, error: taskErr } = await supabaseAdmin
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (taskErr) throw new Error(`Failed to verify task: ${taskErr.message}`);
  if (!task) throw new Error('Task not found');

  // Likewise: every tag id must be in the caller's org.
  const uniqueIds = Array.from(new Set(tagIds));
  if (uniqueIds.length > 0) {
    const { data: validTags, error: tagErr } = await (supabaseAdmin as any)
      .from('tags')
      .select('id')
      .eq('org_id', orgId)
      .in('id', uniqueIds);
    if (tagErr) throw new Error(`Failed to verify tags: ${tagErr.message}`);
    const validIds = new Set((validTags ?? []).map((t: { id: string }) => t.id));
    for (const id of uniqueIds) {
      if (!validIds.has(id)) throw new Error('Invalid tag');
    }
  }

  // Replace strategy: delete everything, re-insert. Small N; simpler than diff.
  const { error: delErr } = await (supabaseAdmin as any)
    .from('task_tags')
    .delete()
    .eq('task_id', taskId)
    .eq('org_id', orgId);
  if (delErr) throw new Error(`Failed to clear task tags: ${delErr.message}`);

  if (uniqueIds.length > 0) {
    const rows = uniqueIds.map((tag_id) => ({ task_id: taskId, tag_id, org_id: orgId }));
    const { error: insErr } = await (supabaseAdmin as any)
      .from('task_tags')
      .insert(rows);
    if (insErr) throw new Error(`Failed to attach tags: ${insErr.message}`);
  }
}
