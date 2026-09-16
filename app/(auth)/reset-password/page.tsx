import { redirect } from 'next/navigation';

/**
 * Backward-compatibility redirect.
 * Old password reset emails point to /reset-password (this route group path).
 * New flow lives at /auth/reset-password.
 */
export default function LegacyResetPasswordRedirect() {
  redirect('/auth/reset-password');
}