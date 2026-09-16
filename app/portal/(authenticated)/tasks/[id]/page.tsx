import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import {
  getPortalTaskByIdWithProject,
  getPortalComments,
  getPortalFilesByTaskId,
  getPortalTasks,
} from "@/lib/db/portal";
import { getCsrfToken } from "@/lib/csrf";
import PortalTaskDetailClient from "./PortalTaskDetailClient";

export const dynamic = "force-dynamic";

interface PortalTaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalTaskDetailPage({
  params,
}: PortalTaskDetailPageProps) {
  const { id } = await params;
  const cookieStore = cookies();
  const clientId = (await cookieStore).get("portal_client_id")?.value;
  if (!clientId) redirect("/portal/login");

  const [task, comments, files, sidebarTasks] = await Promise.all([
    getPortalTaskByIdWithProject(id, clientId),
    getPortalComments(id, clientId),
    getPortalFilesByTaskId(id, clientId),
    getPortalTasks(clientId),
  ]);

  if (!task) notFound();

  const { projectName, ...taskData } = task;
  const csrfToken = getCsrfToken() ?? "";

  return (
    <PortalTaskDetailClient
      task={taskData}
      comments={comments}
      files={files}
      sidebarTasks={sidebarTasks}
      projectName={projectName}
      clientId={clientId}
      csrfToken={csrfToken}
    />
  );
}
