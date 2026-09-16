"use client";

import { useState, useEffect, useCallback } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  User,
  Send,
  Layers,
  Search,
  Users,
  Mail,
  Briefcase
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { Project, TeamMemberWithProjects } from "@/lib/types";
import { Pagination } from "@/components/layout/Pagination";
import {
  addTeamMemberAction,
  editTeamMemberAction,
  deleteTeamMemberAction,
  fetchTeamMembersPageAction,
  type AddMemberState,
  type EditMemberState,
  type DeleteMemberState,
  type SavedMemberPayload,
} from "./actions";

const PAGE_SIZE = 5;

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  "bg-[var(--tint-accent-strong)] text-[var(--accent)]",
  "bg-[var(--tint-green)] text-[var(--status-done)]",
  "bg-[var(--tint-orange)] text-[var(--priority-high)]",
  "bg-[var(--tint-red)] text-[var(--priority-urgent)]",
  "bg-[var(--hover-strong)] text-[var(--text-muted)]",
];

function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "flex items-center gap-3 rounded-lg px-4 py-3 text-[13px] font-medium pointer-events-auto",
            "bg-[var(--bg-elevated)] border border-[var(--border-medium)] shadow-[var(--shadow-lg)]",
            "animate-in slide-in-from-right-4 duration-200",
          ].join(" ")}
        >
          {t.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0 text-[var(--status-done)]" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-[var(--priority-urgent)]" />
          )}
          <span className="text-[var(--text-primary)]">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors duration-150"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  function push(message: string, type: Toast["type"] = "success") {
    const id = ++counter + Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, push, dismiss };
}

// ── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton({ label, pendingLabel, className }: { label: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {pending ? pendingLabel : label}
    </button>
  );
}

// ── Input field class ─────────────────────────────────────────────────────────

const fieldCls =
  "w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-border)] focus:ring-1 focus:ring-[var(--accent-ring)] transition-colors duration-150";

const labelCls = "block text-[11px] font-medium text-[var(--text-muted)] mb-1.5";

// ── Project multi-select checklist ────────────────────────────────────────────

