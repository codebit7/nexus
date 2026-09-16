"use client";

import Link from "next/link";
import {
  Plus,
  Layers,
  CheckCircle,
  AlertCircle,
  Calendar,
  Briefcase,
  Clock,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTaskForm } from "./task-form-context";
import { useWorkspaceSlug } from "@/app/dashboard/workspace-context";
import type { TaskWithAssignee } from "@/lib/db/tasks";
import type { Project } from "@/lib/types";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  todo:        { bg: 'var(--border-subtle)',       text: 'var(--text-muted)',  dot: 'var(--text-muted)' },
  in_progress: { bg: 'var(--tint-accent-strong)',  text: 'var(--accent)',      dot: 'var(--accent)' },
  done:        { bg: 'var(--tint-green)',          text: 'var(--status-done)', dot: 'var(--status-done)' },
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'var(--priority-urgent)',
  high:   'var(--priority-high)',
  normal: 'var(--accent)',
  low:    'var(--text-muted)',
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.todo;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: colors.bg, color: colors.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.dot }} />
      {status.replace('_', ' ')}
    </span>
  );
}

interface TaskStats {
  total: number;
  done: number;
  overdue: number;
  dueSoon: number;
}

interface DashboardClientProps {
  recentTasks: TaskWithAssignee[];
  taskStats: TaskStats;
  projects: Project[];
  userName: string | null;
  dateLabel: string;
}

export default function DashboardClient({ 
  recentTasks, 
  taskStats, 
  projects, 
  userName, 
  dateLabel 
}: DashboardClientProps) {
  const { openTaskForm } = useTaskForm();
  const slug = useWorkspaceSlug();

  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "in_progress");
  const completionPct = taskStats.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Layers size={16} className="text-[var(--text-faint)]" />
          <div className="leading-none">
            <h1 className="text-[15px] font-medium text-[var(--text-primary)] leading-tight">Dashboard</h1>
            <p className="text-[11px] text-[var(--text-faint)] mt-1 leading-none">{dateLabel}</p>
          </div>
        </div>
        <button
          onClick={() => openTaskForm()}
          className="flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium
            bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors duration-150"
        >
          <Plus size={14} />
          New Task
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          
          {/* Welcome section */}
          <div className="mb-8">
            <h2 className="text-[20px] font-medium text-[var(--text-primary)] tracking-tight">
              Welcome back{userName ? `, ${userName}!` : ''}
            </h2>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {/* Total Tasks */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 rounded-md bg-[var(--tint-accent)]">
                  <Layers size={14} className="text-[var(--accent)]" />
                </div>
                <span className="text-[11px] text-[var(--text-faint)]">Total</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--text-primary)] mb-1">{taskStats.total}</p>
              <p className="text-[11px] text-[var(--text-faint)]">Tasks</p>
            </div>

            {/* Completion Rate */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 rounded-md bg-[var(--tint-green)]">
                  <CheckCircle size={14} className="text-[var(--status-done)]" />
                </div>
                <span className="text-[11px] text-[var(--text-faint)]">Progress</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--text-primary)] mb-1">{completionPct}%</p>
              <p className="text-[11px] text-[var(--text-faint)]">Complete</p>
              <div className="mt-2 h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            {/* Active Projects */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 rounded-md bg-[var(--tint-accent)]">
                  <Briefcase size={14} className="text-[var(--accent)]" />
                </div>
                <span className="text-[11px] text-[var(--text-faint)]">Active</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--text-primary)] mb-1">{activeProjects.length}</p>
              <p className="text-[11px] text-[var(--text-faint)]">Projects</p>
            </div>

            {/* Overdue */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 rounded-md bg-[var(--tint-red)]">
                  <AlertCircle size={14} className="text-[var(--priority-urgent)]" />
                </div>
                <span className="text-[11px] text-[var(--text-faint)]">Attention</span>
              </div>
              <p className="text-[24px] font-medium text-[var(--priority-urgent)] mb-1">{taskStats.overdue}</p>
              <p className="text-[11px] text-[var(--text-faint)]">Overdue tasks</p>
            </div>
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

            {/* Recent Tasks */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden flex-1 flex flex-col">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[var(--accent)]" />
                    <h3 className="text-[13px] font-medium text-[var(--text-primary)]">Recent Tasks</h3>
                  </div>
                  <Link 
                    href={`/${slug}/tasks`}
                    className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors flex items-center gap-1"
                  >
                    View all
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {recentTasks.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[13px] text-[var(--text-muted)] mb-2">No tasks yet</p>
                    <button
                      onClick={() => openTaskForm()}
                      className="text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)]"
                    >
                      Create your first task →
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {recentTasks.map((task) => {
                      const isHighPriority = task.priority === "urgent" || task.priority === "high";
                      
                      return (
                        <Link 
                          key={task.id} 
                          href={`/${slug}/tasks/${task.id}`}
                          className="group block px-5 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            {isHighPriority && (
                              <div 
                                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                style={{ background: PRIORITY_DOT[task.priority ?? 'normal'] }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
                                {task.title}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <StatusBadge status={task.status ?? 'todo'} />
                                {task.due_date && (
                                  <span className="flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
                                    <Calendar size={10} />
                                    {formatDate(task.due_date)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
                                  <MessageSquare size={10} />
                                  0
                                </span>
                              </div>
                            </div>
                            {task.assignee && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 rounded-full bg-[var(--tint-accent-strong)]
                                  flex items-center justify-center">
                                  <span className="text-[10px] font-medium text-[var(--accent)]">
                                    {task.assignee.name.slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">

              {/* Quick Actions */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
                <h3 className="text-[13px] font-medium text-[var(--text-primary)] mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => openTaskForm()}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                      text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]
                      transition-colors duration-150"
                  >
                    <Plus size={12} className="text-[var(--accent)]" />
                    Create New Task
                  </button>
                  <Link
                    href={`/${slug}/projects`}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                      text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]
                      transition-colors duration-150"
                  >
                    <Briefcase size={12} className="text-[var(--accent)]" />
                    View All Projects
                  </Link>
                </div>
              </div>

              {/* Active Projects List */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-medium text-[var(--text-primary)]">Active Projects</h3>
                  <Link 
                    href={`/${slug}/projects`}
                    className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)]"
                  >
                    Manage →
                  </Link>
                </div>
                
                {activeProjects.length === 0 ? (
                  <p className="text-[12px] text-[var(--text-faint)] text-center py-3">No active projects</p>
                ) : (
                  <div className="space-y-2">
                    {activeProjects.slice(0, 4).map((project) => (
                      <Link 
                        key={project.id}
                        href={`/${slug}/projects/${project.id}`}
                        className="flex items-center justify-between py-1.5 group"
                      >
                        <span className="text-[12px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                          {project.name}
                        </span>
                        <ArrowRight size={10} className="text-[var(--text-disabled)] group-hover:text-[var(--accent)]" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Tasks */}
              {taskStats.dueSoon > 0 && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={12} className="text-[var(--priority-high)]" />
                    <h3 className="text-[13px] font-medium text-[var(--text-primary)]">Due This Week</h3>
                  </div>
                  <p className="text-[20px] font-medium text-[var(--priority-high)] mb-1">{taskStats.dueSoon}</p>
                  <p className="text-[11px] text-[var(--text-faint)]">Tasks need attention</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}