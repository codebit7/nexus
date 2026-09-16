"use client";

import Image from "next/image";
import type { Task, TeamMember } from "@/lib/types";
import { CalendarDays, AlertCircle, ArrowUp, Minus, ArrowDown, Lock } from "lucide-react";

export type TaskWithAssignee = Task & {
  assignee?: Pick<TeamMember, "name" | "avatar_url"> | null;
  comment_count?: number;
};

interface TaskCardProps {
  task: TaskWithAssignee;
  onClick?: (task: TaskWithAssignee) => void;
  isDragging?: boolean;
  isLocked?: boolean;
}

const PRIORITY_CONFIG = {
  urgent: {
    label: "Urgent",
    badge: "bg-[var(--tint-red)] text-[var(--priority-urgent)]",
    borderColor: "#e5484d",
    icon: AlertCircle,
  },
  high: {
    label: "High",
    badge: "bg-[var(--tint-orange)] text-[var(--priority-high)]",
    borderColor: "#e79d13",
    icon: ArrowUp,
  },
  normal: {
    label: "Normal",
    badge: "bg-[var(--tint-accent)] text-[var(--accent)]",
    borderColor: "#5e6ad2",
    icon: Minus,
  },
  low: {
    label: "Low",
    badge: "bg-[var(--hover-default)] text-[var(--text-muted)]",
    borderColor: "#888",
    icon: ArrowDown,
  },
} as const;

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function TaskCard({ task, onClick, isDragging = false, isLocked = false }: TaskCardProps) {
  const priority = (task.priority as keyof typeof PRIORITY_CONFIG) ?? "normal";
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
  const PriorityIcon = config.icon;
  const overdue = isOverdue(task.due_date);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(task)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(task); } }}
      className={[
        "group relative flex flex-col gap-3 rounded-lg p-4",
        "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
        "border-l-[3px]",
        "select-none",
        isLocked ? "cursor-default opacity-60" : "cursor-pointer",
        isLocked ? "" : "hover:bg-[var(--bg-elevated)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
        isLocked ? "" : "active:scale-[0.99]",
        "transition-colors duration-150",
        isDragging ? "opacity-80 rotate-1 scale-[1.02] shadow-[var(--shadow-lg)]" : "",
      ].join(" ")}
      style={{ borderLeftColor: config.borderColor }}
    >
      {/* Title + priority badge */}
      <div className="flex items-start justify-between gap-3">
        <p className={[
          "text-[13px] font-medium leading-snug tracking-[-0.01em] line-clamp-2",
          isLocked ? "text-[var(--text-faint)]" : "text-[var(--text-primary)]",
        ].join(" ")}>
          {task.title}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {isLocked && (
            <Lock className="h-3 w-3 text-[var(--text-disabled)]" />
          )}
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium ${config.badge}`}>
            <PriorityIcon className="h-2.5 w-2.5" />
            {config.label}
          </span>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-[12px] leading-relaxed text-[var(--text-faint)] line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer: assignee + due date */}
      <div className="flex items-center justify-between gap-2">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            {task.assignee.avatar_url ? (
              <Image
                src={task.assignee.avatar_url}
                alt={task.assignee.name}
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--tint-accent-strong)]">
                <span className="text-[9px] font-medium text-[var(--accent)]">
                  {getInitials(task.assignee.name)}
                </span>
              </div>
            )}
            <span className="text-[11px] text-[var(--text-muted)]">{task.assignee.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full border border-dashed border-[var(--border-medium)]" />
            <span className="text-[11px] text-[var(--text-faint)]">Unassigned</span>
          </div>
        )}

        {task.due_date && (
          <div className={`flex items-center gap-1 text-[11px] font-medium ${overdue ? "text-[var(--priority-urgent)]" : "text-[var(--text-faint)]"}`}>
            <CalendarDays className="h-3 w-3" />
            <span>
              {new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskCard;
