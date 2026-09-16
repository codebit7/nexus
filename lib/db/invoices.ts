'use server';
import { supabaseAdmin } from '../supabase-admin';
import { createSupabaseServerClient } from '../supabase-server';
import { getCallerOrgId } from './team-members';
import type { Invoice, InvoiceInsert, InvoiceUpdate } from '../types';

// Lightweight type for sidebar/list views — excludes pdf_url
export type InvoiceListItem = Pick<Invoice, 'id' | 'invoice_number' | 'client_id' | 'amount' | 'status' | 'due_date'>;

export async function getInvoices(clientId?: string): Promise<Invoice[]> {
  const orgId = await getCallerOrgId();
  let query = supabaseAdmin.from('invoices').select('*').eq('org_id', orgId).order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
  return data;
}

export interface PaginatedInvoices {
  data: Invoice[];
  total: number;
}

/** Fetch a page of invoices (0-indexed). Pass orgId to skip re-auth. */
export async function getInvoicesPaginated(page: number, pageSize: number, orgIdOverride?: string): Promise<PaginatedInvoices> {
  const orgId = orgIdOverride ?? await getCallerOrgId();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseAdmin
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
  return { data: data ?? [], total: count ?? 0 };
}

/** Fetch a page of invoices for a specific member. */
export async function getInvoicesByMemberPaginated(memberId: string, page: number, pageSize: number): Promise<PaginatedInvoices> {
  const clientIds = await getMemberClientIds(memberId);
  if (clientIds.length === 0) return { data: [], total: 0 };

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const supabase = createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch invoices for member: ${error.message}`);
  return { data: data ?? [], total: count ?? 0 };
}

/** Fetch only the columns needed for list/sidebar display (no pdf_url). */
export async function getInvoicesForList(clientId?: string): Promise<InvoiceListItem[]> {
  const orgId = await getCallerOrgId();
  let query = supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, client_id, amount, status, due_date')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
  return data;
}

/** Fetch a limited set of invoices for sidebar display, with optional search. */
export async function getInvoicesForSidebar(pageSize: number = 5, search?: string, page: number = 0): Promise<InvoiceListItem[]> {
  const orgId = await getCallerOrgId();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, client_id, amount, status, due_date')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search && search.trim()) {
    query = query.ilike('invoice_number', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch invoices for sidebar: ${error.message}`);
  return data;
}

export async function getInvoiceById(id: string): Promise<Invoice> {
  const orgId = await getCallerOrgId();
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  // maybeSingle, not single: a missing row is a normal outcome (deleted invoice,
  // stale link, another org's id) and single() turns that into a PostgREST 406
  // whose message says nothing useful.
  if (error) throw new Error(`Failed to fetch invoice ${id}: ${error.message}`);
  if (!data) throw new Error('Invoice not found.');
  return data;
}

export async function createInvoice(invoice: InvoiceInsert): Promise<Invoice> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .insert(invoice)
    .select()
    .single();

  if (error) throw new Error(`Failed to create invoice: ${error.message}`);
  return data;
}

export async function updateInvoice(id: string, updates: InvoiceUpdate, orgId?: string): Promise<Invoice> {
  const resolvedOrgId = orgId ?? await getCallerOrgId();
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .eq('org_id', resolvedOrgId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update invoice ${id}: ${error.message}`);
  return data;
}

// ── Member-scoped queries ──────────────────────────────────────────────────────

/** Resolves client IDs reachable by a member via their assigned projects. */
async function getMemberClientIds(memberId: string): Promise<string[]> {
  const supabase = createSupabaseServerClient();

  const { data: memberRows } = await (supabaseAdmin as any)
    .from('project_members')
    .select('project_id')
    .eq('member_id', memberId);

  const projectIds: string[] = (memberRows ?? []).map((r: { project_id: string }) => r.project_id);
  if (projectIds.length === 0) return [];

  const { data: projects } = await supabase
    .from('projects')
    .select('client_id')
    .in('id', projectIds)
    .not('client_id', 'is', null);

  const ids = (projects ?? []).map((p) => p.client_id).filter(Boolean) as string[];
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

/** Fetch all invoices for clients whose projects are assigned to this member. */
export async function getInvoicesByMember(memberId: string): Promise<Invoice[]> {
  const clientIds = await getMemberClientIds(memberId);
  if (clientIds.length === 0) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch invoices for member: ${error.message}`);
  return data;
}

/** Lightweight invoice list for a member (no pdf_url). */
export async function getInvoicesForListByMember(memberId: string): Promise<InvoiceListItem[]> {
  const clientIds = await getMemberClientIds(memberId);
  if (clientIds.length === 0) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_id, amount, status, due_date')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch invoice list for member: ${error.message}`);
  return data;
}
