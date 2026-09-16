'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyCsrfToken } from '@/lib/csrf';
import bcrypt from 'bcryptjs';

export interface SettingsState {
  error: string | null;
  success: string | null;
}

export async function updateClientProfileAction(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!verifyCsrfToken(formData)) {
    return { error: 'Invalid or missing CSRF token. Please refresh and try again.', success: null };
  }

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Name is required.', success: null };

  const cookieStore = cookies();
  const clientId = cookieStore.get('portal_client_id')?.value;
  if (!clientId) return { error: 'Not authenticated.', success: null };

  const { error } = await supabaseAdmin
    .from('clients')
    .update({ name })
    .eq('id', clientId);

  if (error) return { error: error.message, success: null };
  revalidatePath('/portal', 'layout');
  return { error: null, success: 'Profile updated successfully.' };
}

export async function updateClientPasswordAction(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!verifyCsrfToken(formData)) {
    return { error: 'Invalid or missing CSRF token. Please refresh and try again.', success: null };
  }

  const currentPassword = formData.get('current_password') as string;
  const newPassword = formData.get('password') as string;
  const confirm = formData.get('confirm') as string;

  if (!currentPassword || !newPassword)
    return { error: 'All password fields are required.', success: null };
  if (newPassword.length < 8)
    return { error: 'New password must be at least 8 characters.', success: null };
  if (newPassword !== confirm)
    return { error: 'Passwords do not match.', success: null };

  const cookieStore = cookies();
  const clientId = cookieStore.get('portal_client_id')?.value;
  if (!clientId) return { error: 'Not authenticated.', success: null };

  const { data: client, error: fetchError } = await supabaseAdmin
    .from('clients')
    .select('portal_password')
    .eq('id', clientId)
    .single();

  if (fetchError || !client?.portal_password)
    return { error: 'Could not verify your current password.', success: null };

  const match = await bcrypt.compare(currentPassword, client.portal_password);
  if (!match) return { error: 'Current password is incorrect.', success: null };

  const BCRYPT_ROUNDS = 10;
  const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const { error: updateError } = await supabaseAdmin
    .from('clients')
    .update({ portal_password: hashed })
    .eq('id', clientId);

  if (updateError) return { error: updateError.message, success: null };
  return { error: null, success: 'Password changed successfully.' };
}
