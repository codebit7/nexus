import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRequestSession } from "@/lib/db/session";
import { getProjectsForList, getProjectsForListByMember } from "@/lib/db/projects";
import { getMeetingNotes } from "@/lib/db/meeting-notes";
import NotesClient from "./NotesClient";

export const metadata: Metadata = { title: "Meeting Notes" };
export const dynamic = "force-dynamic";

export default async function MeetingNotesPage() {
  const { member, isAdmin } = await getRequestSession();
  if (!member?.org_id) redirect("/setup-org");

  // Admins may file tasks into any project; members only into the ones they are
  // assigned to. Scoped here rather than in the client so the browser is never
  // sent a list it is not allowed to use.
  const [projects, notes] = await Promise.all([
    isAdmin
      ? getProjectsForList().catch(() => [])
      : getProjectsForListByMember(member.id).catch(() => []),
    // Same reasoning for history: a transcript can hold things not everyone
    // should read, so members see only their own uploads.
    getMeetingNotes(isAdmin ? {} : { memberId: member.id }).catch(() => []),
  ]);

  return (
    <NotesClient
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      notes={notes}
    />
  );
}
