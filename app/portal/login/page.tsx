import { redirect } from 'next/navigation';

// The portal login has been consolidated into the shared login page at /login.
// Redirect anyone who lands here directly.
export default function PortalLoginRedirect() {
  redirect('/login');
}
