'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, formatResetTime } from '@/lib/rate-limit';

export interface SetupOrgState {
  error: string | null;
  fieldErrors?: {
    companyName?: string;
    slug?: string;
  };
}

export async function setupOrgAction(
  _prevState: SetupOrgState,
  formData: FormData
): Promise<SetupOrgState> {
  // Rate limiting
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success, resetMs } = checkRateLimit('setup-org:' + ip);
  if (!success) {
    return { error: `Too many attempts. Please try again in ${formatResetTime(resetMs)}.` };
  }

  const companyName = ((formData.get('companyName') as string) ?? '').trim();
  const slug        = ((formData.get('slug')        as string) ?? '').trim();

  // Validate
  const fieldErrors: SetupOrgState['fieldErrors'] = {};
  if (!companyName || companyName.length < 2) {
    fieldErrors.companyName = 'Company name must be at least 2 characters.';
  }
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fieldErrors.slug = 'Slug must use only lowercase letters, numbers, and hyphens.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: null, fieldErrors };
  }

  // Get current user
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  // Check if user already has an org via metadata (signup created it but
  // team_members wasn't linked). If so, just link and redirect.
  const metaOrgId = user.user_metadata?.org_id as string | undefined;
  if (metaOrgId) {
    const { data: existingMetaOrg } = await supabaseAdmin
      .from('organisations')
      .select('id')
      .eq('id', metaOrgId)
      .maybeSingle();

    if (existingMetaOrg) {
      // Org exists — just fix the team_members link
      await supabaseAdmin
        .from('team_members')
        .upsert(
          {
            id: user.id,
            org_id: metaOrgId,
            name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
            email: user.email!.toLowerCase(),
            user_role: (user.user_metadata?.user_role as string) || 'admin',
            is_owner: (user.user_metadata?.is_owner as boolean) ?? false,
          },
          { onConflict: 'id' }
        );
      redirect(`/${slug}`);
    }
  }

  // Check slug not taken
  const { data: existingOrg } = await supabaseAdmin
    .from('organisations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existingOrg) {
    return { error: null, fieldErrors: { slug: 'This workspace name is already taken.' } };
  }

  // Create organisation
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organisations')
    .insert({ name: companyName, slug, plan: 'free' })
    .select('id')
    .single();

  if (orgError || !org) {
    return { error: 'Failed to create organisation. Please try again.' };
  }

  const orgId = (org as unknown as { id: string }).id;

  // Seed default task statuses for the new org
  try {
    const { seedDefaultStatuses } = await import('@/lib/db/task-statuses');
    await seedDefaultStatuses(orgId);
  } catch { /* non-blocking */ }

  // Link team_member to org (upsert to handle missing rows too)
  const { error: updateError } = await supabaseAdmin
    .from('team_members')
    .upsert(
      {
        id: user.id,
        org_id: orgId,
        name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
        email: user.email!.toLowerCase(),
        user_role: (user.user_metadata?.user_role as string) || 'admin',
        is_owner: (user.user_metadata?.is_owner as boolean) ?? false,
      },
      { onConflict: 'id' }
    );

  if (updateError) {
    // Roll back org creation
    await supabaseAdmin.from('organisations').delete().eq('id', orgId);
    return { error: 'Failed to link your account to the organisation.' };
  }

  // Update user metadata with org_id for future reference
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, org_id: orgId },
  });

  redirect(`/${slug}`);
}