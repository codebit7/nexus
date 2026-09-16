import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getClientByIdForPortal } from "@/lib/db/clients";
import PortalSidebar from "@/components/portal/PortalSidebar";

export default async function PortalAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const clientId = cookieStore.get("portal_client_id")?.value;

  if (!clientId) {
    redirect("/portal/login");
  }

  let clientName = "Client";
  try {
    const client = await getClientByIdForPortal(clientId);
    clientName = client.name;
  } catch {
    // If client lookup fails, still allow access — name is cosmetic only
  }

  return (
    <div className="flex h-screen bg-[var(--bg-page)] overflow-hidden">
      <PortalSidebar clientName={clientName} />
      <main className="flex-1 flex flex-col overflow-hidden pt-12 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
