"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  CalendarDays,
  DollarSign,
  Pencil,
  Check,
  X,
  Receipt,
  ArrowLeft,
  Users,
  Hash,
  RefreshCw,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Layers,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInvoiceById } from "@/lib/db/invoices";
import { updateInvoiceAction, searchInvoicesForSidebarAction } from "@/app/dashboard/invoices/actions";
import { revalidateDashboard } from "@/app/dashboard/actions";
import type { InvoiceListItem } from "@/lib/db/invoices";
import type { ClientListItem } from "@/lib/db/clients";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useWorkspaceSlug } from "@/app/dashboard/workspace-context";
import type { Invoice, InvoiceStatus } from "@/lib/types";

// Status configuration matching project detail style
const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; badge: string; icon: any }> = {
  paid: {
    label: "Paid",
    dot: "bg-[var(--status-done)]",
    text: "text-[var(--status-done)]",
    badge: "text-[var(--status-done)] bg-[var(--tint-green)] border-[var(--tint-green-border)]",
    icon: CheckCircle
  },
  pending: {
    label: "Pending",
    dot: "bg-[var(--priority-high)]",
    text: "text-[var(--priority-high)]",
    badge: "text-[var(--priority-high)] bg-[var(--tint-orange)] border-[var(--tint-orange-border)]",
    icon: AlertCircle
  },
  overdue: {
    label: "Overdue",
    dot: "bg-[var(--priority-urgent)]",
    text: "text-[var(--priority-urgent)]",
    badge: "text-[var(--priority-urgent)] bg-[var(--tint-red)] border-[var(--tint-red-border)]",
    icon: AlertCircle
  },
};

function getStatusConfig(status: string | null) {
  return STATUS_CONFIG[status ?? ""] ?? {
    label: status ?? "Unknown",
    dot: "bg-[var(--text-muted)]",
    text: "text-[var(--text-muted)]",
    badge: "text-[var(--text-muted)] bg-[var(--border-subtle)] border-[var(--border-subtle)]",
    icon: Receipt,
  };
}

const EDIT_STATUS_OPTIONS: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "text-[var(--priority-high)]" },
  { value: "paid", label: "Paid", color: "text-[var(--status-done)]" },
  { value: "overdue", label: "Overdue", color: "text-[var(--priority-urgent)]" },
];

// Edit Form Component
interface EditFormProps {
  invoice: Invoice;
  clients: ClientListItem[];
  onSave: (updated: Invoice) => void;
  onCancel: () => void;
}

