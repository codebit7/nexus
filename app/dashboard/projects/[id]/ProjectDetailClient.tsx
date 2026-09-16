"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Calendar,
  DollarSign,
  CheckSquare,
  Pencil,
  Check,
  X,
  Plus,
  FolderKanban,
  ArrowLeft,
  Briefcase,
  Clock,
  AlertCircle,
  Layers,
  CheckCircle
} from "lucide-react";
import { updateProject } from "@/lib/db/projects";
import { revalidateDashboard } from "@/app/dashboard/actions";
import { searchProjectsForSidebarAction } from "@/app/dashboard/projects/actions";
import type { ProjectListItem } from "@/lib/db/projects";
import type { ClientListItem } from "@/lib/db/clients";
import { getProjectById } from "@/lib/db/projects";
import { getTasksWithAssignees } from "@/lib/db/tasks";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useWorkspaceSlug } from "@/app/dashboard/workspace-context";
import type { Project } from "@/lib/types";
import type { TaskWithAssignee } from "@/lib/db/tasks";
import { useTaskForm } from "../../task-form-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; badge: string; icon: any }> = {
  active: {
    label: "Active",
    dot: "bg-[var(--status-done)]",
    text: "text-[var(--status-done)]",
    badge: "text-[var(--status-done)] bg-[var(--tint-green)] border-[var(--tint-green-border)]",
    icon: CheckCircle
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-[var(--accent)]",
    text: "text-[var(--accent)]",
    badge: "text-[var(--accent)] bg-[var(--tint-accent-strong)] border-[var(--accent-border)]",
    icon: Clock
  },
  completed: {
    label: "Completed",
    dot: "bg-[var(--text-muted)]",
    text: "text-[var(--text-muted)]",
    badge: "text-[var(--text-muted)] bg-[var(--border-subtle)] border-[var(--border-subtle)]",
    icon: CheckCircle
  },
  paused: {
    label: "Paused",
    dot: "bg-[var(--priority-high)]",
    text: "text-[var(--priority-high)]",
    badge: "text-[var(--priority-high)] bg-[var(--tint-orange)] border-[var(--tint-orange-border)]",
    icon: AlertCircle
  },
};

function getStatusConfig(status: string | null) {
  return STATUS_CONFIG[status ?? ""] ?? {
    label: status ?? "Unknown",
    dot: "bg-[var(--text-muted)]",
    text: "text-[var(--text-muted)]",
    badge: "text-[var(--text-muted)] bg-[var(--border-subtle)] border-[var(--border-subtle)]",
    icon: Briefcase,
  };
}

const TASK_STATUS_STYLES = {
  todo:        "bg-[var(--border-subtle)] text-[var(--text-muted)]",
  in_progress: "bg-[var(--tint-accent-strong)] text-[var(--accent)]",
  done:        "bg-[var(--tint-green)] text-[var(--status-done)]",
} as const;

const TASK_STATUS_LABELS = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
} as const;

const PRIORITY_STYLES = {
  urgent: "bg-[var(--tint-red)] text-[var(--priority-urgent)]",
  high:   "bg-[var(--tint-orange)] text-[var(--priority-high)]",
  normal: "bg-[var(--tint-accent-strong)] text-[var(--accent)]",
  low:    "bg-[var(--border-subtle)] text-[var(--text-muted)]",
} as const;

// Edit Form Component
interface EditFormProps {
  project: Project;
  clients: ClientListItem[];
  onSave: (updated: Project) => void;
  onCancel: () => void;
}