function ProjectChecklist({
  projects,
  selected,
  onChange,
}: {
  projects: Project[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (projects.length === 0) {
    return (
      <p className="text-[12px] text-[var(--text-disabled)] italic py-2">
        No projects available. Create projects first.
      </p>
    );
  }

  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-input)] max-h-32 overflow-y-auto">
      <div className="divide-y divide-[var(--border-subtle)]">
        {projects.map((p) => {
          const checked = selected.includes(p.id);
          return (
            <div
              key={p.id}
              onClick={() => toggle(p.id)}
              className={[
                "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors duration-[120ms]",
                checked ? "bg-[var(--tint-accent)] hover:bg-[var(--tint-accent)]" : "hover:bg-[var(--bg-elevated)]",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150",
                  checked
                    ? "border-[var(--accent)] bg-[var(--accent)]"
                    : "border-[var(--border-medium)] bg-[var(--bg-input)]",
                ].join(" ")}
              >
                {checked && <CheckCircle className="h-3 w-3 text-white" />}
              </div>
              <span className="text-[13px] text-[var(--text-muted)] flex-1">{p.name}</span>
              <input
                type="checkbox"
                name="project_ids"
                value={p.id}
                checked={checked}
                onChange={() => toggle(p.id)}
                className="sr-only"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Project pills ─────────────────────────────────────────────────────────────

function ProjectPills({ member }: { member: TeamMemberWithProjects }) {
  const allProjects = member.project_members
    .map((pm) => pm.projects)
    .filter((p): p is { id: string; name: string } => p !== null);

  if (allProjects.length === 0) {
    return <span className="text-xs text-[var(--text-disabled)]">—</span>;
  }

  const visible = allProjects.slice(0, 3);
  const extra   = allProjects.length - 3;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((p) => (
        <span
          key={p.id}
          className="inline-block rounded-md bg-[var(--border-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--text-muted)]"
        >
          {p.name}
        </span>
      ))}
      {extra > 0 && (
        <span
          className="inline-block rounded-md px-2 py-1 text-[11px] font-medium"
          style={{ background: 'rgba(94,106,210,0.12)', color: '#5e6ad2' }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ userRole, isOwner }: { userRole: string | null; isOwner?: boolean }) {
  const isAdmin = userRole === "admin";
  return (
    <div className="flex items-center gap-1.5">
      {isAdmin ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium"
          style={{ background: 'rgba(94,106,210,0.12)', color: '#5e6ad2' }}
        >
          <ShieldCheck className="h-3 w-3" />
          Admin
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium bg-[var(--border-subtle)] text-[var(--text-muted)]">
          <User className="h-3 w-3" />
          Member
        </span>
      )}
      {isOwner && (
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--tint-orange)] text-[var(--priority-high)] px-2 py-1 text-[10px] font-medium">
          Owner
        </span>
      )}
    </div>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────

const ADD_INITIAL: AddMemberState = { error: null, success: null };

function AddMemberModal({
  open,
  projects,
  onClose,
  onSuccess,
}: {
  open: boolean;
  projects: Project[];
  onClose: () => void;
  onSuccess: (state: AddMemberState) => void;
}) {
  const [state, formAction] = useFormState(addTeamMemberAction, ADD_INITIAL);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  useEffect(() => {
    if (state.success) {
      onSuccess(state);
    }
  }, [state.success]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) setSelectedProjects([]);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="
        bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-xl
        shadow-[var(--shadow-modal)] p-0 gap-0 w-[calc(100vw-24px)] max-w-[520px]
        max-h-[calc(100vh-32px)] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-4
          border-b border-[var(--border-subtle)] shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Invite Team Member</h3>
            <p className="text-[11px] text-[var(--text-faint)] mt-1">Send an invitation to join your workspace</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="add-name" className={labelCls}>Full Name <span className="text-[var(--priority-urgent)]">*</span></label>
              <input id="add-name" name="name" type="text" required placeholder="Jane Smith" className={fieldCls} />
            </div>

            <div>
              <label htmlFor="add-email" className={labelCls}>Email <span className="text-[var(--priority-urgent)]">*</span></label>
              <input id="add-email" name="email" type="email" required placeholder="jane@company.com" className={fieldCls} />
            </div>

            <input type="hidden" name="user_role" value="member" />

            <div>
              <label className={labelCls}>Assign Projects</label>
              <ProjectChecklist
                projects={projects}
                selected={selectedProjects}
                onChange={setSelectedProjects}
              />
            </div>

            {state.error && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--priority-urgent)]/10 border border-[var(--priority-urgent)]/20 px-3 py-2 text-[12px] text-[var(--priority-urgent)]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {state.error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-muted)]
                  hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)] transition-colors duration-150"
              >
                Cancel
              </button>
              <SubmitButton
                label="Send Invite"
                pendingLabel="Sending..."
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium
                  bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
                  active:scale-[0.98] transition-[color,background-color,border-color,transform] duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Member Modal ─────────────────────────────────────────────────────────

const EDIT_INITIAL: EditMemberState = { error: null, success: null };

function EditMemberModal({
  open,
  member,
  projects,
  isOwner,
  onClose,
  onSuccess,
}: {
  open: boolean;
  member: TeamMemberWithProjects | null;
  projects: Project[];
  isOwner: boolean;
  onClose: () => void;
  onSuccess: (state: EditMemberState) => void;
}) {
  const [state, formAction] = useFormState(editTeamMemberAction, EDIT_INITIAL);

  const currentProjectIds = member?.project_members
    .map((pm) => pm.projects?.id)
    .filter((id): id is string => !!id) ?? [];

  const [selectedProjects, setSelectedProjects] = useState<string[]>(currentProjectIds);
  const [role, setRole] = useState<string>(member?.user_role ?? "member");

  useEffect(() => {
    setSelectedProjects(currentProjectIds);
    setRole(member?.user_role ?? "member");
  }, [member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.success) onSuccess(state);
  }, [state.success]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="
        bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-xl
        shadow-[var(--shadow-modal)] p-0 gap-0 w-[calc(100vw-24px)] max-w-[520px]
        max-h-[calc(100vh-32px)] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-4
          border-b border-[var(--border-subtle)] shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Edit Member</h3>
            <p className="text-[11px] text-[var(--text-faint)] mt-1">Update member information and permissions</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={member.id} />

            <div>
              <label htmlFor="edit-name" className={labelCls}>Full Name <span className="text-[var(--priority-urgent)]">*</span></label>
              <input id="edit-name" name="name" type="text" required defaultValue={member.name} className={fieldCls} />
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={member.email}
                readOnly
                className="w-full rounded-lg bg-[var(--border-subtle)] border border-[var(--border-default)] px-3 py-2 text-[13px] text-[var(--text-faint)] cursor-not-allowed"
              />
              <p className="text-[10px] text-[var(--text-disabled)] mt-1">Email cannot be changed</p>
            </div>

            <input type="hidden" name="original_user_role" value={member.user_role ?? 'member'} />
            <div>
              <label htmlFor="edit-role" className={labelCls}>Role</label>
              {isOwner && !member.is_owner ? (
                <select
                  id="edit-role"
                  name="user_role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={fieldCls}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              ) : (
                <>
                  <input type="hidden" name="user_role" value={role} />
                  <input
                    type="text"
                    value={member.is_owner ? 'Owner (Admin)' : role === 'admin' ? 'Admin' : 'Member'}
                    readOnly
                    className="w-full rounded-lg bg-[var(--border-subtle)] border border-[var(--border-default)] px-3 py-2 text-[13px] text-[var(--text-faint)] cursor-not-allowed"
                  />
                  <p className="text-[10px] text-[var(--text-disabled)] mt-1">
                    {member.is_owner ? 'Owner role cannot be changed' : 'Only workspace owner can change roles'}
                  </p>
                </>
              )}
            </div>

            <div>
              <label className={labelCls}>Assign Projects</label>
              <ProjectChecklist
                projects={projects}
                selected={selectedProjects}
                onChange={setSelectedProjects}
              />
            </div>

            {state.error && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--priority-urgent)]/10 border border-[var(--priority-urgent)]/20 px-3 py-2 text-[12px] text-[var(--priority-urgent)]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {state.error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-muted)]
                  hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)] transition-colors duration-150"
              >
                Cancel
              </button>
              <SubmitButton
                label="Save Changes"
                pendingLabel="Saving..."
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium
                  bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
                  active:scale-[0.98] transition-[color,background-color,border-color,transform] duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

