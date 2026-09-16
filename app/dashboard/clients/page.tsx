import type { Metadata } from "next";
import { getClientsPaginated, getClientsByMemberPaginated } from "@/lib/db/clients";

export const metadata: Metadata = { title: "Clients" };
import { getProjectsForList, getProjectsForListByMember } from "@/lib/db/projects";
import { getRequestSession } from "@/lib/db/session";
import ClientsClient from "./ClientsClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 5;

export default async function ClientsPage() {
  const { user, member } = await getRequestSession();
  const isAdmin = member?.user_role === 'admin';
  const memberId = member?.id ?? '';
  const hasMember = Boolean(member);

  const [clientsResult, projects] = await Promise.all([
    !hasMember
      ? { data: [], total: 0 }
      : isAdmin
        ? getClientsPaginated(0, PAGE_SIZE)
        : getClientsByMemberPaginated(memberId, 0, PAGE_SIZE),
    !hasMember
      ? []
      : isAdmin ? getProjectsForList() : getProjectsForListByMember(memberId),
  ]);

  return (
    <ClientsClient
      initialClients={clientsResult.data}
      totalClients={clientsResult.total}
      projects={projects}
      isAdmin={isAdmin}
    />
  );
}