function EditForm({ project, clients, onSave, onCancel }: EditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [clientId, setClientId] = useState(project.client_id ?? "");
  const [status, setStatus] = useState(project.status ?? "active");
  const [deadline, setDeadline] = useState(project.deadline ?? "");
  const [totalValue, setTotalValue] = useState(project.total_value != null ? String(project.total_value) : "");
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
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProject(project.id, {
        name: name.trim(),
        client_id: clientId || null,
        status,
        deadline: deadline || null,
        total_value: totalValue ? parseFloat(totalValue) : null,
      });
      onSave(updated);
      await revalidateDashboard();
      router.refresh();
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
          Project Name <span className="text-[var(--priority-urgent)]">*</span>
        </label>
        <input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className={fieldClass} 
          required 
          autoFocus
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">Client</label>
          <Select value={clientId || "__none__"} onValueChange={(v) => setClientId(v === "__none__" ? "" : v)}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="No client" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <SelectItem value="__none__" className={selectItemClass}>No client</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id} className={selectItemClass}>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-[var(--tint-accent)] flex items-center justify-center">
                      <Briefcase className="h-3 w-3 text-[var(--accent)]" />
                    </div>
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {(["active", "in_progress", "paused", "completed"] as const).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <SelectItem key={s} value={s} className={selectItemClass}>
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      <span className={cfg.text}>{cfg.label}</span>
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
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">Total Value ($)</label>
          <input 
            type="number" 
            value={totalValue} 
            onChange={(e) => setTotalValue(e.target.value)} 
            placeholder="0.00" 
            min="0" 
            step="0.01" 
            className={fieldClass} 
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">Deadline</label>
          <input 
            type="date" 
            value={deadline} 
            onChange={(e) => setDeadline(e.target.value)} 
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
interface ProjectDetailClientProps {
  projectId: string;
  initialSidebarProjects: ProjectListItem[];
  clients: ClientListItem[];
  initialProject: Project;
  initialTasks: TaskWithAssignee[];
  isAdmin: boolean;
}

function findClientInList(clientId: string | null, clients: ClientListItem[]) {
  if (!clientId) return null;
  return clients.find((c) => c.id === clientId) ?? null;
}

export default function ProjectDetailClient({
  projectId,
  initialSidebarProjects,
  clients,
  initialProject,
  initialTasks,
  isAdmin,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const slug = useWorkspaceSlug();
  const [selectedId, setSelectedId] = useState(projectId);
  const [search, setSearch] = useState("");

  const [project, setProject] = useState<Project | null>(initialProject);
  const [client, setClient] = useState<ClientListItem | null>(() => findClientInList(initialProject.client_id, clients));
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks);
  const [sidebarProjects, setSidebarProjects] = useState<ProjectListItem[]>(initialSidebarProjects);
  const [sidebarSearching, setSidebarSearching] = useState(false);
  const [sidebarPage, setSidebarPage] = useState(0);
  const [sidebarHasMore, setSidebarHasMore] = useState(initialSidebarProjects.length === 5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const { openTaskForm } = useTaskForm();

  useEffect(() => {
    if (selectedId === projectId) {
      setTasks(initialTasks);
    }
  }, [initialTasks, selectedId, projectId]);

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of clients) m[c.id] = c.name;
    return m;
  }, [clients]);

  // Fetch sidebar page (search + pagination)
  async function fetchSidebar(page: number, query?: string) {
    setSidebarSearching(true);
    try {
      const results = await searchProjectsForSidebarAction(query ?? search, page);
      setSidebarProjects(results);
      setSidebarPage(page);
      setSidebarHasMore(results.length === 5);
    } finally {
      setSidebarSearching(false);
    }
  }

  // Debounced search — resets to page 0
  useEffect(() => {
    if (!search.trim()) {
      setSidebarProjects(initialSidebarProjects);
      setSidebarPage(0);
      setSidebarHasMore(initialSidebarProjects.length === 5);
      return;
    }
    const timer = setTimeout(() => fetchSidebar(0, search), 300);
    return () => clearTimeout(timer);
  }, [search, initialSidebarProjects]);

  const filteredProjects = sidebarProjects;

  const [loadedId, setLoadedId] = useState(projectId);

  useEffect(() => {
    if (selectedId === loadedId) return;
    async function load() {
      setLoading(true);
      setError(null);
      setEditing(false);
      try {
        const [proj, t] = await Promise.all([
          getProjectById(selectedId),
          getTasksWithAssignees(selectedId),
        ]);
        setProject(proj);
        setClient(findClientInList(proj.client_id, clients));
        setTasks(t);
        setLoadedId(selectedId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedId, loadedId, clients]);

  function selectProject(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    window.history.replaceState(null, "", `/${slug}/projects/${id}`);
  }

  const cfg = project ? getStatusConfig(project.status) : getStatusConfig(null);
  const StatusIcon = cfg.icon;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = project?.deadline && new Date(project.deadline) < today && project.status !== "completed";
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">
      
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          {/* Native anchor — sidebar's replaceState() breaks Next.js client nav.
              See TaskDetailClient back button for details. */}
          <a
            href={`/${slug}/projects`}
            className="p-2 sm:p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)] transition-colors duration-150"
            title="Back to Projects"
          >
            <ArrowLeft size={16} />
          </a>
          <div className="w-px h-5 bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <FolderKanban size={16} className="text-[var(--accent)]" />
            <h1 className="text-[15px] font-medium text-[var(--text-primary)]">Project Details</h1>
          </div>
        </div>
        {selectedId && (
          <Link
            href={`/${slug}/projects/${selectedId}/board`}
            className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-[13px] font-medium
              text-[var(--text-muted)] hover:text-[var(--text-primary)]
              border border-[var(--border-default)] hover:bg-[var(--hover-default)]
              transition-colors duration-150"
            title="Open project board"
          >
            <Layers size={14} />
            <span className="hidden sm:inline">Board</span>
          </Link>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          
          {/* Project sidebar and content - 2 column layout */}
          <div className="flex gap-6 items-start">
            
            {/* Left sidebar - Project list */}
            <aside className="hidden lg:block w-[320px] shrink-0">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden sticky top-6">
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={14} className="text-[var(--accent)]" />
                    <h2 className="text-[13px] font-medium text-[var(--text-primary)]">All Projects</h2>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-faint)]" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search projects..."
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
                  ) : filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <FolderKanban className="h-8 w-8 text-[var(--text-disabled)]" />
                      <p className="text-[12px] text-[var(--text-faint)]">No projects found</p>
                    </div>
                  ) : (
                    filteredProjects.map((p) => {
                      const pCfg = getStatusConfig(p.status);
                      const isActive = p.id === selectedId;
                      return (
                        <button
                          key={p.id}
                          onClick={() => selectProject(p.id)}
                          className={[
                            "w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 transition-colors duration-150",
                            isActive
                              ? "bg-[var(--tint-accent)] border-l-2 border-l-[var(--accent)]"
                              : "hover:bg-[var(--hover-default)]",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={[
                              "text-[13px] font-medium truncate",
                              isActive ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                            ].join(" ")}>
                              {p.name}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${pCfg.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${pCfg.dot}`} />
                              {pCfg.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-[var(--text-faint)] truncate">
                              {p.client_id ? clientMap[p.client_id] ?? "No client" : "No client"}
                            </span>
                            {p.total_value != null && (
                              <span className="text-[var(--text-muted)] font-medium tabular-nums">
                                {formatCurrency(p.total_value)}
                              </span>
                            )}
                          </div>
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

            {/* Right panel - Project detail */}
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
              ) : error || !project ? (
                <div className="rounded-xl bg-[var(--tint-red)] border border-[var(--tint-red-border)] p-6">
                  <p className="text-[13px] text-[var(--priority-urgent)]">{error ?? "Project not found."}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Project header card */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon size={16} className={cfg.text} />
                            <h1 className="text-xl font-medium text-[var(--text-primary)] truncate">
                              {project.name}
                            </h1>
                          </div>
                          {client && (
                            <Link 
                              href={`/${slug}/clients/${client.id}`}
                              className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"
                            >
                              <Briefcase size={12} />
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
                          project={project} 
                          clients={clients} 
                          onSave={(updated) => { 
                            setProject(updated); 
                            setClient(findClientInList(updated.client_id, clients)); 
                            setEditing(false); 
                          }} 
                          onCancel={() => setEditing(false)} 
                        />
                      ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-[var(--border-subtle)]">
                          <div>
                            <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">Deadline</p>
                            <div className="flex items-center gap-1.5">
                              <Calendar size={14} className={isOverdue ? "text-[var(--priority-urgent)]" : "text-[var(--text-faint)]"} />
                              <span className={`text-[13px] font-medium ${isOverdue ? "text-[var(--priority-urgent)]" : "text-[var(--text-primary)]"}`}>
                                {project.deadline ? formatDate(project.deadline) : "No deadline"}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">Total Value</p>
                            <div className="flex items-center gap-1.5">
                              <DollarSign size={14} className="text-[var(--text-faint)]" />
                              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                {project.total_value != null ? formatCurrency(project.total_value) : "—"}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">Task Progress</p>
                            <div className="flex items-center gap-1.5">
                              <CheckSquare size={14} className="text-[var(--text-faint)]" />
                              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                {doneTasks}/{totalTasks} completed
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] mb-1.5">Completion</p>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-[var(--text-faint)]">{progressPercent}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tasks section */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2">
                        <CheckSquare size={14} className="text-[var(--accent)]" />
                        <h2 className="text-[13px] font-medium text-[var(--text-primary)]">Tasks</h2>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--border-subtle)] text-[var(--text-faint)]">
                          {totalTasks}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => openTaskForm(selectedId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors duration-150"
                        >
                          <Plus size={12} /> Add Task
                        </button>
                      )}
                    </div>

                    {tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <CheckSquare size={32} className="text-[var(--text-disabled)]" />
                        <p className="text-[13px] text-[var(--text-faint)]">No tasks yet for this project</p>
                        {isAdmin && (
                          <button
                            onClick={() => openTaskForm(selectedId)}
                            className="text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          >
                            Create your first task →
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {tasks.map((task) => {
                          const tstatus = (task.status ?? "todo") as keyof typeof TASK_STATUS_STYLES;
                          const tpriority = (task.priority ?? "normal") as keyof typeof PRIORITY_STYLES;
                          return (
                            <div key={task.id}>
                              <button
                                onClick={() => router.push(`/${slug}/tasks/${task.id}`)}
                                className="flex w-full items-center gap-3 px-4 sm:px-6 py-3.5 text-left transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate mb-1">
                                    {task.title}
                                  </p>
                                  {task.due_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar size={10} className="text-[var(--text-faint)]" />
                                      <span className="text-[11px] text-[var(--text-faint)]">
                                        {formatDate(task.due_date)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <span className={`shrink-0 hidden sm:inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLES[tpriority]}`}>
                                  {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : "Normal"}
                                </span>
                                <span className={`shrink-0 inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${TASK_STATUS_STYLES[tstatus]}`}>
                                  {TASK_STATUS_LABELS[tstatus] ?? task.status}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}