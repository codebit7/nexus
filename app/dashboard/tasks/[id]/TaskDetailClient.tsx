"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  ArrowUp,
  Minus,
  ArrowDown,
  CalendarDays,
  User,
  Paperclip,
  MessageSquare,
  Send,
  ExternalLink,
  FileText,
  Upload,
  Search,
  ListTodo,
  Pencil,
  Layers,
  FolderKanban,
} from "lucide-react";
import { getTaskByIdWithAssignee, getCommentsByTaskId, getFilesByTaskId } from "@/lib/db/tasks";
import { getProjectById } from "@/lib/db/projects";
import { getTagsForTask, type TagRow } from "@/lib/db/tags";
import { TaskFormDialog } from "@/components/tasks/TaskForm";
import type { TaskWithAssignee, CommentWithAuthor, TaskSidebarItem } from "@/lib/db/tasks";
import type { ProjectFile, TaskStatus, TaskPriority } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useWorkspaceSlug } from "@/app/dashboard/workspace-context";
import { createCommentAction, uploadFileAction } from "./actions";

// ── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any; iconColor: string }> = {
  urgent: { 
    label: "Urgent", 
    bg: "rgba(229,72,77,0.12)", 
    text: "#e5484d", 
    icon: AlertCircle, 
    iconColor: "#e5484d" 
  },
  high: { 
    label: "High", 
    bg: "rgba(231,157,19,0.12)", 
    text: "#e79d13", 
    icon: ArrowUp, 
    iconColor: "#e79d13" 
  },
  normal: { 
    label: "Normal", 
    bg: "rgba(94,106,210,0.12)", 
    text: "#5e6ad2", 
    icon: Minus, 
    iconColor: "#5e6ad2" 
  },
  low: { 
    label: "Low", 
    bg: "rgba(136,136,136,0.12)", 
    text: "#888", 
    icon: ArrowDown, 
    iconColor: "#888" 
  },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  todo: { 
    label: "To Do", 
    bg: "rgba(136,136,136,0.12)", 
    text: "#888", 
    dot: "#888" 
  },
  in_progress: { 
    label: "In Progress", 
    bg: "rgba(94,106,210,0.12)", 
    text: "#5e6ad2", 
    dot: "#5e6ad2" 
  },
  done: { 
    label: "Done", 
    bg: "rgba(38,201,127,0.12)", 
    text: "#26c97f", 
    dot: "#26c97f" 
  },
};

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
  const Icon = config.icon;
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: config.bg, color: config.text }}>
      <Icon size={10} style={{ color: config.iconColor }} />
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo;
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: config.bg, color: config.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: CommentWithAuthor }) {
  const authorName = comment.author_name ?? "Team Member";
  const initials = authorName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const raw = comment.created_at ?? "";
  const utc = raw && !raw.endsWith("Z") && !raw.includes("+") ? raw + "Z" : raw;
  const date = utc
    ? new Date(utc).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tint-accent-strong)]">
        <span className="text-xs font-medium text-[var(--accent)]">{initials}</span>
      </div>
      <div className="flex-1">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-medium text-[var(--text-muted)]">{authorName}</span>
            <span className="text-[11px] text-[var(--text-faint)]">{date}</span>
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">{comment.content}</p>
        </div>
      </div>
    </div>
  );
}

