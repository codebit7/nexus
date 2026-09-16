import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_COOKIE = 'portal_csrf_token';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function setCsrfCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days — same as portal_client_id
    path: '/',
    sameSite: 'lax',
  });
}

export function getCsrfToken(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(CSRF_COOKIE)?.value;
}

export function deleteCsrfCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(CSRF_COOKIE);
}

/**
 * Verify that the CSRF token from a form submission matches the cookie.
 * Call this at the top of every portal server action that mutates data.
 */
export function verifyCsrfToken(formData: FormData): boolean {
  const tokenFromForm = formData.get('csrf_token') as string | null;
  const tokenFromCookie = getCsrfToken();

  if (!tokenFromForm || !tokenFromCookie) return false;
  // Constant-time comparison to prevent timing attacks
  if (tokenFromForm.length !== tokenFromCookie.length) return false;

  let mismatch = 0;
  for (let i = 0; i < tokenFromForm.length; i++) {
    mismatch |= tokenFromForm.charCodeAt(i) ^ tokenFromCookie.charCodeAt(i);
  }
  return mismatch === 0;
}