"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Layers,
  Plus,
  Search,
  Receipt,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useWorkspaceSlug } from "@/app/dashboard/workspace-context";
import { fetchInvoicesPageAction } from "@/app/dashboard/invoices/actions";
import { EmptyState } from "@/components/layout/EmptyState";
import { Pagination } from "@/components/layout/Pagination";
import type { ClientListItem } from "@/lib/db/clients";
import type { Invoice, InvoiceStatus } from "@/lib/types";

const PAGE_SIZE = 5;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: any }> = {
  paid: {
    label: "Paid",
    bg: 'rgba(38,201,127,0.12)',
    text: '#26c97f',
    dot: '#26c97f',
    icon: CheckCircle
  },
  pending: {
    label: "Pending",
    bg: 'rgba(231,157,19,0.12)',
    text: '#e79d13',
    dot: '#e79d13',
    icon: Clock
  },
  overdue: {
    label: "Overdue",
    bg: 'rgba(229,72,77,0.12)',
    text: '#e5484d',
    dot: '#e5484d',
    icon: AlertCircle
  },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium capitalize"
      style={{ background: config.bg, color: config.text }}>
      <Icon size={10} />
      {config.label}
    </span>
  );
}

interface InvoicesClientProps {
  initialInvoices: Invoice[];
  totalInvoices: number;
  clients: ClientListItem[];
  isAdmin: boolean;
}

