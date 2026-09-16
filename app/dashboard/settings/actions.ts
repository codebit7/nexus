'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getTeamMemberByEmail, updateTeamMember, getIsAdminByEmail } from '@/lib/db/team-members';
import { checkRateLimit, formatResetTime } from '@/lib/rate-limit';

export interface SettingsState {
  error: string | null;
  success: string | null;
}

export async function updateProfileAction(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const name = (formData.get('name') as string)?.trim();
  const avatar_url = (formData.get('avatar_url') as string)?.trim() || null;

  if (!name) return { error: 'Name is required.', success: null };

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'Not authenticated.', success: null };

  const member = await getTeamMemberByEmail(user.email).catch(() => null);
  if (!member) return { error: 'Team member record not found.', success: null };

  await updateTeamMember(member.id, { name, avatar_url });

  // Revalidate the dashboard layout so the sidebar picks up the new name
  revalidatePath('/dashboard', 'layout');

  return { error: null, success: 'Profile updated successfully.' };
}

export async function updatePasswordAction(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  // Rate limiting
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success: rlOk, resetMs } = checkRateLimit('change-pw:' + ip);
  if (!rlOk) {
    return { error: `Too many attempts. Please try again in ${formatResetTime(resetMs)}.`, success: null };
  }

  const password = formData.get('password') as string;
  const confirm = formData.get('confirm') as string;

  if (!password || password.length < 8)
    return { error: 'Password must be at least 8 characters.', success: null };
  if (password !== confirm)
    return { error: 'Passwords do not match.', success: null };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message, success: null };

  return { error: null, success: 'Password changed successfully.' };
}


export interface DeleteWorkspaceState {
  error: string | null;
  success: string | null;
}

export async function deleteWorkspaceAction(
  _prevState: DeleteWorkspaceState,
  formData: FormData
): Promise<DeleteWorkspaceState> {
  const confirmName = (formData.get('confirm_name') as string)?.trim();

  if (!confirmName) {
    return { error: 'Please type the workspace name to confirm.', success: null };
  }

  // 1. Authenticate
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'Not authenticated.', success: null };

  // 2. Get member + verify owner
  const member = await getTeamMemberByEmail(user.email).catch(() => null);
  if (!member || !member.org_id) return { error: 'No workspace found.', success: null };
  if (!member.is_owner) return { error: 'Only the workspace owner can delete the workspace.', success: null };

  const orgId = member.org_id;

  // 3. Verify org exists and name matches
  const { data: org } = await supabaseAdmin
    .from('organisations')
    .select('id, name')
    .eq('id', orgId)
    .maybeSingle();

  if (!org) return { error: 'Workspace not found.', success: null };
  if ((org as { name: string }).name !== confirmName) {
    return { error: 'Workspace name does not match. Please type it exactly.', success: null };
  }

  // 4. Get all team member IDs for auth user cleanup
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('org_id', orgId);

  const memberIds = (members ?? []).map((m: { id: string }) => m.id);

  // 5. Get all task IDs in this org (for comments/files cleanup)
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id')
    .eq('org_id', orgId);

  const taskIds = (tasks ?? []).map((t: { id: string }) => t.id);

  // 6. Delete leaf records first: comments and files (FK → tasks, NO ACTION)
  if (taskIds.length > 0) {
    await supabaseAdmin.from('comments').delete().in('task_id', taskIds);
    await supabaseAdmin.from('files').delete().in('task_id', taskIds);
  }

  // 7. Nullify tasks.assignee_id to unblock team_members deletion
  await supabaseAdmin
    .from('tasks')
    .update({ assignee_id: null })
    .eq('org_id', orgId);

  // 8. Delete project_members (FK → projects CASCADE, but also assigned_by → team_members NO ACTION)
  const adminAny = supabaseAdmin as any;
  await adminAny.from('project_members').delete().eq('org_id', orgId);

  // 9. Delete tasks (FK → projects NO ACTION, but org_id CASCADE will handle after projects gone)
  await supabaseAdmin.from('tasks').delete().eq('org_id', orgId);

  // 10. Delete invoices (FK → clients NO ACTION)
  await supabaseAdmin.from('invoices').delete().eq('org_id', orgId);

  // 11. Delete projects (FK → clients NO ACTION)
  await supabaseAdmin.from('projects').delete().eq('org_id', orgId);

  // 12. Delete clients
  await supabaseAdmin.from('clients').delete().eq('org_id', orgId);

  // 13. Delete team_members
  await supabaseAdmin.from('team_members').delete().eq('org_id', orgId);

  // 14. Delete the organisation
  const { error: orgDeleteError } = await supabaseAdmin
    .from('organisations')
    .delete()
    .eq('id', orgId);

  if (orgDeleteError) {
    return { error: `Failed to delete workspace: ${orgDeleteError.message}`, success: null };
  }

  // 15. Delete all Supabase Auth users (so they can re-signup with same email)
  for (const memberId of memberIds) {
    await supabaseAdmin.auth.admin.deleteUser(memberId).catch(() => {
      // Non-fatal: auth user may already be gone
    });
  }

  return { error: null, success: 'Workspace deleted successfully.' };
}
