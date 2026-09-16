import { getTaskByIdWithAssignee, getCommentsByTaskId, getFilesByTaskId, getTasksByAssignee } from "@/lib/db/tasks";
import { getProjectById } from "@/lib/db/projects";
import { getTagsForTask } from "@/lib/db/tags";
import { getRequestSession } from "@/lib/db/session";
import TaskDetailClient from "./TaskDetailClient";

export const dynamic = "force-dynamic";

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;

  const { user, member } = await getRequestSession();
  const isAdmin = member?.user_role === 'admin';

  const [task, comments, files, taskTags] = await Promise.all([
    getTaskByIdWithAssignee(id),
    getCommentsByTaskId(id),
    getFilesByTaskId(id),
    getTagsForTask(id).catch(() => []),
  ]);

  // Fetch sidebar tasks for the same assignee + project name in parallel
  const [assigneeTasks, project] = await Promise.all([
    task.assignee_id ? getTasksByAssignee(task.assignee_id) : Promise.resolve([]),
    task.project_id ? getProjectById(task.project_id).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <TaskDetailClient
      task={task}
      initialComments={comments}
      initialFiles={files}
      sidebarTasks={assigneeTasks}
      projectName={project?.name ?? null}
      isAdmin={isAdmin}
      currentMemberId={member?.id}
      initialTags={taskTags}
    />
  );
}
