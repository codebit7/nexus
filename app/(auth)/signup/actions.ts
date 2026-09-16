'use server';

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, formatResetTime } from '@/lib/rate-limit';

// -- Step 1: Validate form + create org + send confirmation link ---------------

export interface SignupState {
  error: string | null;
  success?: boolean;
  email?: string;
  fieldErrors?: {
    companyName?: string;
    slug?: string;
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  };
}

function validateInputs(
  companyName: string,
  slug: string,
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
  terms: string | null
): SignupState['fieldErrors'] {
  const errors: SignupState['fieldErrors'] = {};

  if (!companyName || companyName.trim().length < 2) {
    errors.companyName = 'Company name must be at least 2 characters.';
  }

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = 'Slug must use only lowercase letters, numbers, and hyphens.';
  }

  if (!fullName || fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (terms !== 'on') {
    errors.terms = 'You must agree to the Terms of Service.';
  }

  return errors;
}

export async function signupAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const companyName     = (formData.get('companyName')     as string | null) ?? '';
  const slug            = (formData.get('slug')            as string | null) ?? '';
  const fullName        = (formData.get('fullName')        as string | null) ?? '';
  const email           = (formData.get('email')           as string | null) ?? '';
  const password        = (formData.get('password')        as string | null) ?? '';
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? '';
  const terms           = formData.get('terms') as string | null;

  // Rate limiting
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success, resetMs } = checkRateLimit('signup:' + ip);
  if (!success) {
    return { error: `Too many attempts. Please try again in ${formatResetTime(resetMs)}.` };
  }

  // STEP A: Server-side validation
  const fieldErrors = validateInputs(companyName, slug, fullName, email, password, confirmPassword, terms);
  if (Object.keys(fieldErrors ?? {}).length > 0) {
    return { error: null, fieldErrors };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // STEP B: Check slug not taken
  const { data: existingOrg } = await supabaseAdmin
    .from('organisations')
    .select('id')
    .eq('slug', slug.trim())
    .maybeSingle();

  if (existingOrg) {
    return { error: null, fieldErrors: { slug: 'This workspace name is already taken.' } };
  }

  // STEP C: Check email not already registered (only flag completed signups with org_id)
  const { data: existingMember } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('email', trimmedEmail)
    .not('org_id', 'is', null)
    .maybeSingle();

  if (existingMember) {
    return { error: null, fieldErrors: { email: 'An account with this email already exists.' } };
  }

  // STEP D: Create auth user with signup details in metadata (org + team_member created after email verification)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const metadata = {
    full_name: fullName.trim(),
    company_name: companyName.trim(),
    slug: slug.trim(),
    user_role: 'admin',
    is_owner: true,
    signup_pending: true, // Flag: org not yet created — will be created after email verification
  };

  // Check if an auth user already exists (e.g. from a previous incomplete signup attempt)
  const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = allUsers?.find((u) => u.email === trimmedEmail) ?? null;

  if (existingAuthUser) {
    // Clean up previous incomplete signup so we can recreate via signUp()

    // If the previous attempt partially provisioned an org (e.g. org created
    // but team_member insert or rollback failed), delete the orphaned org too.
    const prevSlug = existingAuthUser.user_metadata?.slug as string | undefined;
    if (prevSlug) {
      const { data: orphanedOrg } = await supabaseAdmin
        .from('organisations')
        .select('id')
        .eq('slug', prevSlug)
        .maybeSingle();

      if (orphanedOrg) {
        // Only delete if no team members are linked (truly orphaned)
        const { count } = await supabaseAdmin
          .from('team_members')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orphanedOrg.id);

        if (!count || count === 0) {
          await supabaseAdmin.from('organisations').delete().eq('id', orphanedOrg.id);
        }
      }
    }

    await supabaseAdmin.from('team_members').delete().eq('id', existingAuthUser.id);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
    if (deleteError) {
      return { error: `Failed to set up account: ${deleteError.message}` };
    }
  }

  // Use anon-key client for signUp() — this triggers Supabase to actually send
  // the confirmation email. The admin API's generateLink() only generates links
  // without sending any email.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (signUpError) {
    const msg = signUpError.message.toLowerCase();
    if (signUpError.status === 429 || msg.includes('rate') || msg.includes('security purposes')) {
      return { error: 'Email rate limit reached. Please try again in a few minutes.' };
    }
    return { error: `Failed to create account: ${signUpError.message}` };
  }

  // DB triggers may auto-insert team_members / organisations rows for the
  // unverified auth user. Delete them immediately — the proper rows are only
  // created in /auth/confirm after the user clicks the verification link.
  if (signUpData?.user?.id) {
    await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('id', signUpData.user.id)
      .is('org_id', null);

    // Clean up any org a trigger may have created with this slug
    const { data: triggerOrg } = await supabaseAdmin
      .from('organisations')
      .select('id')
      .eq('slug', slug.trim())
      .maybeSingle();

    if (triggerOrg) {
      const { count } = await supabaseAdmin
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', triggerOrg.id);

      if (!count || count === 0) {
        await supabaseAdmin.from('organisations').delete().eq('id', triggerOrg.id);
      }
    }
  }

  // Org + team_member will be created in /auth/confirm after email verification
  return { error: null, success: true, email: trimmedEmail };
}