const DELETE_INITIAL: DeleteMemberState = { error: null, success: null };

function DeleteMemberModal({
  open,
  member,
  onClose,
  onSuccess,
}: {
  open: boolean;
  member: TeamMemberWithProjects | null;
  onClose: () => void;
  onSuccess: (state: DeleteMemberState) => void;
}) {
  const [state, formAction] = useFormState(deleteTeamMemberAction, DELETE_INITIAL);

  useEffect(() => {
    if (state.success) onSuccess(state);
  }, [state.success]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="
        bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-xl
        shadow-[var(--shadow-modal)] p-0 gap-0 w-[calc(100vw-24px)] max-w-[480px]
        max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-4
          border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Remove Member</h3>
            <p className="text-[11px] text-[var(--text-faint)] mt-1">This action cannot be undone</p>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={member.id} />

            <p className="text-[13px] text-[var(--text-muted)]">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-[var(--text-primary)]">{member.name}</span> from the team?
            </p>

            {state.error && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--priority-urgent)]/10 border border-[var(--priority-urgent)]/20 px-3 py-2 text-[12px] text-[var(--priority-urgent)]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {state.error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-muted)]
                  hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)] transition-colors duration-150"
              >
                Cancel
              </button>
              <SubmitButton
                label="Remove Member"
                pendingLabel="Removing..."
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium
                  bg-[var(--priority-urgent)] hover:bg-[var(--priority-urgent)]/90 text-white
                  active:scale-[0.98] transition-[color,background-color,border-color,transform] duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