export default function InvoicesClient({ initialInvoices, totalInvoices, clients: initialClients, isAdmin }: InvoicesClientProps) {
  const router = useRouter();
  const slug = useWorkspaceSlug();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [total, setTotal] = useState(totalInvoices);
  const [clients, setClients] = useState<ClientListItem[]>(initialClients);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<InvoiceStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setInvoices(initialInvoices);
    setTotal(totalInvoices);
    setClients(initialClients);
    setCurrentPage(0);
  }, [initialInvoices, totalInvoices, initialClients]);

  const fetchPage = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const result = await fetchInvoicesPageAction(page, PAGE_SIZE);
      setInvoices(result.invoices);
      setTotal(result.total);
      setClients(result.clients);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  }, []);

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of clients) m[c.id] = c.name;
    return m;
  }, [clients]);

  // Calculate stats from current page
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidAmount = invoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const pendingAmount = invoices
    .filter(inv => inv.status === "pending")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const overdueCount = invoices.filter(inv => inv.status === "overdue").length;
  const paidCount = invoices.filter(inv => inv.status === "paid").length;
  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  // Filter invoices (client-side on current page)
  const filteredInvoices = useMemo(() => {
    let filtered = filter === "all" ? invoices : invoices.filter((inv) => inv.status === filter);

    if (searchQuery) {
      filtered = filtered.filter(inv => {
        const invoiceNumber = inv.invoice_number?.toLowerCase() || "";
        const clientName = inv.client_id ? (clientMap[inv.client_id]?.toLowerCase() || "") : "";
        return invoiceNumber.includes(searchQuery.toLowerCase()) ||
               clientName.includes(searchQuery.toLowerCase());
      });
    }

    return filtered;
  }, [invoices, filter, searchQuery, clientMap]);

  // Show the invoice the insert just returned instead of re-fetching the page
  // and then refreshing the whole route on top of it. createInvoiceAction has
  // already revalidated server-side, so both of those were duplicates.
  async function handleInvoiceCreated(invoice: Invoice) {
    setCreateOpen(false);
    if (currentPage !== 0) {
      await fetchPage(0);
      return;
    }
    // Never trim back to PAGE_SIZE here — that silently dropped a row once the
    // page was full, so creating a second invoice made one disappear from the
    // table. Show every row, and only re-read the page when it has genuinely
    // overflowed.
    const overflowed = invoices.length + 1 > PAGE_SIZE;
    setInvoices((prev) => [invoice, ...prev]);
    setTotal((t) => t + 1);
    if (overflowed) await fetchPage(0);
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Layers size={16} className="text-[var(--text-faint)]" />
          <h1 className="text-[15px] font-medium text-[var(--text-primary)]">Invoices</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors duration-150"
          >
            <Plus size={14} />
            Create Invoice
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={14} className="text-[var(--accent)]" />
                <span className="text-[11px] text-[var(--text-faint)]">Total Invoices</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--text-primary)]">{total}</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">{formatCurrency(totalAmount)} total</p>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-[var(--status-done)]" />
                <span className="text-[11px] text-[var(--text-faint)]">Paid</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--status-done)]">{paidCount}</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">{formatCurrency(paidAmount)} collected</p>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-[var(--priority-high)]" />
                <span className="text-[11px] text-[var(--text-faint)]">Pending</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--priority-high)]">{invoices.filter(i => i.status === "pending").length}</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">{formatCurrency(pendingAmount)} outstanding</p>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-[var(--accent)]" />
                <span className="text-[11px] text-[var(--text-faint)]">Collection Rate</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--text-primary)]">{collectionRate}%</p>
              <div className="mt-2 h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${collectionRate}%`, background: '#5e6ad2', transition: 'width 300ms ease-out' }}
                />
              </div>
            </div>
          </div>

          {/* Warning for overdue invoices */}
          {overdueCount > 0 && (
            <div className="mb-6 rounded-lg bg-[var(--tint-red)] border border-[var(--tint-red-border)] p-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-[var(--priority-urgent)]" />
                <span className="text-[12px] text-[var(--priority-urgent)]">
                  {overdueCount} {overdueCount === 1 ? 'invoice is' : 'invoices are'} overdue. Please follow up with clients.
                </span>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                type="text"
                placeholder="Search by invoice number or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg
                  bg-[var(--bg-sidebar)] border border-[var(--border-default)]
                  text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]
                  focus:outline-none focus:border-[var(--accent-border)]
                  transition-colors duration-150"
              />
            </div>
            <div className="flex gap-2">
              {["all", "pending", "paid", "overdue"].map((filterValue) => (
                <button
                  key={filterValue}
                  onClick={() => setFilter(filterValue as InvoiceStatus | "all")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-150
                    ${filter === filterValue
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'}`}
                >
                  {filterValue === "all" ? "All" : filterValue.charAt(0).toUpperCase() + filterValue.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Table */}
          {filteredInvoices.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-[13px] text-[var(--text-muted)] mb-2">
                {searchQuery || filter !== "all" ? "No invoices found" : "No invoices yet"}
              </p>
              {isAdmin && !searchQuery && filter === "all" && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150"
                >
                  Create your first invoice →
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em]">
                        Invoice #
                      </th>
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] hidden sm:table-cell">
                        Client
                      </th>
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em]">
                        Amount
                      </th>
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em]">
                        Status
                      </th>
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] hidden md:table-cell">
                        Due Date
                      </th>
                      <th className="px-3 sm:px-5 py-3 w-8" />
                     </tr>
                  </thead>
                  <tbody className={loading ? 'opacity-50 pointer-events-none' : ''}>
                    {filteredInvoices.map((inv) => {
                      const status = (inv.status ?? "pending") as InvoiceStatus;
                      const isOverdue = status === "overdue";
                      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
                      const today = new Date();
                      const isDueSoon = dueDate && !isOverdue &&
                        (dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24) <= 7;

                      return (
                        <tr
                          key={inv.id}
                          onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}
                          className="group border-b border-[var(--border-subtle)] last:border-0
                            hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors duration-[120ms]"
                        >
                          <td className="px-3 sm:px-5 py-3.5">
                            <div>
                              <span className="text-[13px] font-medium text-[var(--text-primary)] font-mono">
                                {inv.invoice_number ?? "—"}
                              </span>
                              {inv.client_id && (
                                <span className="text-[11px] text-[var(--text-faint)] block truncate sm:hidden mt-0.5">
                                  {clientMap[inv.client_id] ?? "—"}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 sm:px-5 py-3.5 hidden sm:table-cell">
                            <span className="text-[13px] text-[var(--text-muted)]">
                              {inv.client_id ? (clientMap[inv.client_id] ?? "—") : "—"}
                            </span>
                          </td>

                          <td className="px-3 sm:px-5 py-3.5">
                            <span className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
                              {inv.amount != null ? formatCurrency(inv.amount) : "—"}
                            </span>
                          </td>

                          <td className="px-3 sm:px-5 py-3.5">
                            <StatusBadge status={status} />
                          </td>

                          <td className="px-3 sm:px-5 py-3.5 hidden md:table-cell">
                            {inv.due_date ? (
                              <div className="flex items-center gap-1.5">
                                <Calendar size={12} className={`flex-shrink-0 ${isOverdue ? 'text-[var(--priority-urgent)]' : isDueSoon ? 'text-[var(--priority-high)]' : 'text-[var(--text-faint)]'}`} />
                                <span className={`text-[12px] tabular-nums ${isOverdue ? 'text-[var(--priority-urgent)]' : isDueSoon ? 'text-[var(--priority-high)]' : 'text-[var(--text-faint)]'}`}>
                                  {formatDate(inv.due_date)}
                                  {isDueSoon && !isOverdue && " (Soon)"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-[var(--text-disabled)]">—</span>
                            )}
                          </td>

                          <td className="px-3 sm:px-5 py-3.5 text-right">
                            <ChevronRight size={14} className="text-[var(--text-disabled)] group-hover:text-[var(--text-faint)]
                              transition-colors duration-150 ml-auto" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                loading={loading}
                onPageChange={fetchPage}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="
          bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-xl
          shadow-[var(--shadow-modal)] p-0 gap-0 w-[calc(100vw-24px)] max-w-[560px]
          max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-4
            border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-[15px] font-medium text-[var(--text-primary)]">Create Invoice</h3>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">Generate a new invoice for a client</p>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <InvoiceForm
              onSuccess={handleInvoiceCreated}
              onCancel={() => setCreateOpen(false)}
              initialClients={clients}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
