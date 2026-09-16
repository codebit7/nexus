import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';
import { getWelcomeEmail } from '@/lib/email-templates';
import { checkRateLimit, formatResetTime } from '@/lib/rate-limit';

/**
 * POST /api/auth/provision-workspace
 *
 * Called after email verification to create the organisation and team_member
 * rows using signup metadata stored on the auth user.
 */
export async function POST() {
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

  // Rate limit by IP
  const headerStore = headers();
  const ip = (await headerStore).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success: allowed, resetMs } = checkRateLimit(`provision:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${formatResetTime(resetMs)}.` },
      { status: 429 }
    );
  }

  // Verify caller is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const meta = user.user_metadata;

  // If signup_pending is not set, workspace was already provisioned (e.g. page refresh)
  if (!meta?.signup_pending) {
    return NextResponse.json({ ok: true });
  }

  const companyName = meta.company_name as string;
  const slug = meta.slug as string;
  const fullName = meta.full_name as string;

  if (!companyName || !slug || !fullName) {
    return NextResponse.json(
      { error: 'Missing signup details. Please sign up again.' },
      { status: 400 }
    );
  }

  // Re-check slug uniqueness (could have been taken between signup and verification)
  const { data: existingOrg } = await supabaseAdmin
    .from('organisations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existingOrg) {
    return NextResponse.json(
      { error: 'Your workspace name was taken while awaiting verification. Please sign up again with a different workspace name.' },
      { status: 409 }
    );
  }

  // Create organisation
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organisations' as any)
    .insert({ name: companyName, slug, plan: 'free' })
    .select('id')
    .single();

  if (orgError || !org) {
    return NextResponse.json(
      { error: `Failed to create workspace: ${orgError?.message ?? 'unknown error'}` },
      { status: 500 }
    );
  }

  const orgId = (org as unknown as { id: string }).id;

  // Seed default task statuses for the new org
  try {
    const { seedDefaultStatuses } = await import('@/lib/db/task-statuses');
    await seedDefaultStatuses(orgId);
  } catch { /* non-blocking */ }

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
    // Rollback org creation
    await supabaseAdmin.from('organisations').delete().eq('id', orgId);
    return NextResponse.json(
      { error: `Failed to create team member: ${memberError.message}` },
      { status: 500 }
    );
  }

  // Update auth user metadata: set org_id and clear signup_pending flag
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...meta, org_id: orgId, signup_pending: false },
  });

  // Send welcome email — never block on failure
  try {
    await sendEmail({
      to: user.email!,
      subject: 'Welcome to Nexus — your workspace is ready',
      html: getWelcomeEmail({
        memberName: fullName,
        companyName,
      }),
    });
  } catch {
    // Non-critical
  }

  return NextResponse.json({ ok: true });
}
