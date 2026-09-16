'use server';

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCallerOrgId, getIsAdminByEmail, getTeamMemberByEmail } from '@/lib/db/team-members';
import { assertEmailIsFree } from '@/lib/db/email-availability';
import { isValidEmail, INVALID_EMAIL_MESSAGE } from '@/lib/validation';
import { getClientsPaginated, getClientsByMemberPaginated, getClientsForSidebar, type ClientListItem } from '@/lib/db/clients';
import { getProjectsForList, getProjectsForListByMember, type ProjectListItem } from '@/lib/db/projects';
import type { Client, ClientInsert, ClientUpdate } from '@/lib/types';

const BCRYPT_ROUNDS = 10;

/** Validate required client fields */
function validateClientPayload(payload: { name?: string | null; email?: string | null }) {
  if (!payload.name || payload.name.trim().length === 0) {
    throw new Error('Client name is required.');
  }
  if (!payload.email || payload.email.trim().length === 0) {
    throw new Error('Client email is required.');
  }
  if (!isValidEmail(payload.email.trim())) {
    throw new Error(INVALID_EMAIL_MESSAGE);
  }
}

/**
 * Create a client with bcrypt-hashed portal_password.
 */
export async function createClientAction(payload: ClientInsert): Promise<Client> {
  validateClientPayload(payload);

  const supabase = createSupabaseServerClient();
  const org_id = await getCallerOrgId();

  // Free product-wide, not just among clients: the same address must not already
  // be a team member of any workspace or hold a login account.
  await assertEmailIsFree(payload.email!);

  const data: ClientInsert = { ...payload, email: payload.email!.trim().toLowerCase(), org_id };
  if (data.portal_password) {
    data.portal_password = await bcrypt.hash(data.portal_password, BCRYPT_ROUNDS);
  }

  const { data: result, error } = await supabase
    .from('clients')
    .insert(data)
    .select()
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('clients_email_key')) {
      throw new Error('A client already exists with this email.');
    }
    throw new Error(`Failed to create client: ${error.message}`);
  }
  revalidatePath('/dashboard', 'layout');
  return result;
}

/**
 * Update a client. If portal_password is provided (non-empty), hash it.
 * If portal_password is null/undefined/empty, omit it so the existing hash is preserved.
 */
export async function updateClientAction(
  id: string,
  updates: ClientUpdate
): Promise<Client> {
  // Validate email if it's being updated
  if (updates.email !== undefined) {
    if (!updates.email || !isValidEmail(updates.email.trim())) {
      throw new Error(INVALID_EMAIL_MESSAGE);
    }
  }
  if (updates.name !== undefined && (!updates.name || updates.name.trim().length === 0)) {
    throw new Error('Client name is required.');
  }

  const supabase = createSupabaseServerClient();
  const org_id = await getCallerOrgId();

  // Editing the address has to clear the same bar as creating one, or the
  // product-wide rule is bypassed by saving the form twice. Skips this client's
  // own row so an unchanged email does not clash with itself.
  if (updates.email !== undefined) {
    await assertEmailIsFree(updates.email!, { ignoreClientId: id });
  }

  const data: ClientUpdate = {
    ...updates,
    ...(updates.email ? { email: updates.email.trim().toLowerCase() } : {}),
  };

  if (data.portal_password) {
    data.portal_password = await bcrypt.hash(data.portal_password, BCRYPT_ROUNDS);
  } else {
    // Don't overwrite existing password with null/empty
    delete data.portal_password;
  }

  const { data: result, error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id)
    .eq('org_id', org_id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('clients_email_key')) {
      throw new Error('A client already exists with this email.');
    }
    throw new Error(`Failed to update client: ${error.message}`);
  }
  revalidatePath('/dashboard', 'layout');
  return result;
}

/**
 * Generate a random portal password, hash + store it, and return the plain-text
 * password so the admin can copy it and share it with the client.
 * Returns { client, plainPassword }.
 */
