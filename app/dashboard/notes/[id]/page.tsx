import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getRequestSession } from "@/lib/db/session";
import { getTeamMembers } from "@/lib/db/team-members";
import { getProjectsForList, getProjectsForListByMember } from "@/lib/db/projects";
import { getMeetingNoteById } from "@/lib/db/meeting-notes";
import ReviewClient from "./ReviewClient";

export const metadata: Metadata = { title: "Review tasks" };
export const dynamic = "force-dynamic";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewMeetingNotesPage({ params }: ReviewPageProps) {
  const { id } = await params;

  const { member, isAdmin } = await getRequestSession();
  if (!member?.org_id) redirect("/setup-org");

  // Reading the draft here is what makes a refresh safe — the parse result was
  // saved before the user got to this page, so reloading costs nothing.
  const note = await getMeetingNoteById(id);
  if (!note) notFound();

  const [projects, teamMembers] = await Promise.all([
    isAdmin
      ? getProjectsForList().catch(() => [])
      : getProjectsForListByMember(member.id).catch(() => []),
    getTeamMembers().catch(() => []),
  ]);

  return (
    <ReviewClient
      note={{
        id: note.id,
        title: note.title,
        status: note.status,
        taskCount: note.task_count,
        projectId: note.project_id,
        purged: note.purged_at !== null,
        tasks: note.parsed_tasks ?? [],
      }}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}
