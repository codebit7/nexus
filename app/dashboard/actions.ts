'use server';

import { revalidatePath } from 'next/cache';
import { getProjectsForList, getProjectsForListByMember } from '@/lib/db/projects';
import { getClientsForList, getClientsForListByMember } from '@/lib/db/clients';
import { getInvoicesForList, getInvoicesForListByMember } from '@/lib/db/invoices';
import { getTasksWithAssignees, getTasksWithAssigneesByMember } from '@/lib/db/tasks';
import { getTeamMembers, getTeamMemberByEmail, getCallerOrgId } from '@/lib/db/team-members';
import { getProjects } from '@/lib/db/projects';
import { getTaskStatuses } from '@/lib/db/task-statuses';
import { getTags } from '@/lib/db/tags';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Revalidate all dashboard pages (including detail pages like /dashboard/invoices/[id])
 * after any data mutation so sidebars and lists reflect fresh data immediately.
 */
export async function revalidateDashboard() {
  // Using 'layout' revalidates the page AND all child routes sharing that layout
  revalidatePath('/dashboard', 'layout');
}

export interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'client' | 'invoice' | 'member';
  title: string;
  subtitle?: string;
  status?: string;
}

/**
 * Fetch all searchable entities for the current user's org.
 * Returns lightweight items for client-side filtering.
 *
 * Role and member id are derived server-side from the authenticated session —
 * never from client-supplied input.
 */
export async function fetchSearchData(): Promise<SearchResult[]> {
  // Derive caller identity server-side — never trust client input.
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];
  const member = await getTeamMemberByEmail(user.email);
  if (!member?.org_id) return [];
  const isAdmin = member.user_role === 'admin';
  const memberId = member.id;

  const [projects, clients, invoices, tasks, members] = await Promise.all([
    isAdmin ? getProjectsForList() : memberId ? getProjectsForListByMember(memberId) : [],
    isAdmin ? getClientsForList() : memberId ? getClientsForListByMember(memberId) : [],
    isAdmin ? getInvoicesForList() : memberId ? getInvoicesForListByMember(memberId) : [],
    isAdmin ? getTasksWithAssignees() : memberId ? getTasksWithAssigneesByMember(memberId) : [],
    isAdmin ? getTeamMembers() : [],
  ]);

  const results: SearchResult[] = [];

  for (const p of projects) {
    results.push({ id: p.id, type: 'project', title: p.name, status: p.status ?? undefined });
  }
  for (const c of clients) {
    results.push({ id: c.id, type: 'client', title: c.name, subtitle: c.email ?? undefined, status: c.status ?? undefined });
  }
  for (const inv of invoices) {
    results.push({ id: inv.id, type: 'invoice', title: inv.invoice_number ?? 'Untitled Invoice', subtitle: inv.amount != null ? `$${inv.amount.toLocaleString()}` : undefined, status: inv.status ?? undefined });
  }
  for (const t of tasks) {
    results.push({ id: t.id, type: 'task', title: t.title, subtitle: t.assignee?.name ?? undefined, status: t.status ?? undefined });
  }
  for (const m of members) {
    results.push({ id: m.id, type: 'member', title: m.name, subtitle: m.role ?? m.email });
  }

  return results;
}

/**
 * Everything the New Task form needs, fetched when the form first opens.
 *
 * This used to run in the dashboard layout on EVERY navigation, which delayed
 * every page's skeleton by seconds — a layout must finish rendering before any
 * child loading.tsx can show. Moving it here trades a moment on the first form
 * open for every page in the app painting immediately.
 *
 * The provider caches the result, so it is fetched once per page session.
 */
export async function fetchTaskFormDataAction(): Promise<{
  projects: Awaited<ReturnType<typeof getProjects>>;
  teamMembers: Awaited<ReturnType<typeof getTeamMembers>>;
  taskStatuses: Awaited<ReturnType<typeof getTaskStatuses>>;
  tags: Awaited<ReturnType<typeof getTags>>;
}> {
  const orgId = await getCallerOrgId();

  // Independent queries — one round trip of wall-clock, not four.
  const [projects, teamMembers, taskStatuses, tags] = await Promise.all([
    getProjects().catch(() => []),
    getTeamMembers().catch(() => []),
    getTaskStatuses(orgId).catch(() => []),
    getTags(orgId).catch(() => []),
  ]);

  return { projects, teamMembers, taskStatuses, tags };
}