export async function resetPortalPasswordAction(
  clientId: string
): Promise<{ client: Client; plainPassword: string }> {
  const supabase = createSupabaseServerClient();

  // Only admins can reset client passwords
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Not authenticated');
  const isAdmin = await getIsAdminByEmail(user.email);
  if (!isAdmin) throw new Error('Only admins can reset client passwords.');

  // 8-char alphanumeric — easy to share verbally
  const plainPassword = randomBytes(4).toString('hex').toUpperCase();

  const hashed = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

  const org_id = await getCallerOrgId();
  const { data: result, error } = await supabase
    .from('clients')
    .update({ portal_password: hashed })
    .eq('id', clientId)
    .eq('org_id', org_id)
    .select()
    .single();

  if (error) throw new Error(`Failed to reset portal password: ${error.message}`);
  revalidatePath('/dashboard', 'layout');
  return { client: result, plainPassword };
}

/**
 * Permanently delete a client. Admins only.
 *
 * Blocked while the client still has projects or invoices. projects.client_id
 * and invoices.client_id are both FK ... NO ACTION, so the delete would fail at
 * the database with a raw constraint error anyway — this turns that into a
 * message that says what to clear first. Silently cascading real invoices away
 * is not a decision this button should make on the admin's behalf.
 */
export async function deleteClientAction(id: string): Promise<void> {
  if (!id) throw new Error('Client ID is required.');

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Not authenticated');
  const isAdmin = await getIsAdminByEmail(user.email);
  if (!isAdmin) throw new Error('Only admins can delete clients.');

  const org_id = await getCallerOrgId();

  // Confirm the client is ours before counting or deleting anything.
  const { data: target, error: targetErr } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('id', id)
    .eq('org_id', org_id)
    .maybeSingle();
  if (targetErr) throw new Error(`Failed to look up the client: ${targetErr.message}`);
  if (!target) throw new Error('Client not found in your workspace.');

  const [projectRes, invoiceRes] = await Promise.all([
    supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', id)
      .eq('org_id', org_id),
    supabaseAdmin
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', id)
      .eq('org_id', org_id),
  ]);

  if (projectRes.error) throw new Error(`Failed to check their projects: ${projectRes.error.message}`);
  if (invoiceRes.error) throw new Error(`Failed to check their invoices: ${invoiceRes.error.message}`);

  const projectCount = projectRes.count ?? 0;
  const invoiceCount = invoiceRes.count ?? 0;

  if (projectCount > 0 || invoiceCount > 0) {
    const parts: string[] = [];
    if (projectCount > 0) parts.push(`${projectCount} project${projectCount === 1 ? '' : 's'}`);
    if (invoiceCount > 0) parts.push(`${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}`);
    throw new Error(
      `This client still has ${parts.join(' and ')}. Delete or reassign them first, then remove the client.`
    );
  }

  const { error: deleteErr } = await supabaseAdmin
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('org_id', org_id);

  if (deleteErr) throw new Error(`Failed to delete client: ${deleteErr.message}`);
  revalidatePath('/dashboard', 'layout');
}

export async function fetchClientsPageAction(page: number, pageSize: number) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const member = user?.email ? await getTeamMemberByEmail(user.email) : null;
  const isAdmin = member?.user_role === 'admin';
  const memberId = member?.id ?? '';

  if (!member?.org_id) return { clients: [] as Client[], total: 0, projects: [] as ProjectListItem[] };

  const [result, projects] = await Promise.all([
    isAdmin
      ? getClientsPaginated(page, pageSize, member.org_id)
      : getClientsByMemberPaginated(memberId, page, pageSize),
    isAdmin
      ? getProjectsForList()
      : getProjectsForListByMember(memberId),
  ]);

  return { clients: result.data, total: result.total, projects };
}

/** Server action for sidebar search in client detail page. */
export async function searchClientsForSidebarAction(search: string, page: number = 0): Promise<ClientListItem[]> {
  return getClientsForSidebar(5, search || undefined, page);
}
