'use server';

import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, formatResetTime } from '@/lib/rate-limit';

export interface ForgotPasswordState {
  error: string | null;
  success: boolean;
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();

  if (!email) {
    return { error: 'Please enter your email address.', success: false };
  }

  // Rate limiting
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success, resetMs } = checkRateLimit('forgot-pw:' + ip);
  if (!success) {
    return { error: `Too many attempts. Please try again in ${formatResetTime(resetMs)}.`, success: false };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Use admin (service_role) client to send password reset email
  const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  });

  // Surface rate-limit errors from Supabase; suppress other errors to prevent email enumeration
  if (resetError) {
    const msg = resetError.message.toLowerCase();
    if (
      resetError.status === 429 ||
      msg.includes('rate') ||
      msg.includes('security purposes') ||
      msg.includes('request this once')
    ) {
      return { error: 'Email rate limit exceeded. Please wait a few minutes before trying again.', success: false };
    }
    // Suppress non-rate-limit errors (prevents email enumeration)
  }

  return { error: null, success: true };
}
