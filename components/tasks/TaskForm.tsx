"use client";

import { useState, useEffect } from "react";
import { Loader2, CalendarDays, AlignLeft, FolderKanban, UserCircle2, Flag, Hash, Tag as TagIcon, Plus, X, Check } from "lucide-react";
import { updateTask } from "@/lib/db/tasks";
import { createTaskAction } from "@/app/dashboard/tasks/actions";
import { createTagAction, setTaskTagsAction } from "@/app/dashboard/tasks/tag-actions";
import { getProjects } from "@/lib/db/projects";
import { getTeamMembers } from "@/lib/db/team-members";
import { getTaskStatuses, type TaskStatusRow } from "@/lib/db/task-statuses";
import { type TagRow } from "@/lib/db/tags";
import type { Task, TaskPriority, TaskStatus, Project, TeamMember } from "@/lib/types";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskFormDialogProps {
  open:              boolean;
  onOpenChange:      (open: boolean) => void;
  task?:             Task;
  defaultProjectId?: string;
  defaultStatus?:    string;
  defaultAssigneeId?: string;
  isAdmin?:          boolean;
  onSuccess?:        () => void;
  initialProjects?:     Project[];
  initialTeamMembers?:  TeamMember[];
  initialTaskStatuses?: TaskStatusRow[];
  initialTags?:         TagRow[];
  /** Tag ids currently attached to the task being edited (if any). */
  initialTaskTagIds?:   string[];
}

interface FormErrors {
  title?:      string;
  project_id?: string;
}

// Module-level stable empty arrays. Used as defaults for optional array props
// so that callers who don't pass them don't trigger a fresh `[]` reference on
// every render — which, combined with any [prop] useEffect dep elsewhere,
// produces an infinite render loop.
const EMPTY_PROJECTS: Project[] = [];
const EMPTY_TEAM_MEMBERS: TeamMember[] = [];
const EMPTY_STATUSES: TaskStatusRow[] = [];
const EMPTY_TAGS: TagRow[] = [];
const EMPTY_TAG_IDS: string[] = [];

const LABEL = "block text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5";
const FIELD = `w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)]
  text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)]
  focus:outline-none focus:border-[var(--accent-border)]
  focus:ring-1 focus:ring-[var(--accent-ring)]
  transition-colors duration-150`;
const TEXTAREA_FIELD = `w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)]
  text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)] resize-none
  focus:outline-none focus:border-[var(--accent-border)]
  focus:ring-1 focus:ring-[var(--accent-ring)]
  transition-colors duration-150`;
const SELECT_TRIGGER = `w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)]
  h-[42px] text-[13px] text-[var(--text-primary)]
  focus:ring-1 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-border)]
  data-[placeholder]:text-[var(--text-faint)]`;
const SELECT_CONTENT = "bg-[var(--bg-sidebar)] border-[var(--border-default)] text-[var(--text-primary)]";
const SELECT_ITEM = "text-[13px] text-[var(--text-muted)] focus:bg-[var(--tint-accent)] focus:text-[var(--accent)] cursor-pointer";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "Urgent", color: "#e5484d", dot: "bg-[var(--priority-urgent)]" },
  high:   { label: "High",   color: "#e79d13", dot: "bg-[var(--priority-high)]" },
  normal: { label: "Normal", color: "#5e6ad2", dot: "bg-[var(--accent)]" },
  low:    { label: "Low",    color: "#888",    dot: "bg-[var(--text-muted)]" },
};

// Palette rotated through when a user creates a new tag from the picker.
const TAG_COLOR_PALETTE = [
  "#e5484d", "#e79d13", "#f59e0b", "#26c97f",
  "#14b8a6", "#3b82f6", "#5e6ad2", "#cf69ca",
  "#ec4899", "#888888",
];

