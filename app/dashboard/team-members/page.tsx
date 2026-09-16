import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Team Members' };
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getIsAdminByEmail, getIsOwnerById, getTeamMembersWithProjectsPaginated, getTeamMemberByEmail } from '@/lib/db/team-members';
import { getProjects } from '@/lib/db/projects';
import { getRequestSession } from "@/lib/db/session";
import TeamMembersClient from './TeamMembersClient';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 5;

export default async function TeamMembersPage() {
  const { user } = await getRequestSession();

  if (!user?.email) redirect('/login');

  const isAdmin = await getIsAdminByEmail(user.email);
  if (!isAdmin) redirect('/dashboard');

  const member = await getTeamMemberByEmail(user.email);
  const orgId = member?.org_id;

  const [membersResult, projects, isOwner] = await Promise.all([
    orgId ? getTeamMembersWithProjectsPaginated(0, PAGE_SIZE, orgId) : { data: [], total: 0 },
    getProjects(),
    getIsOwnerById(user.id),
  ]);

  return (
    <TeamMembersClient
      initialMembers={membersResult.data}
      totalMembers={membersResult.total}
      projects={projects}
      currentUserId={user.id}
      isOwner={isOwner}
    />
  );
}
