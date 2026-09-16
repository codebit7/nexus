'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';
import { checkRateLimit, formatResetTime } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export interface PortalLoginState {
  error: string | null;
}

export async function portalSignInAction(
  prevState: PortalLoginState,
  formData: FormData
): Promise<PortalLoginState> {
  // Rate limit by IP
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success, resetMs } = checkRateLimit('portal-login:' + ip);
  if (!success) {
    return { error: `Too many login attempts. Please try again in ${formatResetTime(resetMs)}.` };
  }

  const email = formData.get('email') as string;
  const portalPassword = formData.get('portal_password') as string;

  if (!email || !portalPassword) {
    return { error: 'Email and portal password are required.' };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, portal_password')
    .eq('email', email)
    .maybeSingle();

  if (error || !data?.portal_password) {
    return { error: 'Invalid credentials. Contact your project manager if you need access.' };
  }

  const match = await bcrypt.compare(portalPassword, data.portal_password);
  if (!match) {
    return { error: 'Invalid credentials. Contact your project manager if you need access.' };
  }

  const cookieStore = cookies();
  cookieStore.set('portal_client_id', data.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    sameSite: 'lax',
  });
  // Set CSRF token for portal session
  const csrfToken = generateCsrfToken();
  setCsrfCookie(csrfToken);

  redirect('/portal/tasks');
}
