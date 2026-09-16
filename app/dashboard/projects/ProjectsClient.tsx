"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Layers,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  ChevronRight,
  FolderKanban,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { useWorkspaceSlug } from "@/app/dashboard/workspace-context";
import { createProjectAction, fetchProjectsPageAction } from "@/app/dashboard/projects/actions";
import { formatDate, formatCurrency } from "@/lib/utils";
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
import type { Project, Client } from "@/lib/types";
import { Pagination } from "@/components/layout/Pagination";

const PAGE_SIZE = 5;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: any }> = {
  active: {
    label: "Active",
    bg: 'rgba(38,201,127,0.12)',
    text: '#26c97f',
    dot: '#26c97f',
    icon: CheckCircle
  },
  in_progress: {
    label: "In Progress",
    bg: 'rgba(94,106,210,0.12)',
    text: '#5e6ad2',
    dot: '#5e6ad2',
    icon: Clock
  },
  completed: {
    label: "Completed",
    bg: 'rgba(136,136,136,0.12)',
    text: '#888',
    dot: '#888',
    icon: CheckCircle
  },
  paused: {
    label: "Paused",
    bg: 'rgba(231,157,19,0.12)',
    text: '#e79d13',
    dot: '#e79d13',
    icon: AlertCircle
  },
};

function StatusBadge({ status }: { status: string | null }) {
  const config = STATUS_CONFIG[status ?? 'active'] ?? STATUS_CONFIG.active;

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: config.bg, color: config.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  );
}

interface NewProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onSuccess: (project: Project) => void;
}

