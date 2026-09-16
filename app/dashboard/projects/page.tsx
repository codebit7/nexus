import type { Metadata } from "next";
import { getProjectsPaginated, getProjectsByMemberPaginated } from "@/lib/db/projects";

export const metadata: Metadata = { title: "Projects" };
import { getClients, getClientsByMember } from "@/lib/db/clients";
import {
  getTaskCountsByProject,
  getTaskCountsByProjectFiltered,
} from "@/lib/db/tasks";
import { getRequestSession } from "@/lib/db/session";
import ProjectsClient from "./ProjectsClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 5;

export default async function ProjectsPage() {
  const { user, member } = await getRequestSession();
  const isAdmin = member?.user_role === 'admin';
  const memberId = member?.id ?? '';
  const hasMember = Boolean(member);

  const { data: projects, total: totalProjects } = !hasMember
    ? { data: [], total: 0 }
    : isAdmin
      ? await getProjectsPaginated(0, PAGE_SIZE)
      : await getProjectsByMemberPaginated(memberId, 0, PAGE_SIZE);

  // For task counts: admin gets all, member gets only their projects
  const projectIds = projects.map((p) => p.id);
  const [clients, taskCounts] = await Promise.all([
    !hasMember
      ? []
      : isAdmin ? getClients() : getClientsByMember(memberId),
    !hasMember
      ? {}
      : isAdmin
        ? getTaskCountsByProject()
        : getTaskCountsByProjectFiltered(projectIds),
  ]);

  return (
    <ProjectsClient
      initialProjects={projects}
      totalProjects={totalProjects}
      clients={clients}
      taskCounts={taskCounts}
      isAdmin={isAdmin}
    />
  );
}
