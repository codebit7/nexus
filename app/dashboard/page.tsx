import type { Metadata } from "next";
import {
  getRecentTasksWithAssignees,
  getRecentTasksWithAssigneesByMember,
  getTaskStats,
  getTaskStatsByMember,
} from "@/lib/db/tasks";
import { getProjects, getProjectsByMember } from "@/lib/db/projects";
import { getRequestSession } from "@/lib/db/session";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

// ❌ DELETE this function entirely
// function greeting() {
//   const h = new Date().getHours();
//   if (h < 12) return "Good morning";
//   if (h < 17) return "Good afternoon";
//   if (h < 21) return "Good evening";
//   return "Good night";
// }

export default async function DashboardPage() {
  const { user, member } = await getRequestSession();
  const isAdmin = member?.user_role === 'admin';
  const memberId = member?.id ?? '';

  // If no team_members row exists yet (e.g. DB trigger hasn't completed after
  // signup), return empty data rather than querying with an invalid empty ID.
  const hasMember = Boolean(member);

  const [recentTasks, taskStats, projects] = await Promise.all([
    !hasMember
      ? []
      : isAdmin
        ? getRecentTasksWithAssignees(5)
        : getRecentTasksWithAssigneesByMember(memberId, 5),
    !hasMember
      ? { total: 0, done: 0, overdue: 0, dueSoon: 0 }
      : isAdmin
        ? getTaskStats()
        : getTaskStatsByMember(memberId),
    !hasMember
      ? []
      : isAdmin
        ? getProjects()
        : getProjectsByMember(memberId),
  ]);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  // ❌ DELETE this line
  // const greetingText = greeting();

  return (
    <DashboardClient
      recentTasks={recentTasks}
      taskStats={taskStats}
      projects={projects}
      userName={member?.name ?? null}
      dateLabel={dateLabel}
      // ❌ REMOVE this prop
      // greetingText={greetingText}
    />
  );
}