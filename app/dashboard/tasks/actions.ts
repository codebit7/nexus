"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createTask } from "@/lib/db/tasks";
import { getCallerOrgId } from "@/lib/db/team-members";
import { createTaskStatus, deleteTaskStatus, getTaskStatuses, type TaskStatusRow } from "@/lib/db/task-statuses";
import type { Task, TaskInsert, TaskStatus } from "@/lib/types";

export async function createTaskAction(
  payload: Omit<TaskInsert, "org_id">
): Promise<Task> {
  const org_id = await getCallerOrgId();

  // Validate foreign keys belong to the caller's org before inserting —
  // clients can send any UUID, RLS on supabaseAdmin is bypassed.
  if (payload.project_id) {
    const { data: project, error: projErr } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", payload.project_id)
      .eq("org_id", org_id)
      .maybeSingle();
    if (projErr) throw new Error(`Failed to verify project: ${projErr.message}`);
    if (!project) throw new Error("Invalid project");
  }

  if (payload.assignee_id) {
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("id", payload.assignee_id)
      .eq("org_id", org_id)
      .maybeSingle();
    if (memberErr) throw new Error(`Failed to verify assignee: ${memberErr.message}`);
    if (!member) throw new Error("Invalid assignee");
  }

  const task = await createTask({ ...payload, org_id });

  // Auto-add assignee to project_members so they can see this task
  if (payload.assignee_id && payload.project_id) {
    await (supabaseAdmin as any)
      .from("project_members")
      .upsert(
        { project_id: payload.project_id, member_id: payload.assignee_id, org_id },
        { onConflict: "project_id,member_id", ignoreDuplicates: true }
      );
  }

  revalidatePath("/dashboard", "layout");
  return task;
}

export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus
): Promise<{ error: string } | null> {
  try {
    const orgId = await getCallerOrgId();

    // Load the task so we know which project it belongs to.
    const { data: task, error: taskErr } = await supabaseAdmin
      .from("tasks")
      .select("id, project_id")
      .eq("id", taskId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (taskErr) {
      return { error: `Failed to load task: ${taskErr.message}` };
    }
    if (!task) {
      return { error: "Task not found" };
    }

    // Verify the target status is in-scope for the task's project: either
    // an org-wide status (project_id IS NULL) or scoped to the same project.
    const { data: targetStatus, error: statusErr } = await (supabaseAdmin as any)
      .from("task_statuses")
      .select("project_id")
      .eq("org_id", orgId)
      .eq("slug", status)
      .maybeSingle();

    if (statusErr) {
      return { error: `Failed to load status: ${statusErr.message}` };
    }
    if (!targetStatus) {
      return { error: "Status not found" };
    }
    if (
      targetStatus.project_id !== null &&
      targetStatus.project_id !== task.project_id
    ) {
      return { error: "Status is not valid for this task's project" };
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .update({ status })
      .eq("id", taskId)
      .eq("org_id", orgId)
      .select("id, status")
      .single();

    if (error) {
      return { error: `Failed to update task: ${error.message}` };
    }

    if (!data) {
      return { error: "Task not found" };
    }

    revalidatePath("/dashboard", "layout");
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}

/** Create a custom board column. Inserts before "Done".
 *
 *  - `projectId` unset or null → org-wide (visible on global /tasks page).
 *  - `projectId` set           → scoped to that project only.
 */
export async function createCustomStatusAction(
  label: string,
  color: string,
  projectId: string | null = null,
): Promise<{ status?: TaskStatusRow; error?: string }> {
  try {
    const orgId = await getCallerOrgId();
    // Generate slug from label: "In Testing" → "in_testing"
    const slug = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!slug) return { error: 'Invalid status name' };

    // Verify projectId (if provided) belongs to the caller's org. Clients can
    // send any UUID and supabaseAdmin bypasses RLS, so we must check here.
    if (projectId !== null) {
      const { data: project, error: projErr } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('org_id', orgId)
        .maybeSingle();
      if (projErr) return { error: `Failed to verify project: ${projErr.message}` };
      if (!project) return { error: 'Invalid project' };
    }

    // Slugs are unique per org so tasks.status remains unambiguous — check
    // against every row in the org, not just the current scope.
    const existing = await getTaskStatuses(orgId, "all");
    if (existing.some((s) => s.slug === slug)) {
      return { error: 'A status with this name already exists' };
    }

    const status = await createTaskStatus(orgId, slug, label.trim(), color, projectId);
    revalidatePath("/dashboard", "layout");
    return { status };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create status' };
  }
}

/** Delete a custom board column. Moves its tasks to "To Do". */
export async function deleteCustomStatusAction(
  statusId: string
): Promise<{ error?: string }> {
  try {
    const orgId = await getCallerOrgId();
    await deleteTaskStatus(statusId, orgId);
    revalidatePath("/dashboard", "layout");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete status' };
  }
}
