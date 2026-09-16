import { getRequestSession } from "@/lib/db/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import DashboardShell from "./DashboardShell";
import { WorkspaceSlugProvider } from "./workspace-context";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let isAdmin = false;
  let currentMemberId: string | undefined;
  let orgName: string | undefined;
  let orgSlug: string = '';
  let memberName: string | undefined;
  let memberAvatarUrl: string | undefined;

  try {
    // The layout gates EVERY page's loading.tsx — a page skeleton cannot render
    // until its parent layout has finished. So this must stay minimal.
    //
    // It used to also preload projects, team members, task statuses and tags for
    // the New Task form. Those five queries ran on every navigation and delayed
    // the skeleton by seconds. They now load inside the form when it opens
    // (see task-form-context), which costs a moment on first open in exchange
    // for every page in the app painting immediately.
    const { member } = await getRequestSession();
    if (member) {
      isAdmin = member.user_role === 'admin';
      currentMemberId = member.id;
      memberName = member.name;
      memberAvatarUrl = member.avatar_url ?? undefined;

      if (member.org_id) {
        const { data: org } = await supabaseAdmin
          .from('organisations')
          .select('name, slug')
          .eq('id', member.org_id)
          .maybeSingle();
        orgName = (org as { name: string } | null)?.name ?? undefined;
        orgSlug = (org as { slug: string } | null)?.slug ?? '';
      }
    }
  } catch {
    // Non-fatal — sidebar just won't show admin link
  }

  // If accessed directly at /dashboard/*, redirect to /{slug}/*
  // Rewritten requests from /{slug}/* have the x-workspace-slug header
  const headersList = headers();
  const wsSlug = headersList.get('x-workspace-slug');

  if (!wsSlug && orgSlug) {
    // Direct /dashboard visit — redirect to slug-based URL
    // Use x-next-url or referer; fallback to rebuilding from x-invoke-path
    const xUrl = headersList.get('x-next-url') || headersList.get('x-invoke-path') || '/dashboard';
    const rest = xUrl.replace(/^\/dashboard/, '');
    redirect(`/${orgSlug}${rest}`);
  }

  // If neither header slug nor DB org slug resolved, the user has no
  // associated organisation. Rendering the shell would produce links like
  // `//tasks` that break the app, so redirect them to set up an org first.
  const resolvedSlug = wsSlug || orgSlug;
  if (!resolvedSlug) {
    redirect('/setup-org');
  }

  return (
    <WorkspaceSlugProvider slug={resolvedSlug}>
      <DashboardShell
        isAdmin={isAdmin}
        currentMemberId={currentMemberId}
        orgName={orgName}
        memberName={memberName}
        memberAvatarUrl={memberAvatarUrl}
        slug={resolvedSlug}
      >
        {children}
      </DashboardShell>
    </WorkspaceSlugProvider>
  );
}