interface TeamMembersClientProps {
  initialMembers: TeamMemberWithProjects[];
  totalMembers: number;
  projects: Project[];
  currentUserId: string;
  isOwner: boolean;
}

export default function TeamMembersClient({
  initialMembers,
  totalMembers: initialTotal,
  projects,
  currentUserId,
  isOwner,
}: TeamMembersClientProps) {
  const { toasts, push, dismiss } = useToast();

  const [members, setMembers] = useState<TeamMemberWithProjects[]>(initialMembers);
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [editMember, setEditMember] = useState<TeamMemberWithProjects | null>(null);
  const [editKey, setEditKey] = useState(0);
  const [deleteMember, setDeleteMember] = useState<TeamMemberWithProjects | null>(null);
  const [deleteKey, setDeleteKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setMembers(initialMembers);
    setTotal(initialTotal);
    setCurrentPage(0);
  }, [initialMembers, initialTotal]);

  const fetchPage = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const result = await fetchTeamMembersPageAction(page, PAGE_SIZE);
      setMembers(result.members);
      setTotal(result.total);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate stats from current page
  const adminCount = members.filter(m => m.user_role === "admin").length;

  // Filter members (client-side on current page)
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /** Build a table row from what the action returned. Project names come from
   *  the list this page already holds, so no extra query is needed. */
  const toRow = useCallback(
    (p: SavedMemberPayload, existing?: TeamMemberWithProjects): TeamMemberWithProjects => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      avatar_url: existing?.avatar_url ?? null,
      user_role: p.user_role,
      is_owner: existing?.is_owner ?? false,
      // The list query never selects org_id and nothing on this page reads it —
      // it is only here because TeamMemberWithProjects extends the full row type.
      org_id: existing?.org_id ?? null,
      project_members: p.projectIds.map((project_id) => {
        const match = projects.find((pr) => pr.id === project_id);
        return { project_id, projects: match ? { id: match.id, name: match.name } : null };
      }),
    }),
    [projects]
  );

  // All three paths used to close the dialog, re-fetch the whole page, and then
  // refresh the route — three server round trips to show a change already saved.
  // The action now hands back what it wrote, so the table updates in place.
  function closeDialogs() {
    setAddOpen(false);
    setEditMember(null);
    setDeleteMember(null);
  }

  function handleAdded(state: AddMemberState) {
    push(state.success!, "success");
    closeDialogs();
    if (!state.member) return;
    // Sorted by name, so a fresh invite is not necessarily first — only page 0
    // can be rebuilt locally without guessing.
    if (currentPage !== 0) { fetchPage(0); return; }
    const row = toRow(state.member);
    // Never trim back to PAGE_SIZE here. Doing so silently dropped the
    // alphabetically-last row — very often the member just invited — so adding
    // a second member made one vanish from the table. Show every row, and only
    // when the page has genuinely overflowed ask the server which rows belong
    // on it. Nothing the user just created may disappear.
    const overflowed = members.length + 1 > PAGE_SIZE;
    setMembers((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    setTotal((t) => t + 1);
    if (overflowed) fetchPage(0);
  }

  function handleEdited(state: EditMemberState) {
    push(state.success!, "success");
    closeDialogs();
    if (!state.member) return;
    const payload = state.member;
    setMembers((prev) =>
      prev
        .map((m) => (m.id === payload.id ? toRow(payload, m) : m))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  function handleDeleted(state: DeleteMemberState) {
    push(state.success!, "success");
    closeDialogs();
    if (!state.deletedId) return;
    const hadLaterPages = total > PAGE_SIZE;
    setMembers((prev) => prev.filter((m) => m.id !== state.deletedId));
    setTotal((t) => Math.max(0, t - 1));
    // The row leaves the screen instantly. Only re-read the page when a row
    // from a later page now has to move up into the gap.
    if (hadLaterPages) fetchPage(currentPage);
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Layers size={16} className="text-[var(--text-faint)]" />
          <h1 className="text-[15px] font-medium text-[var(--text-primary)]">Team Members</h1>
        </div>
        {isOwner && (
          <button
            onClick={() => { setAddOpen(true); setAddKey((k) => k + 1); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors duration-150"
          >
            <Plus size={14} />
            Invite Member
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-[var(--accent)]" />
                <span className="text-[11px] text-[var(--text-faint)]">Total Members</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--text-primary)]">{total}</p>
            </div>
            
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-[var(--status-done)]" />
                <span className="text-[11px] text-[var(--text-faint)]">Admins</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--text-primary)]">{adminCount}</p>
            </div>
            
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-[var(--priority-high)]" />
                <span className="text-[11px] text-[var(--text-faint)]">Members</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--text-primary)]">{total - adminCount}</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-6">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg
                  bg-[var(--bg-sidebar)] border border-[var(--border-default)]
                  text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]
                  focus:outline-none focus:border-[var(--accent-border)]
                  transition-colors duration-150"
              />
            </div>
          </div>

          {/* Members Table */}
          {filteredMembers.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-[13px] text-[var(--text-muted)] mb-2">
                {searchQuery ? "No members found" : "No team members yet"}
              </p>
              {isOwner && !searchQuery && (
                <button
                  onClick={() => { setAddOpen(true); setAddKey((k) => k + 1); }}
                  className="text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  Invite your first member →
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
                        Member
                      </th>
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] hidden sm:table-cell">
                        Contact
                      </th>
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em]">
                        Role
                      </th>
                      <th className="px-3 sm:px-5 py-3 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] hidden lg:table-cell">
                        Projects
                      </th>
                      <th className="px-3 sm:px-5 py-3 text-right text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={loading ? 'opacity-50 pointer-events-none' : ''}>
                    {filteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="group border-b border-[var(--border-subtle)] last:border-0
                          hover:bg-[var(--bg-elevated)] transition-colors duration-[120ms]"
                      >
                        <td className="px-3 sm:px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-medium ${getAvatarColor(member.name)}`}
                            >
                              {initials(member.name)}
                            </div>
                            <div>
                              <span className="text-[13px] font-medium text-[var(--text-primary)] block">
                                {member.name}
                              </span>
                              {member.id === currentUserId && (
                                <span className="text-[10px] text-[var(--accent)] font-medium">You</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 sm:px-5 py-3.5 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-[var(--text-faint)]" />
                            <span className="text-[12px] text-[var(--text-muted)] truncate">
                              {member.email}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 sm:px-5 py-3.5">
                          <RoleBadge userRole={member.user_role} isOwner={member.is_owner} />
                        </td>

                        <td className="px-3 sm:px-5 py-3.5 hidden lg:table-cell">
                          <ProjectPills member={member} />
                        </td>

                        <td className="px-3 sm:px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {(!member.is_owner || isOwner) && (
                              <button
                                onClick={() => { setEditMember(member); setEditKey((k) => k + 1); }}
                                className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]
                                  transition-colors duration-150"
                                title="Edit member"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {(!member.is_owner || isOwner) && member.id !== currentUserId && (
                              <button
                                onClick={() => { setDeleteMember(member); setDeleteKey((k) => k + 1); }}
                                disabled={member.is_owner}
                                title={member.is_owner ? "Owner cannot be removed" : "Remove member"}
                                className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-[var(--priority-urgent)] hover:bg-[var(--priority-urgent)]/10
                                  transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed
                                  disabled:hover:text-[var(--text-faint)] disabled:hover:bg-transparent"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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

      {/* Modals */}
      <AddMemberModal
        key={addKey}
        open={addOpen}
        projects={projects}
        onClose={() => setAddOpen(false)}
        onSuccess={handleAdded}
      />

      <EditMemberModal
        key={editKey}
        open={!!editMember}
        member={editMember}
        projects={projects}
        isOwner={isOwner}
        onClose={() => setEditMember(null)}
        onSuccess={handleEdited}
      />

      <DeleteMemberModal
        key={deleteKey}
        open={!!deleteMember}
        member={deleteMember}
        onClose={() => setDeleteMember(null)}
        onSuccess={handleDeleted}
      />
    </div>
  );
}