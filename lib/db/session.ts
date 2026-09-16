import { cache } from 'react';
import { supabaseAdmin } from '../supabase-admin';
import { createSupabaseServerClient } from '../supabase-server';
import type { TeamMember } from '../types';

/**
 * Per-request session helpers.
 *
 * Every dashboard page used to open with the same two lookups the layout had
 * just done: `supabase.auth.getUser()` and a `team_members` row by email. That
 * is roughly 15 call sites across app/dashboard, and `auth.getUser()` is a
 * network round-trip to Supabase's auth server — not a local token decode. On a
 * database in Sydney and functions in Washington, each one costs ~200ms.
 *
 * React's cache() memoises for the lifetime of a single server render, so the
 * layout and the page it wraps share one auth call and one member query.
 *
 * It does NOT dedupe across separate requests. A server action is its own
 * request, so an action that updates a member and re-reads it still sees the
 * new value — which is the behaviour we want.
 *
 * Not a `'use server'` file: these are plain server-side helpers, and marking
 * them as server actions would make them callable from the browser.
 */

/** The signed-in auth user, or null. One auth round-trip per request. */
export const getRequestUser = cache(async () => {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/** The team_members row for an email. One query per email per request. */
export const getRequestMemberByEmail = cache(
  async (email: string): Promise<TeamMember | null> => {
    const { data, error } = await (supabaseAdmin as any)
      .from('team_members')
      .select('id, name, email, role, avatar_url, user_role, org_id, is_owner')
      .eq('email', email)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch team member: ${error.message}`);
    return data;
  }
);

export interface RequestSession {
  user: { id: string; email: string } | null;
  member: TeamMember | null;
  orgId: string | null;
  isAdmin: boolean;
}

/**
 * Everything a dashboard page needs to know about the caller, in one call.
 *
 * Replaces the `auth.getUser()` + `getTeamMemberByEmail()` pair repeated at the
 * top of nearly every page. Because both halves are cached, calling this from
 * the layout and again from the page costs one round trip, not two.
 */
export const getRequestSession = cache(async (): Promise<RequestSession> => {
  const user = await getRequestUser();
  if (!user?.email) {
    return { user: null, member: null, orgId: null, isAdmin: false };
  }

  const member = await getRequestMemberByEmail(user.email).catch(() => null);

  return {
    user: { id: user.id, email: user.email },
    member,
    orgId: member?.org_id ?? null,
    isAdmin: member?.user_role === 'admin',
  };
});
