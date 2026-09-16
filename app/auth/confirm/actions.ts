'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { getWelcomeEmail } from '@/lib/email-templates';

export interface ProvisionResult {
  error: string | null;
  redirectTo: string;
}

/**
 * Provisions the org + team_member row for a newly verified signup.
 * Called client-side after setSession() establishes the auth session from
 * the hash fragment token — the cookie is then available server-side.
 */
export async function provisionSignupAction(): Promise<ProvisionResult> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'Session not found. Please try signing up again.', redirectTo: '/signup' };
    }

    // Already provisioned — skip straight to dashboard
    if (!user.user_metadata?.signup_pending) {
      const slug = user.user_metadata?.slug as string | undefined;
      return { error: null, redirectTo: slug ? `/${slug}` : '/dashboard' };
    }

    const meta = user.user_metadata;
    const companyName = meta.company_name as string;
    const slug        = meta.slug        as string;
    const fullName    = meta.full_name   as string;

    if (!companyName || !slug || !fullName) {
      return { error: 'Missing signup data. Please sign up again.', redirectTo: '/signup' };
    }

    // Re-check slug uniqueness (could have been taken between signup and verification)
    const { data: existingOrg } = await supabaseAdmin
      .from('organisations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingOrg) {
      return {
        error: 'Your workspace name was taken while awaiting verification. Please sign up again with a different name.',
        redirectTo: '/signup',
      };
    }

    // Create organisation
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organisations' as any)
      .insert({ name: companyName, slug, plan: 'free' })
      .select('id')
      .single();

    if (orgError || !org) {
      return { error: null, redirectTo: '/setup-org' };
    }

    const orgId = (org as unknown as { id: string }).id;

    // Seed default task statuses for the new org
    try {
      const { seedDefaultStatuses } = await import('@/lib/db/task-statuses');
      await seedDefaultStatuses(orgId);
    } catch { /* non-blocking — statuses can be seeded later */ }

    // Create team_members row
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .upsert(
        {
          id:        user.id,
          org_id:    orgId,
          name:      fullName,
          email:     user.email!,
          user_role: 'admin',
          is_owner:  true,
        },
        { onConflict: 'id' }
      );

    if (memberError) {
      await supabaseAdmin.from('organisations').delete().eq('id', orgId);
      return { error: null, redirectTo: '/setup-org' };
    }

    // Clear signup_pending flag and record org_id in auth metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...meta, org_id: orgId, signup_pending: false },
    });

    // Send welcome email (non-blocking)
    try {
      await sendEmail({
        to:      user.email!,
        subject: 'Welcome to Nexus — your workspace is ready',
        html:    getWelcomeEmail({ memberName: fullName, companyName }),
      });
    } catch {
      // Non-critical
    }

    return { error: null, redirectTo: slug ? `/${slug}` : '/dashboard' };
  } catch {
    return { error: null, redirectTo: '/setup-org' };
  }
}
