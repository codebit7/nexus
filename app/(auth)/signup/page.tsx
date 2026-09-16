import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTeamMemberByEmail, getOrgSlugById } from '@/lib/db/team-members';
import SignupClient from './SignupClient';

export const metadata: Metadata = { title: 'Sign Up' };

export default async function SignupPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    let redirectPath = '/dashboard';
    if (user.email) {
      const member = await getTeamMemberByEmail(user.email);
      if (member?.org_id) {
        const slug = await getOrgSlugById(member.org_id);
        if (slug) redirectPath = `/${slug}`;
      }
    }
    redirect(redirectPath);
  }

  return <SignupClient />;
}