function NewProjectDialog({ open, onOpenChange, clients, onSuccess }: NewProjectFormProps) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("active");
  const [deadline, setDeadline] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(""); setClientId(""); setStatus("active");
    setDeadline(""); setTotalValue(""); setNameError(""); setSubmitError(null);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError("Name is required"); return; }
    setNameError("");
    setSubmitting(true);
    setSubmitError(null);
    try {
      const project = await createProjectAction({
        name: name.trim(),
        client_id: clientId || null,
        status,
        deadline: deadline || null,
        total_value: totalValue ? Math.max(0, parseFloat(totalValue)) : null,
      });
      onOpenChange(false);
      // Hand the saved row up so the list can show it without asking the server
      // for it a second time.
      onSuccess(project);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = `w-full px-3 py-2 rounded-lg
    bg-[var(--bg-input)] border border-[var(--border-default)]
    text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)]
    focus:outline-none focus:border-[var(--accent-border)]
    focus:ring-1 focus:ring-[var(--accent-ring)]
    transition-colors duration-150`;

  const selectTriggerClass = `w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)]
    h-[42px] text-[13px] text-[var(--text-primary)]
    focus:ring-1 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-border)]
    data-[placeholder]:text-[var(--text-faint)]`;
  const selectContentClass = "bg-[var(--bg-sidebar)] border-[var(--border-default)] text-[var(--text-primary)]";
  const selectItemClass = "text-[13px] text-[var(--text-muted)] focus:bg-[var(--tint-accent)] focus:text-[var(--accent)] cursor-pointer";

  const labelClass = "block text-[11px] font-medium text-[var(--text-muted)] mb-1.5";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="
        bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-xl
        shadow-[var(--shadow-modal)] p-0 gap-0 w-[calc(100vw-24px)] max-w-[560px]
        max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 sm:pt-6 pb-4
          border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FolderKanban size={16} className="text-[var(--accent)]" />
              New Project
            </h3>
            <p className="text-[11px] text-[var(--text-faint)] mt-1">Create a new project to track work</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-4 sm:px-6 py-5 space-y-4">
            <div>
              <label className={labelClass}>
                Project Name <span className="text-[var(--priority-urgent)]">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Website Redesign"
                className={inputClass}
                autoFocus
              />
              {nameError && <p className="mt-1 text-[11px] text-[var(--priority-urgent)]">{nameError}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1">
                    <Briefcase size={12} className="text-[var(--accent)]" />
                    Client
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
                <label className={labelClass}>
                  <span className="flex items-center gap-1">
                    <Layers size={12} className="text-[var(--accent)]" />
                    Status
                  </span>
                </label>
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
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
                            <span style={{ color: cfg.text }}>{cfg.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-[var(--accent)]" />
                    Deadline
                  </span>
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} className="text-[var(--accent)]" />
                    Total Value
                  </span>
                </label>
                <input
                  type="number"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {submitError && (
            <div className="mx-6 mb-4 rounded-lg px-4 py-2.5 text-[12px] text-[var(--priority-urgent)]
              bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
              {submitError}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3
            px-4 sm:px-6 py-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-[13px] font-medium text-[var(--text-muted)]
                hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)] transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-[13px] font-medium
                bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
                active:scale-[0.98] transition-[color,background-color,border-color,transform] duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectsClientProps {
  initialProjects: Project[];
  totalProjects: number;
  clients: Client[];
  taskCounts: Record<string, { total: number; done: number }>;
  isAdmin: boolean;
}

export default function ProjectsClient({ 
  initialProjects, 
  totalProjects, 
  clients, 
  taskCounts: initialTaskCounts, 
  isAdmin 
}: ProjectsClientProps) {
  const router = useRouter();
  const slug = useWorkspaceSlug();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [total, setTotal] = useState(totalProjects);
  const [taskCounts, setTaskCounts] = useState(initialTaskCounts);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setProjects(initialProjects);
    setTotal(totalProjects);
    setTaskCounts(initialTaskCounts);
    setCurrentPage(0);
  }, [initialProjects, totalProjects, initialTaskCounts]);

  const fetchPage = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const result = await fetchProjectsPageAction(page, PAGE_SIZE);
      setProjects(result.projects);
      setTotal(result.total);
      setTaskCounts(result.taskCounts);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  }, []);

  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter projects (client-side search/status on the current page)
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats from current page data
  const activeProjects = projects.filter(p => p.status === "active" || p.status === "in_progress").length;
  const totalTasks = Object.values(taskCounts).reduce((sum, counts) => sum + counts.total, 0);
  const completedTasks = Object.values(taskCounts).reduce((sum, counts) => sum + counts.done, 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // createProjectAction already revalidated server-side, so re-fetching the page
  // and then refreshing the route were both duplicates the user waited through.
  // A brand-new project has no tasks, so its counts are known without a query.
  async function handleProjectCreated(project: Project) {
    if (currentPage !== 0) {
      await fetchPage(0);
      return;
    }
    // Never trim back to PAGE_SIZE here — that silently dropped a row once the
    // page was full, so creating a second project made one disappear from the
    // list. Show every row, and only re-read the page when it has genuinely
    // overflowed.
    const overflowed = projects.length + 1 > PAGE_SIZE;
    setProjects((prev) => [project, ...prev]);
    setTaskCounts((prev) => ({ ...prev, [project.id]: { total: 0, done: 0 } }));
    setTotal((t) => t + 1);
    if (overflowed) await fetchPage(0);
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <FolderKanban size={16} className="text-[var(--accent)]" />
          <h1 className="text-[15px] font-medium text-[var(--text-primary)]">Projects</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setNewProjectOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium
              bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-[color,background-color,border-color,transform] duration-150
              active:scale-[0.98]"
          >
            <Plus size={14} />
            New Project
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">

          {/* Stats cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4 hover:border-[var(--border-medium)] transition-colors duration-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-[var(--tint-green)]">
                  <CheckCircle size={14} className="text-[var(--status-done)]" />
                </div>
                <span className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wide">Active Projects</span>
              </div>
              <p className="text-[28px] font-semibold text-[var(--text-primary)]">{activeProjects}</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">Out of {total} total</p>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4 hover:border-[var(--border-medium)] transition-colors duration-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-[var(--tint-accent)]">
                  <Layers size={14} className="text-[var(--accent)]" />
                </div>
                <span className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wide">Task Progress</span>
              </div>
              <p className="text-[28px] font-semibold text-[var(--text-primary)]">{overallProgress}%</p>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${overallProgress}%`, background: '#5e6ad2' }}
                />
              </div>
              <p className="text-[11px] text-[var(--text-faint)] mt-2">{completedTasks} of {totalTasks} tasks completed</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                type="text"
                placeholder="Search projects by name or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg
                  bg-[var(--bg-sidebar)] border border-[var(--border-default)]
                  text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]
                  focus:outline-none focus:border-[var(--accent-border)]
                  focus:ring-1 focus:ring-[var(--accent-ring)]
                  transition-colors duration-150"
              />
            </div>
            <div className="flex gap-2">
              {["all", "active", "in_progress", "completed"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-150
                    ${statusFilter === filter
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-hover)]'}`}
                >
                  {filter === "all" ? "All" : filter === "in_progress" ? "In Progress" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Projects Table */}
          {filteredProjects.length === 0 && !loading ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] mb-4">
                <FolderKanban size={32} className="text-[var(--text-disabled)]" />
              </div>
              <p className="text-[13px] text-[var(--text-muted)] mb-2">
                {searchQuery || statusFilter !== "all" ? "No projects found" : "No projects yet"}
              </p>
              <p className="text-[11px] text-[var(--text-faint)]">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "Get started by creating your first project"}
              </p>
              {isAdmin && !searchQuery && statusFilter === "all" && (
                <button
                  onClick={() => setNewProjectOpen(true)}
                  className="inline-flex items-center gap-1.5 mt-4 text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150"
                >
                  <Plus size={12} />
                  Create your first project →
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-input)]">
                      <th className="px-5 py-3.5 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em]">
                        Project
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] hidden sm:table-cell">
                        Client
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] hidden sm:table-cell">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] hidden md:table-cell">
                        Deadline
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.06em] hidden lg:table-cell">
                        Progress
                      </th>
                      <th className="px-5 py-3.5 w-8" />
                    </tr>
                  </thead>
                  <tbody className={loading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : ''}>
                    {filteredProjects.map((project) => {
                      const client = project.client_id ? clientMap.get(project.client_id) : null;
                      const counts = taskCounts[project.id];
                      const total = counts?.total ?? 0;
                      const done = counts?.done ?? 0;
                      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                      const isOverdue = project.deadline && new Date(project.deadline) < today && project.status !== "completed";

                      return (
                        <tr
                          key={project.id}
                          onClick={() => router.push(`/${slug}/projects/${project.id}`)}
                          className="group border-b border-[var(--border-subtle)] last:border-0
                            hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors duration-150"
                        >
                          <td className="px-5 py-4">
                            <div className="min-w-0">
                              <span className="text-[13px] font-medium text-[var(--text-primary)] block truncate group-hover:text-[var(--accent)] transition-colors">
                                {project.name}
                              </span>
                              {project.total_value != null && (
                                <span className="text-[11px] text-[var(--text-faint)] block mt-0.5">
                                  {formatCurrency(project.total_value)}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="text-[12px] text-[var(--text-muted)]">
                              {client?.name || <span className="text-[var(--text-disabled)]">—</span>}
                            </span>
                          </td>

                          <td className="px-5 py-4 hidden sm:table-cell">
                            <StatusBadge status={project.status} />
                          </td>

                          <td className="px-5 py-4 hidden md:table-cell">
                            {project.deadline ? (
                              <span className={`flex items-center gap-1.5 text-[12px] ${isOverdue ? 'text-[var(--priority-urgent)]' : 'text-[var(--text-faint)]'}`}>
                                <Calendar size={12} className="flex-shrink-0" />
                                {formatDate(project.deadline)}
                              </span>
                            ) : (
                              <span className="text-[12px] text-[var(--text-disabled)]">—</span>
                            )}
                          </td>

                          <td className="px-5 py-4 hidden lg:table-cell">
                            {total > 0 ? (
                              <div className="space-y-1.5 w-28">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-[var(--text-faint)]">{pct}%</span>
                                  <span className="text-[var(--text-faint)]">{done}/{total}</span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-[var(--border-subtle)] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                                    style={{ width: `${pct}%`, background: '#5e6ad2' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[var(--text-disabled)]">No tasks</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <ChevronRight size={14} className="text-[var(--text-disabled)] group-hover:text-[var(--accent)]
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

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        clients={clients}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}