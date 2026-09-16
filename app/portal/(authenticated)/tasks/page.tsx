import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  Layers,
  CheckSquare,
  MessageSquare,
  Copy,
} from "lucide-react";
import { getPortalTasks, getPortalTaskStatuses, type PortalTask } from "@/lib/db/portal";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "#e5484d",
  high: "#e79d13",
  normal: "#5e6ad2",
  low: "#8a8a8a",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "#888888" },
  in_progress: { label: "In Progress", color: "#5e6ad2" },
  done: { label: "Done", color: "#26c97f" },
};

function StatusDot({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.2" />
      <circle cx="8" cy="8" r="3" fill={color} opacity="0.5" />
    </svg>
  );
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function PortalTaskCard({ task }: { task: PortalTask }) {
  const isHighPriority = task.priority === "urgent" || task.priority === "high";

  return (
    <Link
      href={`/portal/tasks/${task.id}`}
      className="group relative rounded-[10px] cursor-pointer select-none block
        bg-[var(--bg-card)] border border-[var(--border-default)]
        hover:border-[var(--border-hover)]
        transition-colors duration-150"
    >
      {isHighPriority && (
        <div
          className="absolute top-[6px] left-[6px] w-[6px] h-[6px] rounded-full z-10"
          style={{
            background: task.priority === "urgent" ? "#e5484d" : "#e79d13",
          }}
        />
      )}

      <div className="px-4 pt-4 pb-3">
        <p className="text-[13.5px] text-[var(--text-secondary)] leading-[1.4]">
          {task.title}
        </p>

        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-2">
            {task.assignee && (
              <div className="flex items-center gap-1.5">
                {task.assignee.avatar_url ? (
                  <Image
                    src={task.assignee.avatar_url}
                    alt={task.assignee.name}
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded-full object-cover"
                  />
                ) : (
                  <div className="w-[18px] h-[18px] rounded-full bg-[var(--tint-accent-strong)] flex items-center justify-center">
                    <span className="text-[8px] font-medium text-[var(--accent)]">
                      {task.assignee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
            )}
            {task.due_date && (
              <span className={`flex items-center gap-1 text-[11px] ${isOverdue(task.due_date) ? "text-[var(--priority-urgent)]" : "text-[var(--text-faint)]"}`}>
                <CalendarDays size={11} />
                {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px] text-[var(--text-disabled)]">
            <MessageSquare size={12} />
            <span>{task.comment_count ?? 0}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function PortalTasksPage() {
  const cookieStore = cookies();
  const clientId = cookieStore.get("portal_client_id")?.value;
  if (!clientId) redirect("/portal/login");

  const [tasks, statuses] = await Promise.all([
    getPortalTasks(clientId),
    getPortalTaskStatuses(clientId),
  ]);

  const columns = statuses.length > 0
    ? statuses.map((s) => ({ id: s.slug, label: s.label, color: s.color }))
    : [
        { id: "todo", ...STATUS_CONFIG.todo },
        { id: "in_progress", ...STATUS_CONFIG.in_progress },
        { id: "done", ...STATUS_CONFIG.done },
      ];

  const totalTasks = tasks.length;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Layers size={16} className="text-[var(--text-faint)]" />
          <div>
            <h1 className="text-[15px] font-medium text-[var(--text-primary)]">Tasks</h1>
            <p className="text-[11px] text-[var(--text-faint)] mt-0.5">{totalTasks} total tasks</p>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] mb-4">
              <CheckSquare className="h-6 w-6 text-[var(--text-faint)]" />
            </div>
            <p className="text-[13px] text-[var(--text-muted)] mb-2">No tasks yet</p>
            <p className="text-[12px] text-[var(--text-fainter)] leading-[1.6]">
              Your project tasks will appear here once they&apos;re created.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full min-w-full">
            {columns.map((col, colIdx) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
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
                  {/* Column header */}
                  <div className="flex items-center justify-between px-4 h-[42px] shrink-0">
                    <div className="flex items-center gap-2">
                      <StatusDot color={col.color} />
                      <span className="text-[13px] text-[var(--text-muted)]">{col.label}</span>
                      {colTasks.length > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-[18px]
                          px-1.5 rounded-full text-[10px] font-medium tabular-nums
                          bg-[var(--tint-red)] text-[var(--priority-urgent)]">
                          {colTasks.length}/{totalTasks}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card list */}
                  <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-2 pb-4 flex flex-col gap-3">
                    {colTasks.map((task) => (
                      <PortalTaskCard key={task.id} task={task} />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="px-1 pt-2">
                        <p className="text-[13px] text-[var(--text-muted)] mb-1">{col.label}</p>
                        <p className="text-[12px] text-[var(--text-fainter)] leading-[1.6]">
                          Tasks will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
