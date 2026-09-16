import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getClientByIdForPortal } from '@/lib/db/clients';
import { getCsrfToken } from '@/lib/csrf';
import PortalSettingsClient from './PortalSettingsClient';

export default async function PortalSettingsPage() {
  const cookieStore = cookies();
  const clientId = cookieStore.get('portal_client_id')?.value;
  if (!clientId) redirect('/portal/login');

  const client = await getClientByIdForPortal(clientId).catch(() => null);
  if (!client) redirect('/portal/login');

  const csrfToken = getCsrfToken() ?? '';

  return (
    <PortalSettingsClient
      initialName={client.name}
      email={client.email ?? ''}
      csrfToken={csrfToken}
    />
  );
}