function FileItem({ file }: { file: ProjectFile }) {
  return (
    <a
      href={file.file_url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-3 hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] transition-colors duration-150 group"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tint-accent)]">
        <FileText className="h-5 w-5 text-[var(--accent)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{file.filename ?? "Unnamed file"}</p>
        {file.created_at && (
          <p className="text-[11px] text-[var(--text-faint)] mt-0.5">
            Added {new Date(file.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        )}
      </div>
      <ExternalLink className="h-4 w-4 text-[var(--text-faint)] group-hover:text-[var(--accent)] transition-colors duration-150 shrink-0" />
    </a>
  );
}

// ── Props & Component ────────────────────────────────────────────────────────

interface TaskDetailClientProps {
  task: TaskWithAssignee;
  initialComments: CommentWithAuthor[];
  initialFiles: ProjectFile[];
  sidebarTasks: TaskSidebarItem[];
  projectName: string | null;
  isAdmin?: boolean;
  currentMemberId?: string;
  initialTags?: TagRow[];
}

export default function TaskDetailClient({
  task: initialTask,
  initialComments,
  initialFiles,
  sidebarTasks,
  projectName: initialProjectName,
  isAdmin = false,
  currentMemberId,
  initialTags = [],
}: TaskDetailClientProps) {
  const router = useRouter();
  const slug = useWorkspaceSlug();
  const [selectedId, setSelectedId] = useState(initialTask.id);
  const [search, setSearch] = useState("");

  const [task, setTask] = useState<TaskWithAssignee>(initialTask);
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments);
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [tags, setTags] = useState<TagRow[]>(initialTags);
  const [projectName, setProjectName] = useState<string | null>(initialProjectName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadedId, setLoadedId] = useState(initialTask.id);

  const filteredSidebarTasks = useMemo(() => {
    if (!search.trim()) return sidebarTasks;
    const q = search.toLowerCase();
    return sidebarTasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [sidebarTasks, search]);

  // Fetch when switching tasks via sidebar
  useEffect(() => {
    if (selectedId === loadedId) return;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [t, c, f, tg] = await Promise.all([
          getTaskByIdWithAssignee(selectedId),
          getCommentsByTaskId(selectedId),
          getFilesByTaskId(selectedId),
          getTagsForTask(selectedId).catch(() => [] as TagRow[]),
        ]);
        setTask(t);
        setComments(c);
        setFiles(f);
        setTags(tg);
        if (t.project_id) {
          try {
            const project = await getProjectById(t.project_id);
            setProjectName(project.name);
          } catch {
            setProjectName(null);
          }
        } else {
          setProjectName(null);
        }
        setLoadedId(selectedId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedId, loadedId]);

  function selectTask(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    window.history.replaceState(null, "", `/${slug}/tasks/${id}`);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('taskId', task.id);
      formData.append('file', file);
      const newFile = await uploadFileAction(formData);
      setFiles((prev) => [newFile, ...prev]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    setCommentError(null);
    try {
      const newComment = await createCommentAction(task.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  const isOverdue = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();

  // Get status config for sidebar tasks
  const getTaskStatusConfig = (status: string | null) => {
    const s = (status as TaskStatus) ?? "todo";
    return STATUS_CONFIG[s] ?? STATUS_CONFIG.todo;
  };

  const getTaskPriorityConfig = (priority: string | null) => {
    const p = (priority as TaskPriority) ?? "normal";
    return PRIORITY_CONFIG[p] ?? PRIORITY_CONFIG.normal;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">
      
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          {/* Native anchor instead of <Link> — the sidebar swaps tasks with
              window.history.replaceState(), which desyncs the App Router's
              internal URL state. A plain <a> lets the browser handle the
              navigation and avoids the stuck-on-loading issue. */}
          <a
            href={`/${slug}/tasks`}
            className="p-2 sm:p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)] transition-colors duration-150"
            title="Back to Tasks"
          >
            <ArrowLeft size={16} />
          </a>
          <div className="w-px h-5 bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <ListTodo size={16} className="text-[var(--accent)]" />
            <h1 className="text-[15px] font-medium text-[var(--text-primary)]">Task Details</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          
          {/* Task sidebar and content - 2 column layout */}
          <div className="flex gap-6 items-start">
            
            {/* Left sidebar - Task list */}
            <aside className="hidden lg:block w-[320px] shrink-0">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden sticky top-6">
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={14} className="text-[var(--accent)]" />
                    <h2 className="text-[13px] font-medium text-[var(--text-primary)]">
                      {task.assignee ? `${task.assignee.name.split(" ")[0]}'s Tasks` : "All Tasks"}
                    </h2>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-faint)]" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search tasks..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-border)] transition-colors duration-150"
                    />
                  </div>
                </div>

                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  {filteredSidebarTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <ListTodo className="h-8 w-8 text-[var(--text-disabled)]" />
                      <p className="text-[12px] text-[var(--text-faint)]">No tasks found</p>
                    </div>
                  ) : (
                    filteredSidebarTasks.map((t) => {
                      const isActive = t.id === selectedId;
                      const statusConfig = getTaskStatusConfig(t.status);
                      const priorityConfig = getTaskPriorityConfig(t.priority);
                      const isTaskOverdue = t.due_date && t.status !== "done" && new Date(t.due_date) < new Date();
                      
                      return (
                        <button
                          key={t.id}
                          onClick={() => selectTask(t.id)}
                          className={[
                            "w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-150",
                            isActive
                              ? "bg-[var(--tint-accent)] border-l-2 border-l-[#5e6ad2]"
                              : "hover:bg-[var(--hover-default)]",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={[
                              "text-[13px] font-medium truncate",
                              isActive ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                            ].join(" ")}>
                              {t.title}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                              style={{ background: statusConfig.bg, color: statusConfig.text }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusConfig.dot }} />
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--text-faint)]">
                                {priorityConfig.label}
                              </span>
                              {t.due_date && (
                                <span className={`${isTaskOverdue ? 'text-[var(--priority-urgent)]' : 'text-[var(--text-faint)]'}`}>
                                  {formatDate(t.due_date)}
                                </span>
                              )}
                            </div>
                            {'project_name' in t && (t as any).project_name && (
                              <span className="text-[var(--text-faint)] truncate max-w-[120px]">
                                {(t as any).project_name}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>

            {/* Right panel - Task detail */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="space-y-6 animate-pulse">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="h-8 w-64 bg-[var(--hover-default)] rounded mb-3" />
                      <div className="h-4 w-32 bg-[var(--hover-default)] rounded" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-t border-[var(--border-subtle)]">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="space-y-2">
                          <div className="h-3 w-16 bg-[var(--hover-default)] rounded" />
                          <div className="h-5 w-20 bg-[var(--hover-default)] rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6">
                    <div className="h-6 w-32 bg-[var(--hover-default)] rounded mb-4" />
                    <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-12 bg-[var(--hover-default)] rounded" />
                      ))}
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-xl bg-[var(--tint-red)] border border-[var(--tint-red-border)] p-6">
                  <p className="text-[13px] text-[var(--priority-urgent)]">{error}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Task Header Card */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusBadge status={task.status as TaskStatus} />
                            <PriorityBadge priority={task.priority as TaskPriority} />
                            {isOverdue && (
                              <span className="text-xs text-[var(--priority-urgent)] bg-[var(--tint-red)] px-2 py-0.5 rounded-md">
                                Overdue
                              </span>
                            )}
                          </div>
                          <h1 className="text-xl font-medium text-[var(--text-primary)] mb-2">
                            {task.title}
                          </h1>
                          {projectName && task.project_id && (
                            <Link 
                              href={`/${slug}/projects/${task.project_id}`}
                              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"
                            >
                              <FolderKanban size={12} />
                              {projectName}
                            </Link>
                          )}
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={() => setEditOpen(true)} 
                            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)] border border-[var(--border-default)] transition-colors duration-150 flex items-center gap-1.5 shrink-0"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-[var(--border-subtle)]">
                        <div>
                          <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">
                            Assignee
                          </p>
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[var(--tint-accent-strong)] flex items-center justify-center">
                                <span className="text-[10px] font-medium text-[var(--accent)]">
                                  {task.assignee.name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm text-[var(--text-muted)]">{task.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-[var(--text-faint)]">Unassigned</span>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">
                            Due Date
                          </p>
                          {task.due_date ? (
                            <div className="flex items-center gap-1.5">
                              <CalendarDays size={14} className={isOverdue ? "text-[var(--priority-urgent)]" : "text-[var(--text-faint)]"} />
                              <span className={`text-sm ${isOverdue ? 'text-[var(--priority-urgent)]' : 'text-[var(--text-muted)]'}`}>
                                {formatDate(task.due_date)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-[var(--text-faint)]">No due date</span>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">
                            Created
                          </p>
                          <span className="text-sm text-[var(--text-muted)]">
                            {task.created_at ? formatDate(task.created_at) : "—"}
                          </span>
                        </div>

                        <div>
                          <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">
                            Priority
                          </p>
                          <PriorityBadge priority={task.priority as TaskPriority} />
                        </div>
                      </div>

                      {tags.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                          <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-2">
                            Tags
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((t) => {
                              const clean = t.color.replace("#", "");
                              const exp = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0");
                              const r = parseInt(exp.slice(0, 2), 16);
                              const g = parseInt(exp.slice(2, 4), 16);
                              const b = parseInt(exp.slice(4, 6), 16);
                              return (
                                <span
                                  key={t.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap"
                                  style={{ background: `rgba(${r}, ${g}, ${b}, 0.18)`, color: t.color }}
                                >
                                  {t.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {task.description && (
                        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                          <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-2">
                            Description
                          </p>
                          <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">
                            {task.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Paperclip size={14} className="text-[var(--text-faint)]" />
                        <h2 className="text-sm font-medium text-[var(--text-primary)]">Attachments</h2>
                        {files.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--border-subtle)] text-[var(--text-faint)]">
                            {files.length}
                          </span>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                          bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--accent)] border border-[var(--border-default)] transition-colors duration-150"
                      >
                        <Upload size={12} />
                        {uploading ? "Uploading..." : "Upload File"}
                      </button>
                    </div>

                    {uploadError && (
                      <p className="mb-3 text-sm text-[var(--priority-urgent)] bg-[var(--tint-red)] px-3 py-2 rounded-lg">
                        {uploadError}
                      </p>
                    )}

                    {files.length === 0 ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-input)] px-6 py-8 text-center cursor-pointer hover:border-[var(--accent-border)] transition-colors duration-150"
                      >
                        <Upload className="mx-auto h-8 w-8 text-[var(--text-faint)] mb-2" />
                        <p className="text-sm text-[var(--text-faint)]">Click to upload a file</p>
                        <p className="text-xs text-[var(--text-disabled)] mt-1">Any file type supported</p>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {files.map((file) => <FileItem key={file.id} file={file} />)}
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <MessageSquare size={14} className="text-[var(--text-faint)]" />
                      <h2 className="text-sm font-medium text-[var(--text-primary)]">Comments</h2>
                      {comments.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--border-subtle)] text-[var(--text-faint)]">
                          {comments.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-4 mb-5">
                      {comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)}
                      {comments.length === 0 && (
                        <p className="text-sm text-[var(--text-faint)] text-center py-4">No comments yet. Start the conversation.</p>
                      )}
                    </div>

                    {commentError && (
                      <p className="mb-3 text-sm text-[var(--priority-urgent)] bg-[var(--tint-red)] px-3 py-2 rounded-lg">
                        {commentError}
                      </p>
                    )}

                    {/* Comment Form */}
                    <form onSubmit={handleSubmitComment} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tint-accent-strong)]">
                        <User size={14} className="text-[var(--accent)]" />
                      </div>
                      <div className="flex-1">
                        <textarea
                          ref={textareaRef}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitComment(e); }}
                          placeholder="Add a comment..."
                          rows={3}
                          className="w-full resize-none rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] 
                            px-4 py-2.5 text-sm text-[var(--text-muted)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-border)]"
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            type="submit"
                            disabled={!commentText.trim() || submitting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors duration-150
                              disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send size={12} />
                            {submitting ? "Posting..." : "Post Comment"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Dialog */}
      {isAdmin && (
        <TaskFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          task={task}
          defaultAssigneeId={currentMemberId}
          isAdmin={isAdmin}
          initialTaskTagIds={tags.map((t) => t.id)}
          onSuccess={async () => {
            const [updated, freshTags] = await Promise.all([
              getTaskByIdWithAssignee(task.id),
              getTagsForTask(task.id).catch(() => [] as TagRow[]),
            ]);
            setTask(updated);
            setTags(freshTags);
            if (updated.project_id) {
              try {
                const p = await getProjectById(updated.project_id);
                setProjectName(p.name);
              } catch { setProjectName(null); }
            }
          }}
        />
      )}
    </div>
  );
}