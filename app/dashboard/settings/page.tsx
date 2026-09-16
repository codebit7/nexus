import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Settings' };
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRequestSession } from "@/lib/db/session";
import SettingsClient from './SettingsClient';

export default async function DashboardSettingsPage() {
  const { user, member } = await getRequestSession();
  if (!user?.email) redirect('/login');

  let orgName = '';
  if (member?.org_id) {
    const { data: org } = await supabaseAdmin
      .from('organisations')
      .select('name')
      .eq('id', member.org_id)
      .maybeSingle();
    orgName = (org as { name: string } | null)?.name ?? '';
  }


  return (
    <SettingsClient
      initialName={member?.name ?? ''}
      initialAvatarUrl={member?.avatar_url ?? ''}
      userRole={member?.user_role ?? 'member'}
      email={user.email}
      isOwner={member?.is_owner ?? false}
      orgName={orgName}
      isAdmin={member?.user_role === 'admin'}
    />
  );
}
