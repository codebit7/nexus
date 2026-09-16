import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/db/projects";
import { getTasksWithAssignees } from "@/lib/db/tasks";
import { getTaskStatuses } from "@/lib/db/task-statuses";
import { getTagsForTasks } from "@/lib/db/tags";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getRequestSession } from "@/lib/db/session";
import TasksClient from "@/app/dashboard/tasks/TasksClient";

export const metadata: Metadata = { title: "Project Board" };
export const dynamic = "force-dynamic";

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectBoardPage({ params }: BoardPageProps) {
  const { id } = await params;

  const { user, member } = await getRequestSession();
  const isAdmin = member?.user_role === "admin";
  const memberId = member?.id ?? "";

  if (!member?.org_id) notFound();

  // Non-admins must have a project_members row for this project to view the board.
  if (!isAdmin) {
    const { data: membership } = await supabaseAdmin
      .from("project_members")
      .select("id")
      .eq("project_id", id)
      .eq("member_id", member.id)
      .eq("org_id", member.org_id)
      .maybeSingle();
    if (!membership) notFound();
  }

  let project;
  try {
    project = await getProjectById(id);
  } catch {
    notFound();
  }
  if (!project) notFound();

  const [tasks, statuses] = await Promise.all([
    getTasksWithAssignees(id),
    getTaskStatuses(member.org_id, { projectId: id }),
  ]);

  const tagsByTask = tasks.length > 0
    ? await getTagsForTasks(tasks.map((t) => t.id)).catch(() => ({}))
    : {};

  return (
    <TasksClient
      initialTasks={tasks}
      statuses={statuses}
      isAdmin={isAdmin}
      currentMemberId={memberId}
      tagsByTask={tagsByTask}
      project={{ id: project.id, name: project.name }}
    />
  );
}
