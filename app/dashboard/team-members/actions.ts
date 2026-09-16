'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getTeamMemberByEmail,
  getIsAdminByEmail,
  getIsOwnerById,
  getCallerOrgId,
  insertTeamMember,
  updateTeamMemberFull,
  deleteTeamMember,
  replaceProjectAssignments,
  getTeamMembersWithProjectsPaginated,
} from '@/lib/db/team-members';
import { assertEmailIsFree } from '@/lib/db/email-availability';
import { isValidEmail, INVALID_EMAIL_MESSAGE } from '@/lib/validation';

// ── Guard helper ─────────────────────────────────────────────────────────────
async function requireAdmin(): Promise<{ id: string; email: string; name: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Not authenticated');
  const isAdmin = await getIsAdminByEmail(user.email);
  if (!isAdmin) throw new Error('Admin access required');
  const member = await getTeamMemberByEmail(user.email);
  return { id: user.id, email: user.email, name: member?.name ?? 'Your admin' };
}

// ── Invite member ────────────────────────────────────────────────────────────

/**
 * What the caller needs to draw the new/updated row itself.
 *
 * The table used to re-fetch the whole page and then refresh the route after
 * every add, edit and delete — three server round trips to show a row we had
 * already saved. Returning the values lets the client update in place instead.
 *
 * Only project IDs are sent, not names: the page already holds the full project
 * list, so resolving names client-side costs nothing and keeps this cheap.
 */
export interface SavedMemberPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  user_role: string;
  projectIds: string[];
}

export interface AddMemberState {
  error: string | null;
  success: string | null;
  member?: SavedMemberPayload | null;
}

export async function addTeamMemberAction(
  _prevState: AddMemberState,
  formData: FormData
): Promise<AddMemberState> {
  try {
    const admin = await requireAdmin();

    const name       = (formData.get('name')      as string)?.trim();
    const email      = (formData.get('email')     as string)?.trim().toLowerCase();
    const user_role  = (formData.get('user_role') as string)?.trim();
    const projectIds = formData.getAll('project_ids') as string[];

    if (!name || !email || !user_role) {
      return { error: 'Name and email are required.', success: null };
    }
    if (!isValidEmail(email)) {
      return { error: INVALID_EMAIL_MESSAGE, success: null };
    }

    // Step 1 — the address must be free product-wide, not just in this workspace.
    // Checks team_members and clients across every org plus auth.users, so an
    // address cannot be a member here and a client somewhere else.
    await assertEmailIsFree(email);

    // Step 2 — invite via Supabase (creates auth user + sends invite email via Supabase SMTP)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: `${siteUrl}/auth/confirm` }
    );

    if (inviteError) {
      if (inviteError.message.toLowerCase().includes('already')) {
        return { error: 'A user with this email already exists.', success: null };
      }
      return { error: inviteError.message, success: null };
    }

    const userId = inviteData.user.id;

    // Step 3 — insert into team_members with the admin's org_id
    const org_id = await getCallerOrgId();
    await insertTeamMember({ id: userId, name, email, role: user_role, user_role, org_id });

    // Step 4 — assign projects
    if (projectIds.length > 0) {
      await replaceProjectAssignments(userId, projectIds);
    }

    return {
      error: null,
      success: `Invitation sent to ${email}`,
      member: { id: userId, name, email, role: user_role, user_role, projectIds },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    return { error: msg, success: null };
  }
}

// ── Edit member ──────────────────────────────────────────────────────────────
export interface EditMemberState {
  error: string | null;
  success: string | null;
  member?: SavedMemberPayload | null;
}

