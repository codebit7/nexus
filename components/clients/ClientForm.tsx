"use client";

import { useState } from "react";
import { Loader2, Building2, Mail, Shield, Briefcase, DollarSign, CalendarDays, KeyRound } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClientAction, updateClientAction } from "@/app/dashboard/clients/actions";
import type { Client, ClientStatus } from "@/lib/types";

interface ClientFormProps {
  client?:   Client;
  onSuccess: (client: Client) => void;
  onCancel:  () => void;
}

const STATUS_OPTIONS: { value: ClientStatus; label: string; color: string; dot: string }[] = [
  { value: "active",   label: "Active",   color: "#26c97f", dot: "bg-[var(--status-done)]" },
  { value: "inactive", label: "Inactive", color: "#888",    dot: "bg-[var(--text-muted)]" },
  { value: "paused",   label: "Paused",   color: "#e79d13", dot: "bg-[var(--priority-high)]" },
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

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const isEdit = !!client;
  const [form, setForm] = useState({
    name:            client?.name ?? "",
    email:           client?.email ?? "",
    status:          (client?.status as ClientStatus) ?? "active",
    project_type:    client?.project_type ?? "",
    monthly_rate:    client?.monthly_rate?.toString() ?? "",
    start_date:      client?.start_date ?? "",
    portal_password: "",
  });
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name:            form.name.trim(),
        email:           form.email.trim() || null,
        status:          form.status || "active",
        project_type:    form.project_type.trim() || null,
        monthly_rate:    form.monthly_rate ? parseFloat(form.monthly_rate) : null,
        start_date:      form.start_date || null,
        portal_password: form.portal_password.trim() || null,
      };
      const result = isEdit
        ? await updateClientAction(client.id, payload)
        : await createClientAction(payload);
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-[var(--tint-red)] border border-[var(--tint-red-border)] px-4 py-3 text-[13px] text-[var(--priority-urgent)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
        <div>
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-[var(--accent)]" />
              Name <span className="text-[var(--priority-urgent)] normal-case tracking-normal font-normal">*</span>
            </span>
          </label>
          <input 
            value={form.name} 
            onChange={field("name")} 
            placeholder="Acme Corp" 
            className={FIELD} 
            autoFocus
          />
        </div>

        <div>
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-[var(--accent)]" /> 
              Email
            </span>
          </label>
          <input 
            type="email" 
            value={form.email} 
            onChange={field("email")} 
            placeholder="hello@acme.com" 
            className={FIELD} 
          />
        </div>

        <div>
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-[var(--accent)]" /> 
              Status
            </span>
          </label>
          <Select value={form.status} onValueChange={(v) => setForm((prev) => ({ ...prev, status: v as ClientStatus }))}>
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
              <Briefcase className="h-3 w-3 text-[var(--accent)]" /> 
              Project Type
            </span>
          </label>
          <input 
            value={form.project_type} 
            onChange={field("project_type")} 
            placeholder="Retainer, One-time..." 
            className={FIELD} 
          />
        </div>

        <div>
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-[var(--accent)]" /> 
              Monthly Rate ($)
            </span>
          </label>
          <input 
            type="number" 
            min="0" 
            step="0.01" 
            value={form.monthly_rate} 
            onChange={field("monthly_rate")} 
            placeholder="0.00" 
            className={FIELD} 
          />
        </div>

        <div>
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 text-[var(--accent)]" /> 
              Start Date
            </span>
          </label>
          <input 
            type="date" 
            value={form.start_date} 
            onChange={field("start_date")} 
            className={FIELD} 
          />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL}>
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3 w-3 text-[var(--accent)]" />
              Portal Password
              {isEdit && (
                <span className="ml-2 text-[10px] font-normal text-[var(--text-faint)] normal-case tracking-normal">
                  — leave blank to keep current
                </span>
              )}
            </span>
          </label>
          <input
            type="password" 
            value={form.portal_password} 
            onChange={field("portal_password")}
            placeholder={isEdit ? "Enter new password to change" : "Client portal access password"}
            autoComplete="new-password" 
            className={FIELD}
          />
        </div>
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
            active:scale-[0.98] transition-[color,background-color,border-color,transform] duration-150
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Client"}
        </button>
      </div>
    </form>
  );
}

export default ClientForm;