function EditForm({ invoice, clients, onSave, onCancel }: EditFormProps) {
  const [clientId, setClientId] = useState(invoice.client_id ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number ?? "");
  const [amount, setAmount] = useState(invoice.amount != null ? String(invoice.amount) : "");
  const [dueDate, setDueDate] = useState(invoice.due_date ?? "");
  const [status, setStatus] = useState((invoice.status ?? "pending") as InvoiceStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldClass =
    "w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-border)] focus:ring-1 focus:ring-[var(--accent-ring)] transition-colors duration-150";

  const selectTriggerClass =
    "w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] h-[42px] text-[13px] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-border)] data-[placeholder]:text-[var(--text-faint)]";
  const selectContentClass = "bg-[var(--bg-sidebar)] border-[var(--border-default)] text-[var(--text-primary)]";
  const selectItemClass = "text-[13px] text-[var(--text-muted)] focus:bg-[var(--tint-accent)] focus:text-[var(--accent)] cursor-pointer";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError("Please select a client."); return; }
    if (!invoiceNumber.trim()) { setError("Invoice number is required."); return; }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) { setError("Enter a valid positive amount."); return; }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateInvoiceAction(invoice.id, {
        client_id: clientId,
        invoice_number: invoiceNumber.trim(),
        amount: parseFloat(amount),
        due_date: dueDate || null,
        status,
      });
      onSave(updated);
      await revalidateDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">
          <span className="flex items-center gap-1.5">
            <Users className="h-3 w-3" /> Client <span className="text-[var(--priority-urgent)]">*</span>
          </span>
        </label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id} className={selectItemClass}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[var(--tint-accent)] flex items-center justify-center">
                    <Users className="h-3 w-3 text-[var(--accent)]" />
                  </div>
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">
            <span className="flex items-center gap-1.5">
              <Hash className="h-3 w-3" /> Invoice # <span className="text-[var(--priority-urgent)]">*</span>
            </span>
          </label>
          <input 
            value={invoiceNumber} 
            onChange={(e) => setInvoiceNumber(e.target.value)} 
            className={`${fieldClass} font-mono`} 
            required
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {EDIT_STATUS_OPTIONS.map((o) => {
                const cfg = STATUS_CONFIG[o.value];
                return (
                  <SelectItem key={o.value} value={o.value} className={selectItemClass}>
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg?.dot ?? "bg-[var(--text-muted)]"}`} />
                      <span className={cfg?.text ?? "text-[var(--text-muted)]"}>{o.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" /> Amount <span className="text-[var(--priority-urgent)]">*</span>
            </span>
          </label>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            placeholder="0.00" 
            min="0" 
            step="0.01" 
            className={fieldClass} 
            required
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" /> Due Date
            </span>
          </label>
          <input 
            type="date" 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)} 
            className={fieldClass} 
          />
        </div>
      </div>
      
      {error && (
        <div className="rounded-lg bg-[var(--tint-red)] px-3 py-2 text-[12px] text-[var(--priority-urgent)] border border-[var(--tint-red-border)]">
          {error}
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-2">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)] transition-colors duration-150 flex items-center gap-1.5"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
        <button 
          type="submit" 
          disabled={saving} 
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white active:scale-[0.98] transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// Props & Component
interface InvoiceDetailClientProps {
  invoiceId: string;
  initialSidebarInvoices: InvoiceListItem[];
  clients: ClientListItem[];
  initialInvoice: Invoice;
  isAdmin: boolean;
}

function findClientInList(clientId: string | null, clients: ClientListItem[]) {
  if (!clientId) return null;
  return clients.find((c) => c.id === clientId) ?? null;
}

export default function InvoiceDetailClient({
  invoiceId,
  initialSidebarInvoices,
  clients,
  initialInvoice,
  isAdmin,
}: InvoiceDetailClientProps) {
  const router = useRouter();
  const slug = useWorkspaceSlug();
  const [selectedId, setSelectedId] = useState(invoiceId);
  const [search, setSearch] = useState("");

  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice);
  const [client, setClient] = useState<ClientListItem | null>(() => findClientInList(initialInvoice.client_id, clients));
  const [sidebarInvoices, setSidebarInvoices] = useState<InvoiceListItem[]>(initialSidebarInvoices);
  const [sidebarSearching, setSidebarSearching] = useState(false);
  const [sidebarPage, setSidebarPage] = useState(0);
  const [sidebarHasMore, setSidebarHasMore] = useState(initialSidebarInvoices.length === 5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfCacheBust, setPdfCacheBust] = useState(() => Date.now());

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of clients) m[c.id] = c.name;
    return m;
  }, [clients]);

  // Fetch sidebar page (search + pagination)
  async function fetchSidebar(page: number, query?: string) {
    setSidebarSearching(true);
    try {
      const results = await searchInvoicesForSidebarAction(query ?? search, page);
      setSidebarInvoices(results);
      setSidebarPage(page);
      setSidebarHasMore(results.length === 5);
    } finally {
      setSidebarSearching(false);
    }
  }

  // Debounced search — resets to page 0
  useEffect(() => {
    if (!search.trim()) {
      setSidebarInvoices(initialSidebarInvoices);
      setSidebarPage(0);
      setSidebarHasMore(initialSidebarInvoices.length === 5);
      return;
    }
    const timer = setTimeout(() => fetchSidebar(0, search), 300);
    return () => clearTimeout(timer);
  }, [search, initialSidebarInvoices]);

  const filteredInvoices = sidebarInvoices;

  const [loadedId, setLoadedId] = useState(invoiceId);

  useEffect(() => {
    if (selectedId === loadedId) return;
    async function load() {
      setLoading(true);
      setError(null);
      setEditing(false);
      setShowPdf(false);
      try {
        const inv = await getInvoiceById(selectedId);
        setInvoice(inv);
        setClient(findClientInList(inv.client_id, clients));
        setLoadedId(selectedId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedId, loadedId, clients]);

  function selectInvoice(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    window.history.replaceState(null, "", `/${slug}/invoices/${id}`);
  }

  async function markAsPaid() {
    if (!invoice) return;
    setMarkingPaid(true);
    try {
      const updated = await updateInvoiceAction(invoice.id, { status: "paid" });
      setInvoice(updated);
      setGeneratingPdf(true);
      const res = await fetch("/api/generate-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: updated.id }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "PDF generation failed" }));
        setError(errBody.error ?? "PDF generation failed");
      } else {
        const json = (await res.json()) as { invoice?: Invoice; error?: string };
        if (json.invoice) {
          setInvoice(json.invoice);
          setPdfCacheBust(Date.now());
        }
      }
      await revalidateDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    } finally {
      setMarkingPaid(false);
      setGeneratingPdf(false);
    }
  }

  async function generatePdf() {
    if (!invoice) return;
    setGeneratingPdf(true);
    try {
      const res = await fetch("/api/generate-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const json = (await res.json()) as { pdf_url?: string; invoice?: Invoice; error?: string };
      if (json.invoice) {
        setInvoice(json.invoice);
        setPdfCacheBust(Date.now());
      } else if (json.error) {
        setError(json.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF generation failed.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  const status = invoice ? ((invoice.status ?? "pending") as InvoiceStatus) : "pending";
  const cfg = invoice ? getStatusConfig(invoice.status) : getStatusConfig(null);
  const StatusIcon = cfg.icon;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">
      
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          {/* Native anchor — sidebar's replaceState() breaks Next.js client nav.
              See TaskDetailClient back button for details. */}
          <a
            href={`/${slug}/invoices`}
            className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)] transition-colors duration-150"
            title="Back to Invoices"
          >
            <ArrowLeft size={16} />
          </a>
          <div className="w-px h-5 bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-[var(--accent)]" />
            <h1 className="text-[15px] font-medium text-[var(--text-primary)]">Invoice Details</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          
          {/* Invoice sidebar and content - 2 column layout */}
          <div className="flex gap-6 items-start">
            
            {/* Left sidebar - Invoice list */}
            <aside className="hidden lg:block w-[320px] shrink-0">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden sticky top-6">
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={14} className="text-[var(--accent)]" />
                    <h2 className="text-[13px] font-medium text-[var(--text-primary)]">All Invoices</h2>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-faint)]" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search invoices..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-border)] transition-colors duration-150"
                    />
                  </div>
                </div>

                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  {sidebarSearching ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[12px] text-[var(--text-faint)]">Searching...</p>
                    </div>
                  ) : filteredInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <Receipt className="h-8 w-8 text-[var(--text-disabled)]" />
                      <p className="text-[12px] text-[var(--text-faint)]">No invoices found</p>
                    </div>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const invCfg = getStatusConfig(inv.status);
                      const isActive = inv.id === selectedId;
                      return (
                        <button
                          key={inv.id}
                          onClick={() => selectInvoice(inv.id)}
                          className={[
                            "w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-150",
                            isActive
                              ? "bg-[var(--tint-accent)] border-l-2 border-l-[#5e6ad2]"
                              : "hover:bg-[var(--hover-default)]",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={[
                              "font-mono text-[13px] font-medium truncate",
                              isActive ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                            ].join(" ")}>
                              {inv.invoice_number ?? "—"}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${invCfg.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${invCfg.dot}`} />
                              {invCfg.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-[var(--text-faint)] truncate">
                              {inv.client_id ? clientMap[inv.client_id] ?? "No client" : "No client"}
                            </span>
                            <span className="text-[var(--text-muted)] font-medium tabular-nums">
                              {inv.amount != null ? formatCurrency(inv.amount) : "—"}
                            </span>
                          </div>
                          {inv.due_date && (
                            <p className="mt-1 text-[11px] text-[var(--text-faint)]">Due {formatDate(inv.due_date)}</p>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Sidebar pagination */}
                {(sidebarPage > 0 || sidebarHasMore) && (
                  <div className="flex items-center justify-between px-4 py-2
                    border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
                    <button
                      onClick={() => fetchSidebar(sidebarPage - 1)}
                      disabled={sidebarPage === 0 || sidebarSearching}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]
                        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-[var(--text-muted)]
                        transition-colors duration-150"
                    >
                      ← Previous
                    </button>
                    <span className="text-[10px] text-[var(--text-faint)]">{sidebarPage + 1}</span>
                    <button
                      onClick={() => fetchSidebar(sidebarPage + 1)}
                      disabled={!sidebarHasMore || sidebarSearching}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]
                        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-[var(--text-muted)]
                        transition-colors duration-150"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* Right panel - Invoice detail */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="space-y-6 animate-pulse">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="h-8 w-64 bg-[var(--hover-default)] rounded mb-3" />
                      <div className="h-4 w-32 bg-[var(--hover-default)] rounded" />
                    </div>
                    <div className="grid grid-cols-4 gap-4 p-6 border-t border-[var(--border-subtle)]">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="space-y-2">
                          <div className="h-3 w-16 bg-[var(--hover-default)] rounded" />
                          <div className="h-5 w-20 bg-[var(--hover-default)] rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6">
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="h-14 w-14 rounded-full bg-[var(--hover-default)]" />
                      <div className="h-4 w-40 bg-[var(--hover-default)] rounded" />
                      <div className="h-3 w-56 bg-[var(--hover-default)] rounded" />
                    </div>
                  </div>
                </div>
              ) : error || !invoice ? (
                <div className="rounded-xl bg-[var(--tint-red)] border border-[var(--tint-red-border)] p-6">
                  <p className="text-[13px] text-[var(--priority-urgent)]">{error ?? "Invoice not found."}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Invoice header card */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon size={16} className={cfg.text} />
                            <h1 className="text-xl font-medium text-[var(--text-primary)] truncate">
                              {invoice.invoice_number ?? "—"}
                            </h1>
                          </div>
                          {client && (
                            <Link 
                              href={`/${slug}/clients/${client.id}`}
                              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"
                            >
                              <Users size={12} />
                              {client.name}
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${cfg.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          {isAdmin && !editing && (
                            <button 
                              onClick={() => setEditing(true)} 
                              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)] border border-[var(--border-default)] transition-colors duration-150 flex items-center gap-1.5"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                          )}
                        </div>
                      </div>

                      {editing ? (
                        <EditForm 
                          invoice={invoice} 
                          clients={clients} 
                          onSave={(updated) => { 
                            setInvoice(updated); 
                            setClient(findClientInList(updated.client_id, clients)); 
                            setEditing(false); 
                          }} 
                          onCancel={() => setEditing(false)} 
                        />
                      ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-[var(--border-subtle)]">
                          <div>
                            <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">Client</p>
                            <div className="flex items-center gap-1.5">
                              <Users size={14} className="text-[var(--text-faint)]" />
                              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                {client?.name ?? "—"}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">Amount</p>
                            <div className="flex items-center gap-1.5">
                              <DollarSign size={14} className="text-[var(--text-faint)]" />
                              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                {invoice.amount != null ? formatCurrency(invoice.amount) : "—"}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">Due Date</p>
                            <div className="flex items-center gap-1.5">
                              <CalendarDays size={14} className="text-[var(--text-faint)]" />
                              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                {invoice.due_date ? formatDate(invoice.due_date) : "No due date"}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">Invoice #</p>
                            <div className="flex items-center gap-1.5">
                              <Hash size={14} className="text-[var(--text-faint)]" />
                              <span className="text-[13px] font-medium text-[var(--text-primary)] font-mono">
                                {invoice.invoice_number ?? "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {!editing && (
                        <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-[var(--border-subtle)]">
                          <div className="flex gap-2">
                            {invoice.status !== "paid" && isAdmin && (
                              <button
                                onClick={markAsPaid}
                                disabled={markingPaid}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--status-done)] hover:bg-[var(--status-done)]/90 text-white transition-colors duration-150 disabled:opacity-50"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                {markingPaid ? "Updating..." : "Mark as Paid"}
                              </button>
                            )}
                            {invoice.pdf_url ? (
                              <a href={invoice.pdf_url} download className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)] border border-[var(--border-default)] transition-colors duration-150">
                                <Download className="h-3.5 w-3.5" /> Download PDF
                              </a>
                            ) : (
                              <button 
                                onClick={generatePdf} 
                                disabled={generatingPdf} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)] border border-[var(--border-default)] transition-colors duration-150 disabled:opacity-50"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${generatingPdf ? "animate-spin" : ""}`} />
                                {generatingPdf ? "Generating..." : "Generate PDF"}
                              </button>
                            )}
                          </div>
                          {invoice.pdf_url && (
                            <button 
                              onClick={() => setShowPdf(!showPdf)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors duration-150"
                            >
                              <FileText className="h-3.5 w-3.5" /> {showPdf ? "Hide PDF" : "View PDF"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PDF section */}
                  {invoice.pdf_url && showPdf && (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                      <iframe src={`${invoice.pdf_url}?t=${pdfCacheBust}#toolbar=0`} className="h-[360px] sm:h-[500px] w-full" title={`Invoice ${invoice.invoice_number}`} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}