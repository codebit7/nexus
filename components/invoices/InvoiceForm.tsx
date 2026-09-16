"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, Hash, DollarSign, CalendarDays, FileText, Receipt } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInvoiceAction } from "@/app/dashboard/invoices/actions";
import { getClients } from "@/lib/db/clients";
import type { Invoice, InvoiceStatus } from "@/lib/types";

interface ClientOption {
  id:   string;
  name: string;
}

interface InvoiceFormProps {
  onSuccess: (invoice: Invoice) => void;
  onCancel:  () => void;
  /** Preloaded clients — skips the in-dialog fetch delay. Shape only needs `id` + `name`. */
  initialClients?: ClientOption[];
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string; color: string; dot: string }[] = [
  { value: "pending", label: "Pending", color: "var(--priority-high)",   dot: "bg-[var(--priority-high)]" },
  { value: "paid",    label: "Paid",    color: "var(--status-done)",     dot: "bg-[var(--status-done)]" },
  { value: "overdue", label: "Overdue", color: "var(--priority-urgent)", dot: "bg-[var(--priority-urgent)]" },
];

const LABEL = "block text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5";
const FIELD = `w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)]
  text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)]
  focus:outline-none focus:border-[var(--accent-border)]
  focus:ring-1 focus:ring-[var(--accent-ring)]
  transition-colors duration-150`;
const SELECT_TRIGGER = `w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)]
  h-[42px] text-[13px] text-[var(--text-primary)]
  focus:ring-1 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-border)]
  data-[placeholder]:text-[var(--text-faint)]`;
const SELECT_CONTENT = "bg-[var(--bg-sidebar)] border-[var(--border-default)] text-[var(--text-primary)]";
const SELECT_ITEM = "text-[13px] text-[var(--text-muted)] focus:bg-[var(--tint-accent)] focus:text-[var(--accent)] cursor-pointer";

function generateInvoiceNumber(): string {
  const now = new Date();
  const ym  = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${ym}-${seq}`;
}

export function InvoiceForm({ onSuccess, onCancel, initialClients = [] }: InvoiceFormProps) {
  const [clients, setClients]               = useState<ClientOption[]>(initialClients);
  const [loadingClients, setLoadingClients] = useState(initialClients.length === 0);
  const [form, setForm] = useState({
    client_id:      "",
    invoice_number: generateInvoiceNumber(),
    amount:         "",
    due_date:       "",
    status:         "pending" as InvoiceStatus,
  });
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep]     = useState<"idle" | "saving" | "generating">("idle");

  useEffect(() => {
    // Silent background refresh so newly-added clients appear.
    // If preloaded clients were provided, dropdown is already populated — never blocks UI.
    getClients()
      .then((c) => { setClients(c); })
      .catch(() => {
        if (initialClients.length === 0) setError("Failed to load clients.");
      })
      .finally(() => setLoadingClients(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id)                       { setError("Please select a client."); return; }
    if (!form.invoice_number.trim())           { setError("Invoice number is required."); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setError("Enter a valid amount."); return; }

    setError(null);
    setLoading(true);
    setStep("saving");

    try {
      const invoice = await createInvoiceAction({
        client_id:      form.client_id,
        invoice_number: form.invoice_number.trim(),
        amount:         parseFloat(form.amount),
        due_date:       form.due_date || null,
        status:         form.status,
      });

      setStep("generating");
      try {
        const res  = await fetch("/api/generate-invoice-pdf", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ invoiceId: invoice.id }),
        });
        const json = await res.json() as { pdf_url?: string; invoice?: Invoice; error?: string };
        // No revalidateDashboard() here: createInvoiceAction already revalidated
        // server-side. Calling it again re-rendered the whole dashboard layout a
        // second time — a full Washington→Sydney round trip the user waited on
        // for nothing.
        if (json.invoice) { onSuccess(json.invoice); return; }
      } catch {
        // PDF generation failed — still succeed with created invoice
      }

      onSuccess(invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setStep("idle");
    }
  }

  const buttonLabel =
    step === "saving"     ? "Saving invoice..."  :
    step === "generating" ? "Generating PDF..."  :
    "Create Invoice";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-[var(--tint-red)] border border-[var(--tint-red-border)] px-4 py-3 text-[13px] text-[var(--priority-urgent)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
        <div className="sm:col-span-2">
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-[var(--accent)]" />
              Client <span className="text-[var(--priority-urgent)] normal-case tracking-normal font-normal">*</span>
            </span>
          </label>
          <Select 
            value={form.client_id} 
            onValueChange={(v) => setForm((prev) => ({ ...prev, client_id: v }))} 
            disabled={loadingClients}
          >
            <SelectTrigger className={SELECT_TRIGGER}>
              <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select client"} />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id} className={SELECT_ITEM}>
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

        <div>
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <Hash className="h-3 w-3 text-[var(--accent)]" />
              Invoice # <span className="text-[var(--priority-urgent)] normal-case tracking-normal font-normal">*</span>
            </span>
          </label>
          <input 
            value={form.invoice_number} 
            onChange={field("invoice_number")} 
            placeholder="INV-202503-0001" 
            className={`${FIELD} font-mono`} 
          />
        </div>

        <div>
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <Receipt className="h-3 w-3 text-[var(--accent)]" />
              Status
            </span>
          </label>
          <Select 
            value={form.status} 
            onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as InvoiceStatus }))}
          >
            <SelectTrigger className={SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT}>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className={SELECT_ITEM}>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />
                    <span style={{ color: o.color }}>{o.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-[var(--accent)]" />
              Amount <span className="text-[var(--priority-urgent)] normal-case tracking-normal font-normal">*</span>
            </span>
          </label>
          <input 
            type="number" 
            min="0" 
            step="0.01" 
            value={form.amount} 
            onChange={field("amount")} 
            placeholder="0.00" 
            className={FIELD} 
          />
        </div>

        <div>
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 text-[var(--accent)]" /> 
              Due Date
            </span>
          </label>
          <input 
            type="date" 
            value={form.due_date} 
            onChange={field("due_date")} 
            className={FIELD} 
          />
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-center gap-3 rounded-lg bg-[var(--tint-accent)] border border-[var(--accent-border)] px-4 py-3">
        <FileText className="h-4 w-4 shrink-0 text-[var(--accent)]" />
        <p className="text-[12px] text-[var(--text-muted)]">
          A PDF will be automatically generated and stored after saving.
        </p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2 rounded-lg text-[13px] font-medium text-[var(--text-muted)]
            hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]
            transition-colors duration-150 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium
            bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
            active:scale-[0.98] transition-colors duration-150
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {buttonLabel}
        </button>
      </div>
    </form>
  );
}

export default InvoiceForm;