export async function editTeamMemberAction(
  _prevState: EditMemberState,
  formData: FormData
): Promise<EditMemberState> {
  try {
    const admin = await requireAdmin();

    const id         = formData.get('id')        as string;
    const name       = (formData.get('name')      as string)?.trim();
    const user_role  = (formData.get('user_role') as string)?.trim();
    const projectIds = formData.getAll('project_ids') as string[];

    if (!id || !name || !user_role) {
      return { error: 'All fields are required.', success: null };
    }

    // Check if target member is the owner — only the owner can edit themselves
    const targetIsOwner = await getIsOwnerById(id);
    const callerIsOwner = await getIsOwnerById(admin.id);
    if (targetIsOwner && !callerIsOwner) {
      return { error: 'The workspace owner\'s details cannot be changed by other admins.', success: null };
    }
    if (targetIsOwner && user_role !== 'admin') {
      return { error: 'The owner\'s role cannot be changed.', success: null };
    }

    // Only the owner can change roles — read current role from DB, never trust form input
    const orgId = await getCallerOrgId();
    const { data: currentRow, error: currentErr } = await supabaseAdmin
      .from('team_members')
      .select('user_role')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();
    if (currentErr || !currentRow) {
      return { error: 'Team member not found.', success: null };
    }
    const currentRole = (currentRow as { user_role: string }).user_role;
    if (user_role !== currentRole && !callerIsOwner) {
      return { error: 'Only the workspace owner can change roles.', success: null };
    }

    const updated = await updateTeamMemberFull(id, { name, user_role });
    await replaceProjectAssignments(id, projectIds);

    return {
      error: null,
      success: 'Team member updated successfully.',
      member: {
        id,
        name,
        email: updated.email,
        role: updated.role ?? user_role,
        user_role,
        projectIds,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    return { error: msg, success: null };
  }
}

// ── Delete member ─────────────────────────────────────────────────────────────
export interface DeleteMemberState {
  error: string | null;
  success: string | null;
  deletedId?: string | null;
}

export async function deleteTeamMemberAction(
  _prevState: DeleteMemberState,
  formData: FormData
): Promise<DeleteMemberState> {
  try {
    const admin = await requireAdmin();

    const id = formData.get('id') as string;
    if (!id) return { error: 'Member ID is required.', success: null };

    // Guard: cannot delete yourself
    if (id === admin.id) {
      return { error: 'You cannot remove your own account.', success: null };
    }

    // Guard: cannot delete an owner
    const targetIsOwner = await getIsOwnerById(id);
    if (targetIsOwner) {
      return { error: 'The workspace owner cannot be removed.', success: null };
    }

    // Guard: confirm the target member belongs to the caller's org BEFORE any destructive call
    const orgId = await getCallerOrgId();
    const { data: targetRow, error: targetErr } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (targetErr) {
      return { error: 'Failed to verify team member.', success: null };
    }
    if (!targetRow) {
      return { error: 'Team member not found in your workspace.', success: null };
    }

    // Clear every reference BEFORE deleting the row, or the delete fails.
    //
    // Order matters and the database row goes last. Deleting the auth user first
    // (the previous order) meant any later failure left an auth account with no
    // team_members row — four such orphans built up in production, and each one
    // silently blocks re-inviting that address.
    //
    // tasks.assignee_id and project_members.assigned_by are both FK ... NO ACTION,
    // so a member who had ever assigned someone to a project could not be
    // deleted at all. meeting_notes.created_by and integration_keys.created_by
    // are ON DELETE SET NULL and need nothing here; project_members.member_id
    // cascades.
    const adminAny = supabaseAdmin as any;

    const { error: taskErr } = await supabaseAdmin
      .from('tasks')
      .update({ assignee_id: null })
      .eq('assignee_id', id)
      .eq('org_id', orgId);
    if (taskErr) {
      return { error: `Failed to unassign their tasks: ${taskErr.message}`, success: null };
    }

    const { error: assignedByErr } = await adminAny
      .from('project_members')
      .update({ assigned_by: null })
      .eq('assigned_by', id)
      .eq('org_id', orgId);
    if (assignedByErr) {
      return { error: `Failed to clear their project assignments: ${assignedByErr.message}`, success: null };
    }

    // Delete from team_members (cascade handles project_members.member_id)
    await deleteTeamMember(id);

    // Auth account last. If this fails the member is already gone from the
    // workspace, so report it rather than leaving a silent orphan behind.
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authDeleteError && !authDeleteError.message.toLowerCase().includes('user not found')) {
      return {
        error: `Removed from the workspace, but their login account could not be deleted: ${authDeleteError.message}`,
        success: null,
      };
    }

    return { error: null, success: 'Team member removed.', deletedId: id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    return { error: msg, success: null };
  }
}

export async function fetchTeamMembersPageAction(page: number, pageSize: number) {
  const { email } = await requireAdmin();
  const member = await getTeamMemberByEmail(email);
  if (!member?.org_id) return { members: [], total: 0 };

  const result = await getTeamMembersWithProjectsPaginated(page, pageSize, member.org_id);
  return { members: result.data, total: result.total };
}
