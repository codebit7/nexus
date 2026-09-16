'use server';
import { supabaseAdmin } from '../supabase-admin';
import { createSupabaseServerClient } from '../supabase-server';
import { getCallerOrgId } from './team-members';
import type { Client, ClientInsert, ClientUpdate } from '../types';

// Lightweight type for sidebar/list views — excludes portal_password
export type ClientListItem = Pick<Client, 'id' | 'name' | 'email' | 'status' | 'monthly_rate' | 'project_type' | 'start_date'>;

export async function getClients(): Promise<Client[]> {
  const orgId = await getCallerOrgId();
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, status, monthly_rate, project_type, start_date, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
  return data as Client[];
}

export interface PaginatedClients {
  data: Client[];
  total: number;
}

/** Fetch a page of clients (0-indexed). Pass orgId to skip re-auth. */
export async function getClientsPaginated(page: number, pageSize: number, orgIdOverride?: string): Promise<PaginatedClients> {
  const orgId = orgIdOverride ?? await getCallerOrgId();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, status, monthly_rate, project_type, start_date, created_at', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
  return { data: (data ?? []) as Client[], total: count ?? 0 };
}

/** Fetch a page of clients for a specific member. */
export async function getClientsByMemberPaginated(memberId: string, page: number, pageSize: number): Promise<PaginatedClients> {
  const clientIds = await getMemberClientIds(memberId);
  if (clientIds.length === 0) return { data: [], total: 0 };

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const supabase = createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from('clients')
    .select('id, name, email, status, monthly_rate, project_type, start_date, created_at', { count: 'exact' })
    .in('id', clientIds)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch clients for member: ${error.message}`);
  return { data: (data ?? []) as Client[], total: count ?? 0 };
}

/** Fetch only the columns needed for list/sidebar display (no portal_password). */
export async function getClientsForList(): Promise<ClientListItem[]> {
  const orgId = await getCallerOrgId();
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, status, monthly_rate, project_type, start_date')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
  return data;
}

/** Fetch a limited set of clients for sidebar display, with optional search. */
export async function getClientsForSidebar(pageSize: number = 5, search?: string, page: number = 0): Promise<ClientListItem[]> {
  const orgId = await getCallerOrgId();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('clients')
    .select('id, name, email, status, monthly_rate, project_type, start_date')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search && search.trim()) {
    // Strip PostgREST filter specials so user input can't inject extra filter clauses.
    const safe = search.trim().replace(/[,()\\*]/g, '');
    if (safe) {
      query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch clients for sidebar: ${error.message}`);
  return data;
}

export async function getClientById(id: string): Promise<Client> {
  const orgId = await getCallerOrgId();
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, status, monthly_rate, project_type, start_date, created_at')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  // maybeSingle, not single: a missing row is a normal outcome (deleted client,
  // stale link, another org's id) and single() turns that into a PostgREST 406
  // whose message says nothing useful. Deleting clients is now possible from the
  // UI, so stale links are no longer hypothetical.
  if (error) throw new Error(`Failed to fetch client ${id}: ${error.message}`);
  if (!data) throw new Error('Client not found.');
  return data as Client;
}

/** Fetch a client by ID without org scoping — for portal contexts where there is no team session. */
export async function getClientByIdForPortal(id: string): Promise<Client> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, status, monthly_rate, project_type, start_date, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch client ${id}: ${error.message}`);
  if (!data) throw new Error('Client not found.');
  return data as Client;
}

export async function createClient(client: ClientInsert): Promise<Client> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert(client)
    .select()
    .single();

  if (error) throw new Error(`Failed to create client: ${error.message}`);
  return data;
}

export async function updateClient(id: string, updates: ClientUpdate): Promise<Client> {
  const orgId = await getCallerOrgId();
  const { data, error } = await supabaseAdmin
    .from('clients')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update client ${id}: ${error.message}`);
  return data;
}

// ── Member-scoped queries ──────────────────────────────────────────────────────

/** Resolves client IDs reachable by a member via their assigned projects. */
async function getMemberClientIds(memberId: string): Promise<string[]> {
  const supabase = createSupabaseServerClient();

  // Step 1: project IDs the member is assigned to
  const { data: memberRows } = await (supabaseAdmin as any)
    .from('project_members')
    .select('project_id')
    .eq('member_id', memberId);

  const projectIds: string[] = (memberRows ?? []).map((r: { project_id: string }) => r.project_id);
  if (projectIds.length === 0) return [];

  // Step 2: client IDs from those projects
  const { data: projects } = await supabase
    .from('projects')
    .select('client_id')
    .in('id', projectIds)
    .not('client_id', 'is', null);

  const ids = (projects ?? []).map((p) => p.client_id).filter(Boolean) as string[];
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

/** Fetch only clients whose projects are assigned to this member. */
export async function getClientsByMember(memberId: string): Promise<Client[]> {
  const clientIds = await getMemberClientIds(memberId);
  if (clientIds.length === 0) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, email, status, monthly_rate, project_type, start_date, created_at')
    .in('id', clientIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch clients for member: ${error.message}`);
  return data as Client[];
}

/** Lightweight client list for a member (no portal_password). */
export async function getClientsForListByMember(memberId: string): Promise<ClientListItem[]> {
  const clientIds = await getMemberClientIds(memberId);
  if (clientIds.length === 0) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, email, status, monthly_rate, project_type, start_date')
    .in('id', clientIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch client list for member: ${error.message}`);
  return data;
}
