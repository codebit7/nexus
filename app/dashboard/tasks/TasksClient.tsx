"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Copy,
  Check,
  MessageSquare,
  Layers,
  X,
  Trash2,
  ArrowLeft,
  FolderKanban,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { TaskWithAssignee } from "@/components/tasks/TaskCard";
import { useTaskForm } from "@/app/dashboard/task-form-context";
import { useWorkspaceSlug } from "@/app/dashboard/workspace-context";
import { useSidebarCollapsed } from "@/app/dashboard/DashboardShell";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { updateTaskStatusAction, createCustomStatusAction, deleteCustomStatusAction } from "@/app/dashboard/tasks/actions";
import type { TaskStatusRow } from "@/lib/db/task-statuses";
import type { TagRow } from "@/lib/db/tags";

/** #rrggbb → rgba (small helper, kept local so the card can tint tag pills). */
function tagBg(hex: string): string {
  const clean = hex.replace("#", "");
  const expanded = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0");
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

/* ── Column status icons ───────────────────────────────────────────────── */

function StatusDot({ color, className }: { color: string; className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.2" />
      <circle cx="8" cy="8" r="3" fill={color} opacity="0.5" />
    </svg>
  );
}

/* ── Task card — Orchestra style ───────────────────────────────────────── */

function OrchestraCard({
  task,
  tags,
  onClick,
  isDragging,
}: {
  task: TaskWithAssignee;
  tags?: TagRow[];
  onClick: () => void;
  isDragging?: boolean;
}) {
  const slug = useWorkspaceSlug();
  const isHighPriority = task.priority === "urgent" || task.priority === "high";
  const [copied, setCopied] = useState(false);

  async function copyTaskLink(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${slug}/tasks/${task.id}`;

    // Primary path: async Clipboard API (requires a secure context — https or localhost).
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch {
        // fall through to legacy path
      }
    }

    // Fallback for insecure contexts (plain-http LAN IPs, older browsers):
    // hidden textarea + document.execCommand("copy"). Deprecated but widely supported.
    if (!ok) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        ok = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        ok = false;
      }
    }

    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div
      onClick={onClick}
      className={[
        "group relative rounded-[10px] cursor-pointer select-none",
        "bg-[var(--bg-card)] border border-[var(--border-default)]",
        "hover:border-[var(--border-hover)]",
        "transition-colors duration-150",
        isDragging
          ? "shadow-[var(--shadow-modal)] scale-[1.015] rotate-[0.5deg]"
          : "",
      ].join(" ")}
    >
      {isHighPriority && (
        <div
          className="absolute top-[6px] left-[6px] w-[6px] h-[6px] rounded-full z-10"
          style={{
            background:
              task.priority === "urgent"
                ? "var(--priority-urgent)"
                : "var(--priority-high)",
          }}
        />
      )}

      <div className="px-4 pt-4 pb-3">
        <p className="text-[13.5px] text-[var(--text-secondary)] leading-[1.4]">
          {task.title}
        </p>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {tags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium whitespace-nowrap"
                style={{ background: tagBg(t.color), color: t.color }}
                title={t.name}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            onClick={copyTaskLink}
            className={[
              "p-0.5 transition-opacity duration-150",
              copied
                ? "opacity-100 text-[var(--status-done)]"
                : "opacity-0 group-hover:opacity-100 text-[var(--text-disabled)] hover:text-[var(--text-subtle)]",
            ].join(" ")}
            title={copied ? "Link copied" : "Copy link to task"}
            aria-label={copied ? "Link copied to clipboard" : "Copy link to task"}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <span className="flex items-center gap-1 text-[11px] text-[var(--text-disabled)]">
            <MessageSquare size={12} />
            <span>{task.comment_count ?? 0}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Add Board Dialog ───────────────────────────────────────────────────── */

const PRESET_COLORS = [
  '#e5484d', '#e79d13', '#5e6ad2', '#26c97f',
  '#888888', '#cf69ca', '#3b82f6', '#f97316',
];

function AddBoardDialog({
  open,
  onClose,
  onCreated,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** null = org-wide column (global page); UUID = project-scoped. */
  projectId: string | null;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#5e6ad2');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setLabel(''); setColor('#5e6ad2'); setError(null); }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    setError(null);
    const result = await createCustomStatusAction(label, color, projectId);
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    onCreated();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-3">
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg
        w-full max-w-[400px] max-h-[92vh] overflow-y-auto shadow-[var(--shadow-modal)]">
        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-4
          border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-[15px] font-medium text-[var(--text-primary)]">Add Board Column</h3>
            <p className="text-[11px] text-[var(--text-faint)] mt-1">Create a custom task status</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-[var(--text-primary)]
            hover:bg-[var(--hover-default)] transition-colors duration-150">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-subtle)] uppercase tracking-[0.06em] mb-1.5">
                Name <span className="text-[var(--priority-urgent)]">*</span>
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. In Testing, Review, QA..."
                autoFocus
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-input)] border border-[var(--border-default)]
                  text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-fainter)]
                  focus:outline-none focus:border-[var(--border-hover)]
                  focus:ring-1 focus:ring-[var(--accent-ring)]
                  transition-colors duration-150"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-subtle)] uppercase tracking-[0.06em] mb-1.5">
                Color
              </label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-md transition-transform duration-150
                      ${color === c ? 'scale-110 ring-2 ring-white/20' : 'hover:scale-105'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--bg-page)] border border-[var(--border-subtle)]">
              <StatusDot color={color} />
              <span className="text-[13px] text-[var(--text-muted)]">
                {label.trim() || 'Preview'}
              </span>
            </div>
          </div>

          {error && (
            <div className="mx-6 mb-3 rounded-md px-3 py-2 text-[12px] text-[var(--priority-urgent)]
              bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 px-6 py-4
            border-t border-[var(--border-subtle)]">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium text-[var(--text-muted)]
                hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)] transition-colors duration-150">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium
                bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
                active:scale-[0.98] transition-colors duration-150
                disabled:opacity-50 flex items-center gap-1.5">
              {submitting ? 'Creating...' : 'Add Column'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */

interface TasksClientProps {
  initialTasks: TaskWithAssignee[];
  statuses: TaskStatusRow[];
  isAdmin: boolean;
  currentMemberId?: string;
  projectMap?: Record<string, string>;
  /** Tag rows attached to each task id. Empty object is fine. */
  tagsByTask?: Record<string, TagRow[]>;
  /** When set, this board is scoped to a single project. Hides tabs, changes the
   *  header, and pre-fills the project on new-task creation. */
  project?: { id: string; name: string };
}

export default function TasksClient({
  initialTasks,
  statuses,
  isAdmin,
  currentMemberId,
  projectMap = {},
  tagsByTask = {},
  project,
}: TasksClientProps) {
  const router = useRouter();
  const slug = useWorkspaceSlug();
  const sidebarCollapsed = useSidebarCollapsed();
  const { openTaskForm } = useTaskForm();
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks);
  const [activeTab, setActiveTab] = useState("all");
  const [addBoardOpen, setAddBoardOpen] = useState(false);
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  // Build columns from DB statuses
  const columns = statuses.map((s) => ({
    id: s.slug,
    label: s.label,
    color: s.color,
    statusId: s.id,
    isDefault: s.is_default,
    projectId: s.project_id, // null = org-wide; UUID = scoped to a project
  }));

  // Which scope is the user allowed to delete from this page?
  //  - On a project board, they can remove columns scoped to THIS project.
  //  - On the global /tasks page, they can remove org-wide customs.
  //  They can never delete a scope that doesn't match the current page.
  const currentScopeProjectId = project?.id ?? null;

  const visibleTasks = activeTab === "me" && currentMemberId
    ? tasks.filter((t) => t.assignee_id === currentMemberId)
    : tasks;

  const tasksByStatus: Record<string, TaskWithAssignee[]> = {};
  for (const col of columns) {
    tasksByStatus[col.id] = visibleTasks.filter((t) => t.status === col.id);
  }

  const totalTasks = visibleTasks.length;

  function handleTaskClick(task: TaskWithAssignee) {
    router.push(`/${slug}/tasks/${task.id}`);
  }

  /* ── Drag & drop ───────────────────────────────────────────────────── */

  const pendingUpdatesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    setTasks((prev) => {
      if (pendingUpdatesRef.current.size === 0) return initialTasks;
      return initialTasks.map((task) => {
        const pendingStatus = pendingUpdatesRef.current.get(task.id);
        return pendingStatus ? { ...task, status: pendingStatus } : task;
      });
    });
  }, [initialTasks]);

  function canDrag(task: TaskWithAssignee): boolean {
    if (isAdmin) return true;
    if (!currentMemberId) return false;
    return task.assignee_id === currentMemberId;
  }

  const onDragEnd = useCallback(async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const draggedTask = tasks.find((t) => t.id === draggableId);
    if (draggedTask && !canDrag(draggedTask)) return;

    const newStatus = destination.droppableId;
    pendingUpdatesRef.current.set(draggableId, newStatus);

    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    const updateResult = await updateTaskStatusAction(draggableId, newStatus);
    pendingUpdatesRef.current.delete(draggableId);

    if (updateResult?.error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggableId ? { ...t, status: source.droppableId } : t
        )
      );
    }
    // No router.refresh() on success: the card was already moved optimistically
    // above, so refreshing only re-rendered the whole route to arrive at the
    // state already on screen — and the board visibly stalled while it did.
    // updateTaskStatusAction revalidates server-side, so other routes stay fresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, tasks]);

  /* ── Delete custom status ─────────────────────────────────────────── */

  async function handleDeleteStatus(statusId: string, label: string) {
    await confirm({
      title: `Remove "${label}" column?`,
      description: (
        <>
          Any tasks in this column will be moved back to{" "}
          <span className="font-medium text-[var(--text-primary)]">To Do</span>.
          This action cannot be undone.
        </>
      ),
      confirmLabel: "Remove column",
      variant: "destructive",
      onConfirm: async () => {
        setDeletingStatusId(statusId);
        const result = await deleteCustomStatusAction(statusId);
        setDeletingStatusId(null);
        if (!result.error) router.refresh();
      },
    });
  }

  /* ── Tabs ──────────────────────────────────────────────────────────── */

  const tabs = [
    { label: "All tasks", value: "all" },
    ...(currentMemberId ? [{ label: "For me", value: "me" }] : []),
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">

      {/* ═══ Top Toolbar ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {project ? (
            <>
              <Link
                href={`/${slug}/projects/${project.id}`}
                className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)] transition-colors duration-150 shrink-0"
                title="Back to project"
              >
                <ArrowLeft size={16} />
              </Link>
              <FolderKanban size={16} className="text-[var(--accent)] shrink-0" />
              <div className="min-w-0">
                <h1 className="text-[15px] font-medium text-[var(--text-primary)] truncate">{project.name}</h1>
                <p className="text-[11px] text-[var(--text-faint)] mt-0.5 truncate">Board · {totalTasks} {totalTasks === 1 ? "task" : "tasks"}</p>
              </div>
            </>
          ) : (
            <>
              <Layers size={16} className="text-[var(--text-faint)] shrink-0" />
              <div className="min-w-0">
                <h1 className="text-[15px] font-medium text-[var(--text-primary)] truncate">Tasks</h1>
                <p className="text-[11px] text-[var(--text-faint)] mt-0.5 truncate">{totalTasks} total tasks</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={() => setAddBoardOpen(true)}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium
                text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-default)]
                hover:bg-[var(--hover-default)] transition-colors duration-150"
              title="Add Board"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Board</span>
            </button>
          )}
          <button
            onClick={() => openTaskForm(project?.id)}
            className="flex items-center gap-2 px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors duration-150"
            title="New Task"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* ═══ Tab Bar ════════════════════════════════════════════════════════ */}
      {!project && (
        <div className="flex items-center gap-1 px-4 sm:px-6 h-[48px] border-b border-[var(--border-subtle)] shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={[
                "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150",
                activeTab === tab.value
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ═══ Kanban board ════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          {/* Visible columns: 3 with sidebar open, 4 when collapsed.
              Extra columns scroll horizontally. */}
          <div className="flex h-full min-w-full"
            style={{
              width: columns.length > (sidebarCollapsed ? 4 : 3)
                ? `${columns.length * (sidebarCollapsed ? 25 : 33.333)}%`
                : '100%',
            }}>
            {columns.map((col, colIdx) => {
              const colTasks = tasksByStatus[col.id] ?? [];

              return (
                <div
                  key={col.id}
                  className={[
                    "flex flex-col flex-1 min-w-[260px] sm:min-w-[280px] h-full",
                    colIdx < columns.length - 1
                      ? "border-r border-[var(--border-subtle)]"
                      : "",
                  ].join(" ")}
                >
                  {/* ── Column header ───────────────────────────────── */}
                  <div className="flex items-center justify-between px-4 h-[42px] shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusDot color={col.color} />
                      <span className="text-[13px] text-[var(--text-muted)] truncate">
                        {col.label}
                      </span>
                      {/* On the global /tasks page, show the project name next to any
                          project-scoped column so users know where it lives. */}
                      {!project && col.projectId && projectMap[col.projectId] && (
                        <span
                          className="text-[11px] text-[var(--text-faint)] truncate"
                          title={projectMap[col.projectId]}
                        >
                          · {projectMap[col.projectId]}
                        </span>
                      )}
                      {colTasks.length > 0 && (
                        <span className="shrink-0 flex items-center justify-center min-w-[20px] h-[18px]
                          px-1.5 rounded-full text-[10px] font-medium tabular-nums
                          bg-[var(--tint-red)] text-[var(--priority-urgent)]">
                          {colTasks.length}/{totalTasks}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Delete button — only for custom columns in the SAME scope as
                          the current page (project board → project-scoped only,
                          global page → org-wide only). */}
                      {isAdmin && !col.isDefault && col.projectId === currentScopeProjectId && (
                        <button
                          onClick={() => handleDeleteStatus(col.statusId, col.label)}
                          disabled={deletingStatusId === col.statusId}
                          title={`Remove "${col.label}" column`}
                          className="p-0.5 rounded text-[var(--text-disabled)] hover:text-[var(--priority-urgent)]
                            hover:bg-[var(--tint-red)] transition-colors duration-150
                            disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => openTaskForm(project?.id ?? col.projectId ?? undefined, col.id)}
                        className="p-0.5 rounded text-[var(--text-fainter)] hover:text-[var(--text-muted)]
                          hover:bg-[var(--hover-default)] transition-colors duration-150"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* ── Drop zone / card list ───────────────────────── */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={[
                          "flex-1 overflow-y-auto scrollbar-orchestra",
                          "px-3 sm:px-7 pt-2 pb-4",
                          "flex flex-col gap-3",
                          snapshot.isDraggingOver
                            ? "bg-[var(--hover-subtle)]"
                            : "",
                          "transition-colors duration-150",
                        ].join(" ")}
                      >
                        {colTasks.map((task, index) => {
                          const locked = !canDrag(task);
                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={locked}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...(locked ? {} : dragProvided.dragHandleProps)}
                                >
                                  <OrchestraCard
                                    task={task}
                                    tags={tagsByTask[task.id]}
                                    onClick={() => handleTaskClick(task)}
                                    isDragging={dragSnapshot.isDragging}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}

                        {/* Empty state */}
                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="px-1 pt-2">
                            <p className="text-[13px] text-[var(--text-muted)] mb-1">
                              {col.label}
                            </p>
                            <p className="text-[12px] text-[var(--text-fainter)] leading-[1.6]">
                              Drag tasks here or create a new one.
                            </p>
                          </div>
                        )}

                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Add Board Dialog */}
      <AddBoardDialog
        open={addBoardOpen}
        onClose={() => setAddBoardOpen(false)}
        onCreated={() => router.refresh()}
        projectId={currentScopeProjectId}
      />
    </div>
  );
}
