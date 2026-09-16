import { getInvoicesForSidebar, getInvoiceById } from "@/lib/db/invoices";
import { getClientsForList } from "@/lib/db/clients";
import { getRequestSession } from "@/lib/db/session";
import InvoiceDetailClient from "./InvoiceDetailClient";

export const dynamic = "force-dynamic";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;

  const { user, member } = await getRequestSession();
  const isAdmin = member?.user_role === 'admin';

  // Fetch limited sidebar list (20 recent) + specific invoice in parallel
  const [sidebarInvoices, clients, invoice] = await Promise.all([
    getInvoicesForSidebar(5),
    getClientsForList(),
    getInvoiceById(id),
  ]);

  return (
    <InvoiceDetailClient
      invoiceId={id}
      initialSidebarInvoices={sidebarInvoices}
      clients={clients}
      initialInvoice={invoice}
      isAdmin={isAdmin}
    />
  );
}