/** #rrggbb → rgba with the given alpha. Used for tag-pill tinted backgrounds. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const expanded = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean.padEnd(6, "0");
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Small colored pill used in the tag picker list + selected state. */
function TagPill({ tag, size = "sm" }: { tag: TagRow; size?: "xs" | "sm" }) {
  const px = size === "xs" ? "px-1.5" : "px-2";
  const py = size === "xs" ? "py-0" : "py-0.5";
  const text = size === "xs" ? "text-[10px]" : "text-[11px]";
  return (
    <span
      className={`inline-flex items-center ${px} ${py} rounded ${text} font-medium whitespace-nowrap`}
      style={{ background: hexToRgba(tag.color, 0.18), color: tag.color }}
    >
      {tag.name}
    </span>
  );
}

/** Multi-select with create-on-the-fly. Used in TaskFormDialog.
 *
 *  Note: we intentionally do NOT attach a document-level mousedown listener to
 *  close on outside click — that races against Radix Dialog's focus trap during
 *  mount/unmount and can trigger a setState loop in react-presence during
 *  detach. Instead, the user toggles the picker by re-clicking the trigger,
 *  presses Escape, or clicks the built-in overlay inside the dropdown. */
function TagPicker({
  allTags,
  selectedIds,
  onChange,
  onCreate,
}: {
  allTags: TagRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreate: (name: string, color: string) => Promise<TagRow | null>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creatingColor, setCreatingColor] = useState(TAG_COLOR_PALETTE[0]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function closePicker() {
    setOpen(false);
    setQuery("");
    setCreateError(null);
  }

  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? allTags.filter((t) => t.name.toLowerCase().includes(q))
    : allTags;
  const exactMatch = filtered.some((t) => t.name.toLowerCase() === q);
  const canCreate = q.length > 0 && !exactMatch;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    setCreateError(null);
    const created = await onCreate(name, creatingColor);
    setCreating(false);
    if (created) {
      onChange([...selectedIds, created.id]);
      setQuery("");
      // Rotate the palette so the next new tag gets a different default color.
      const idx = TAG_COLOR_PALETTE.indexOf(creatingColor);
      setCreatingColor(TAG_COLOR_PALETTE[(idx + 1) % TAG_COLOR_PALETTE.length]);
    } else {
      setCreateError("Could not create tag. Try again.");
    }
  }

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          closePicker();
        }
      }}
    >
      {/* Trigger is a div (not a <button>) so the nested "remove" buttons for
          each pill are valid HTML — a <button> cannot contain <button>. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-lg
          border border-[var(--border-default)] bg-[var(--bg-input)]
          px-3 py-2 text-left text-[13px] cursor-pointer
          focus:outline-none focus-visible:border-[var(--accent-border)]
          focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]
          transition-colors duration-150"
      >
        {selectedTags.length === 0 ? (
          <span className="text-[var(--text-faint)]">Add tags…</span>
        ) : (
          selectedTags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap"
              style={{ background: hexToRgba(t.color, 0.18), color: t.color }}
            >
              {t.name}
              <button
                type="button"
                aria-label={`Remove ${t.name}`}
                onClick={(e) => { e.stopPropagation(); toggle(t.id); }}
                className="inline-flex items-center justify-center opacity-60 hover:opacity-100"
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
      </div>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg
          border border-[var(--border-default)] bg-[var(--bg-sidebar)]
          shadow-[var(--shadow-lg)] p-2 max-h-[300px] flex flex-col">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or create a tag…"
            autoFocus
            className="w-full px-2 py-1.5 rounded-md
              bg-[var(--bg-input)] border border-[var(--border-default)]
              text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]
              focus:outline-none focus:border-[var(--accent-border)] mb-2"
          />

          <div className="flex-1 overflow-y-auto min-h-0">
            {filtered.length === 0 && !canCreate && (
              <p className="text-[12px] text-[var(--text-faint)] p-2">
                No tags yet. Type a name to create one.
              </p>
            )}
            {filtered.map((t) => {
              const isSelected = selectedIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={[
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left",
                    "hover:bg-[var(--hover-default)] transition-colors duration-150",
                    isSelected ? "bg-[var(--tint-accent)]" : "",
                  ].join(" ")}
                >
                  <TagPill tag={t} />
                  {isSelected && <Check size={14} className="text-[var(--accent)] ml-auto" />}
                </button>
              );
            })}
          </div>

          {canCreate && (
            <div className="border-t border-[var(--border-subtle)] mt-2 pt-2 space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[var(--text-faint)] mr-1">Color</span>
                {TAG_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCreatingColor(c)}
                    aria-label={`Color ${c}`}
                    className={[
                      "w-4 h-4 rounded-sm transition-transform duration-150",
                      creatingColor === c ? "scale-125 ring-1 ring-white/30" : "hover:scale-110",
                    ].join(" ")}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-left
                  hover:bg-[var(--hover-default)] transition-colors duration-150
                  disabled:opacity-50"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} className="text-[var(--accent)]" />}
                <span className="truncate">Create &ldquo;{query.trim()}&rdquo;</span>
                <span
                  className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium ml-auto whitespace-nowrap"
                  style={{ background: hexToRgba(creatingColor, 0.18), color: creatingColor }}
                >
                  preview
                </span>
              </button>
              {createError && (
                <p className="text-[11px] text-[var(--priority-urgent)] px-1">{createError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultProjectId,
  defaultStatus,
  defaultAssigneeId,
  isAdmin = false,
  onSuccess,
  initialProjects = EMPTY_PROJECTS,
  initialTeamMembers = EMPTY_TEAM_MEMBERS,
  initialTaskStatuses = EMPTY_STATUSES,
  initialTags = EMPTY_TAGS,
  initialTaskTagIds = EMPTY_TAG_IDS,
}: TaskFormDialogProps) {
  const isEdit = !!task;

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId]   = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus]         = useState<TaskStatus>("todo");
  const [priority, setPriority]     = useState<TaskPriority>("normal");
  const [dueDate, setDueDate]       = useState("");
  const [errors, setErrors]         = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [projects, setProjects]       = useState<Project[]>(initialProjects);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusRow[]>(initialTaskStatuses);
  const [tags, setTags]               = useState<TagRow[]>(initialTags);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTaskTagIds);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [statusReset, setStatusReset] = useState(false);

  // Intentionally NO prop→state sync useEffects here.
  //
  // Callers that don't pass `initial*` props (e.g. the edit dialog in
  // TaskDetailClient) would fall back to the `= []` destructuring default,
  // which creates a new array reference on every render. An effect with
  // `[initial*]` in its deps then fires every render → setState → re-render →
  // new `[]` → effect fires again → "Maximum update depth exceeded".
  //
  // Instead: useState's initializer captures the initial prop once on mount,
  // and the open effect below kicks off a Promise.all fetch whenever the
  // preload is empty. That covers both preloaded and non-preloaded callers
  // without introducing a ref-instability loop.

  // If the user swaps the project on an open form and the current status is a
  // column scoped to the old project, reset it to "todo" so we don't persist an
  // invalid (project, status) pair. Surface an inline note so the change isn't
  // silent.
  useEffect(() => {
    if (!projectId || taskStatuses.length === 0) return;
    const current = taskStatuses.find((s) => s.slug === status);
    if (current && current.project_id !== null && current.project_id !== projectId) {
      setStatus("todo");
      setStatusReset(true);
    }
  }, [projectId, taskStatuses, status]);

  // Clear the reset notice once the user acknowledges it by picking a status.
  useEffect(() => {
    if (!statusReset) return;
    setStatusReset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!open) return;

    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setProjectId(task?.project_id ?? defaultProjectId ?? "");
    setAssigneeId(task?.assignee_id ?? defaultAssigneeId ?? "");
    setStatus((task?.status as TaskStatus) ?? defaultStatus ?? "todo");
    setPriority((task?.priority as TaskPriority) ?? "normal");
    setDueDate(task?.due_date ?? "");
    setTags(initialTags);
    setSelectedTagIds(initialTaskTagIds);
    setErrors({});
    setSubmitError(null);
    setStatusReset(false);

    // If the preload from the layout already supplied every list, skip the
    // silent background refresh entirely — it's 3 round-trips per open.
    const hasFullPreload =
      initialProjects.length > 0 &&
      initialTeamMembers.length > 0 &&
      initialTaskStatuses.length > 0;
    if (hasFullPreload) return;

    // Otherwise refresh whichever lists are missing so the form is usable.
    const hasAnyPreload =
      initialProjects.length > 0 ||
      initialTeamMembers.length > 0 ||
      initialTaskStatuses.length > 0;
    Promise.all([getProjects(), getTeamMembers(), getTaskStatuses()])
      .then(([p, t, s]) => { setProjects(p); setTeamMembers(t); setTaskStatuses(s); })
      .catch((err: unknown) => {
        if (!hasAnyPreload) {
          setLoadError(err instanceof Error ? err.message : "Failed to load form data");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task, defaultProjectId, defaultStatus, defaultAssigneeId]);

  // Computed: what statuses are valid given the currently selected project.
  // Empty when we have no statuses for this context and therefore can't submit.
  const scopedStatuses = taskStatuses.filter(
    (s) => s.project_id === null || (projectId && s.project_id === projectId)
  );
  const hasNoStatuses = scopedStatuses.length === 0;

  function validate(): boolean {
    const next: FormErrors = {};
    if (!title.trim()) next.title = "Title is required";
    if (!projectId)    next.project_id = "Project is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        title:       title.trim(),
        description: description.trim() || null,
        project_id:  projectId,
        assignee_id: assigneeId || null,
        status,
        priority,
        due_date:    dueDate || null,
      };

      let savedTaskId: string;
      if (isEdit && task) {
        await updateTask(task.id, payload);
        savedTaskId = task.id;
      } else {
        const created = await createTaskAction(payload);
        savedTaskId = created.id;
      }

      // Persist tag selection. Cheap to skip when nothing changed on edit, but
      // the server action is idempotent so we just always write through.
      const tagResult = await setTaskTagsAction(savedTaskId, selectedTagIds);
      if (tagResult.error) {
        // Task itself saved fine — surface the tag error but don't block close.
        // eslint-disable-next-line no-console
        console.error("Failed to save tags:", tagResult.error);
      }

      onOpenChange(false);
      // No revalidateDashboard() here. createTaskAction/updateTask and
      // setTaskTagsAction have each already called revalidatePath('/dashboard',
      // 'layout'); a third one re-rendered the entire dashboard tree again for
      // the same result, and the user waited through every one of them.
      onSuccess?.();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  /** Thin wrapper around the createTag server action for the TagPicker. */
  async function handleCreateTag(name: string, color: string): Promise<TagRow | null> {
    const result = await createTagAction(name, color);
    if (result.error || !result.tag) return null;
    // Merge into the local list so the new tag appears in the picker right away.
    setTags((prev) => {
      if (prev.some((t) => t.id === result.tag!.id)) return prev;
      return [...prev, result.tag!].sort((a, b) => a.name.localeCompare(b.name));
    });
    return result.tag;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="
        bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-xl
        shadow-[var(--shadow-modal)] p-0 gap-0 w-[calc(100vw-24px)] max-w-[560px]
        max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 sm:pt-6 pb-4
          border-b border-[var(--border-subtle)] flex-shrink-0">
          <div>
            <h3 className="text-[15px] font-medium text-[var(--text-primary)]">
              {isEdit ? "Edit Task" : "New Task"}
            </h3>
            <p className="text-[11px] text-[var(--text-faint)] mt-1">
              {isEdit ? "Update task details" : "Create a new task to track work"}
            </p>
          </div>
        </div>

        {loadError && (
          <div className="mx-6 mt-4 rounded-lg bg-[var(--tint-red)] border border-[var(--tint-red-border)] px-4 py-3 text-[13px] text-[var(--priority-urgent)] flex-shrink-0">
            {loadError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="px-4 sm:px-6 py-5 sm:mr-1 space-y-4 overflow-y-auto flex-1 min-h-0">

            <div>
              <label className={LABEL}>
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3 w-3 text-[var(--accent)]" />
                  Title <span className="text-[var(--priority-urgent)] normal-case tracking-normal font-normal">*</span>
                </span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className={FIELD}
                autoFocus
              />
              {errors.title && <p className="mt-1 text-[11px] text-[var(--priority-urgent)]">{errors.title}</p>}
            </div>

            <div>
              <label className={LABEL}>
                <span className="flex items-center gap-1.5">
                  <AlignLeft className="h-3 w-3 text-[var(--accent)]" />
                  Description
                </span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details..."
                rows={3}
                className={TEXTAREA_FIELD}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="h-3 w-3 text-[var(--accent)]" />
                    Project <span className="text-[var(--priority-urgent)] normal-case tracking-normal font-normal">*</span>
                  </span>
                </label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className={SELECT_TRIGGER}>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className={SELECT_ITEM}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.project_id && <p className="mt-1 text-[11px] text-[var(--priority-urgent)]">{errors.project_id}</p>}
              </div>

              <div>
                <label className={LABEL}>
                  <span className="flex items-center gap-1.5">
                    <UserCircle2 className="h-3 w-3 text-[var(--accent)]" />
                    Assignee
                  </span>
                </label>
                <Select
                  value={assigneeId}
                  onValueChange={setAssigneeId}
                  disabled={!isAdmin && !!defaultAssigneeId}
                >
                  <SelectTrigger className={SELECT_TRIGGER}>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {(isAdmin
                      ? teamMembers
                      : teamMembers.filter((m) => !defaultAssigneeId || m.id === defaultAssigneeId)
                    ).map((m) => (
                      <SelectItem key={m.id} value={m.id} className={SELECT_ITEM}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>
                  <span className="flex items-center gap-1.5">
                    <Flag className="h-3 w-3 text-[var(--accent)]" />
                    Priority
                  </span>
                </label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className={SELECT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {(["urgent", "high", "normal", "low"] as TaskPriority[]).map((p) => {
                      const config = PRIORITY_CONFIG[p];
                      return (
                        <SelectItem key={p} value={p} className={SELECT_ITEM}>
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                            <span style={{ color: config.color }}>{config.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className={LABEL}>
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="h-3 w-3 text-[var(--accent)]" />
                    Status
                  </span>
                </label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as TaskStatus)}
                  disabled={hasNoStatuses}
                >
                  <SelectTrigger className={SELECT_TRIGGER}>
                    <SelectValue placeholder={hasNoStatuses ? "No statuses available" : undefined} />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {scopedStatuses.map((s) => (
                      <SelectItem key={s.slug} value={s.slug} className={SELECT_ITEM}>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                          <span style={{ color: s.color }}>{s.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {statusReset && (
                  <p className="mt-1 text-[11px] text-[var(--text-faint)]">
                    Status reset to To Do — the previous status isn&rsquo;t available for this project.
                  </p>
                )}
                {hasNoStatuses && (
                  <p className="mt-1 text-[11px] text-[var(--priority-urgent)]">
                    No statuses available. Add one from the project&rsquo;s board before creating tasks.
                  </p>
                )}
              </div>
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
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={FIELD}
              />
            </div>

            <div>
              <label className={LABEL}>
                <span className="flex items-center gap-1.5">
                  <TagIcon className="h-3 w-3 text-[var(--accent)]" />
                  Tags
                </span>
              </label>
              <TagPicker
                allTags={tags}
                selectedIds={selectedTagIds}
                onChange={setSelectedTagIds}
                onCreate={handleCreateTag}
              />
            </div>
          </div>

          {submitError && (
            <div className="mx-6 mb-4 rounded-lg bg-[var(--tint-red)] border border-[var(--tint-red-border)] px-4 py-3 text-[13px] text-[var(--priority-urgent)] flex-shrink-0">
              {submitError}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3
            px-4 sm:px-6 py-4 border-t border-[var(--border-subtle)] flex-shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-[13px] font-medium text-[var(--text-muted)]
                hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]
                transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || hasNoStatuses}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium
                bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
                active:scale-[0.98] transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TaskFormDialog;