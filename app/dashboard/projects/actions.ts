'use server';

import { revalidatePath } from 'next/cache';
import { createProject, getProjectsPaginated, getProjectsByMemberPaginated, getProjectsForSidebar, type ProjectListItem } from '@/lib/db/projects';
import { getCallerOrgId, getTeamMemberByEmail } from '@/lib/db/team-members';
import { getTaskCountsByProjectFiltered } from '@/lib/db/tasks';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Project, ProjectInsert } from '@/lib/types';

export async function createProjectAction(
  payload: Omit<ProjectInsert, 'org_id'>
): Promise<Project> {
  const org_id = await getCallerOrgId();

  // Verify the referenced client_id (if provided) belongs to the caller's org.
  if (payload.client_id) {
    const { data: clientRow, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', payload.client_id)
      .eq('org_id', org_id)
      .maybeSingle();
    if (clientErr || !clientRow) {
      throw new Error('Invalid client');
    }
  }

  const project = await createProject({ ...payload, org_id });
  revalidatePath('/dashboard', 'layout');
  return project;
}

export async function fetchProjectsPageAction(page: number, pageSize: number) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const member = user?.email ? await getTeamMemberByEmail(user.email) : null;
  const isAdmin = member?.user_role === 'admin';
  const memberId = member?.id ?? '';

  if (!member?.org_id) return { projects: [], total: 0, taskCounts: {} as Record<string, { total: number; done: number }> };

  // Pass org_id directly to avoid a second auth round-trip inside the query
  const result = isAdmin
    ? await getProjectsPaginated(page, pageSize, undefined, member.org_id)
    : await getProjectsByMemberPaginated(memberId, page, pageSize);

  // Only fetch task counts for the projects on this page — not all projects
  const projectIds = result.data.map((p) => p.id);
  const taskCounts = await getTaskCountsByProjectFiltered(projectIds);

  return { projects: result.data, total: result.total, taskCounts };
}

/** Server action for sidebar search in project detail page. */
export async function searchProjectsForSidebarAction(search: string, page: number = 0): Promise<ProjectListItem[]> {
  return getProjectsForSidebar(5, search || undefined, page);
}