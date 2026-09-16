import type { Metadata } from "next";
import { getTasksWithAssignees, getTasksWithAssigneesByMember } from "@/lib/db/tasks";
import { getProjectsForList } from "@/lib/db/projects";
import { getTaskStatuses } from "@/lib/db/task-statuses";
import { getTagsForTasks } from "@/lib/db/tags";

export const metadata: Metadata = { title: "Tasks" };
import { getRequestSession } from "@/lib/db/session";
import TasksClient from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { user, member } = await getRequestSession();
  const isAdmin = member?.user_role === 'admin';
  const memberId = member?.id ?? '';
  const hasMember = Boolean(member);

  const [tasks, projects, allStatuses] = await Promise.all([
    !hasMember
      ? Promise.resolve([])
      : isAdmin
        ? getTasksWithAssignees()
        : getTasksWithAssigneesByMember(memberId),
    hasMember ? getProjectsForList() : Promise.resolve([]),
    hasMember ? getTaskStatuses(member!.org_id!, "all") : Promise.resolve([]),
  ]);

  // Build a project name map for the client
  const projectMap: Record<string, string> = {};
  for (const p of projects) {
    projectMap[p.id] = p.name;
  }

  // Global page columns:
  //  1. Always show org-wide statuses (project_id IS NULL).
  //  2. Also show a project-scoped status IF at least one visible task uses it
  //     — otherwise tasks with project-scoped statuses silently disappear from
  //     this page even though they still exist.
  //  3. Arrange as: [org-wide minus Done] → [project-scoped used] → [Done last].
  const usedSlugs = new Set(tasks.map((t) => t.status).filter(Boolean) as string[]);
  const orgWide = allStatuses
    .filter((s) => s.project_id === null)
    .sort((a, b) => a.position - b.position);
  const scopedUsed = allStatuses
    .filter((s) => s.project_id !== null && usedSlugs.has(s.slug))
    .sort((a, b) =>
      (a.project_id ?? "").localeCompare(b.project_id ?? "") || a.position - b.position,
    );
  const doneIdx = orgWide.findIndex((s) => s.slug === "done");
  const orgWideWithoutDone = doneIdx >= 0
    ? orgWide.filter((_, i) => i !== doneIdx)
    : orgWide;
  const done = doneIdx >= 0 ? [orgWide[doneIdx]] : [];
  const statuses = [...orgWideWithoutDone, ...scopedUsed, ...done];

  // Bulk-fetch tags for every visible task so kanban cards can render pills
  // without N+1 round-trips.
  const tagsByTask = tasks.length > 0
    ? await getTagsForTasks(tasks.map((t) => t.id)).catch(() => ({}))
    : {};

  return (
    <TasksClient
      initialTasks={tasks}
      statuses={statuses}
      isAdmin={isAdmin}
      currentMemberId={memberId}
      projectMap={projectMap}
      tagsByTask={tagsByTask}
    />
  );
}
