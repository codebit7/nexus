import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrgSlugById } from '@/lib/db/team-members';
import { sendEmail } from '@/lib/email';
import { getWelcomeEmail } from '@/lib/email-templates';

/**
 * GET /auth/callback
 *
 * Server-side Route Handler for Supabase auth redirects (PKCE flow).
 * Exchanges the `code` query param for a session, provisions workspaces
 * for signup flows, and redirects to the appropriate destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const type = searchParams.get('type');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_failed`);
  }

  // ── Exchange code for session (sets auth cookies on the response) ──────────
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    const isExpired = msg.includes('expired') || msg.includes('otp_expired');
    return NextResponse.redirect(
      `${siteUrl}/login?error=${isExpired ? 'link_expired' : 'auth_callback_failed'}`
    );
  }

  // ── Handle invite → redirect to set password ─────────────────────────────
  if (type === 'invite') {
    return NextResponse.redirect(`${siteUrl}/auth/reset-password`);
  }

  // ── Handle signup → provision workspace ───────────────────────────────────
  if (type === 'signup') {
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.user_metadata?.signup_pending) {
      const meta = user.user_metadata;
      const companyName = meta.company_name as string;
      const slug = meta.slug as string;
      const fullName = meta.full_name as string;

      if (!companyName || !slug || !fullName) {
        return NextResponse.redirect(`${siteUrl}/login?error=missing_signup_data`);
      }

      // Re-check slug uniqueness (could have been taken between signup and email verification)
      const { data: existingOrg } = await supabaseAdmin
        .from('organisations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingOrg) {
        return NextResponse.redirect(
          `${siteUrl}/login?error=${encodeURIComponent('Your workspace name was taken while awaiting verification. Please sign up again with a different name.')}`
        );
      }

      // Create organisation
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organisations' as any)
        .insert({ name: companyName, slug, plan: 'free' })
        .select('id')
        .single();

      if (orgError || !org) {
        // User has a session but no org — redirect to setup page as fallback
        return NextResponse.redirect(`${siteUrl}/setup-org`);
      }

      const orgId = (org as unknown as { id: string }).id;

      // Create team_members row
      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .upsert(
          {
            id: user.id,
            org_id: orgId,
            name: fullName,
            email: user.email!,
            user_role: 'admin',
            is_owner: true,
          },
          { onConflict: 'id' }
        );

      if (memberError) {
        // Rollback org creation, redirect to setup as fallback
        await supabaseAdmin.from('organisations').delete().eq('id', orgId);
        return NextResponse.redirect(`${siteUrl}/setup-org`);
      }

      // Update auth user metadata: set org_id and clear signup_pending flag
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...meta, org_id: orgId, signup_pending: false },
      });

      // Send welcome email (non-blocking — never fail the redirect)
      try {
        await sendEmail({
          to: user.email!,
          subject: 'Welcome to Nexus — your workspace is ready',
          html: getWelcomeEmail({ memberName: fullName, companyName }),
        });
      } catch {
        // Non-critical
      }
    }
  }

  // ── Resolve workspace slug for redirect ────────────────────────────────────
  let resolvedNext = next;
  if (next === '/dashboard') {
    // For signup flows, slug is in user metadata; for others, look it up
    if (type === 'signup') {
      const { data: { user: signupUser } } = await supabase.auth.getUser();
      const metaSlug = signupUser?.user_metadata?.slug as string | undefined;
      if (metaSlug) resolvedNext = `/${metaSlug}`;
    } else {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const metaOrgId = currentUser.user_metadata?.org_id as string | undefined;
        if (metaOrgId) {
          const slug = await getOrgSlugById(metaOrgId);
          if (slug) resolvedNext = `/${slug}`;
        }
      }
    }
  }

  // ── Redirect to destination ───────────────────────────────────────────────
  return NextResponse.redirect(`${siteUrl}${resolvedNext}`);
}