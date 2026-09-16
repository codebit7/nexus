import { supabaseAdmin } from '../supabase-admin';

/**
 * One address, one person, product-wide.
 *
 * An email may exist in exactly one of three places: team_members (any
 * workspace), clients (any workspace), or auth.users. The two table columns are
 * UNIQUE individually, but nothing joined them up — the same address could be a
 * member of one workspace and a client of another, and two such addresses
 * already existed in production before this check was added.
 *
 * Not a `'use server'` file: these are plain server-side helpers. Marking them
 * as server actions would expose an email-probing endpoint to the browser.
 */

export type EmailOwner = 'team_member' | 'client' | 'auth_user';

/**
 * Where an address is already used, or null if it is free.
 *
 * Deliberately global — NOT scoped to the caller's org. Scoping it would let the
 * same address be re-used in another workspace, which is the exact hole this
 * closes. `ignoreClientId` skips one client row so saving an unchanged email on
 * an edit form does not report a clash with itself.
 */
export async function findEmailOwner(
  email: string,
  opts: { ignoreClientId?: string } = {}
): Promise<EmailOwner | null> {
  const normalised = email.trim().toLowerCase();
  if (!normalised) return null;

  const [memberRes, clientRes, authRes] = await Promise.all([
    supabaseAdmin
      .from('team_members')
      .select('id')
      .ilike('email', normalised)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('clients')
      .select('id')
      .ilike('email', normalised)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin.rpc('email_exists_in_auth' as never, { p_email: normalised } as never),
  ]);

  if (memberRes.error) {
    throw new Error(`Failed to check team members: ${memberRes.error.message}`);
  }
  if (clientRes.error) {
    throw new Error(`Failed to check clients: ${clientRes.error.message}`);
  }

  if (memberRes.data) return 'team_member';

  const clientRow = clientRes.data as { id: string } | null;
  if (clientRow && clientRow.id !== opts.ignoreClientId) return 'client';

  // A missing function (migration not applied yet) must not silently disable the
  // check, but it also must not block the two table checks that did run.
  if (authRes.error) {
    throw new Error(`Failed to check existing accounts: ${authRes.error.message}`);
  }
  if (authRes.data === true) return 'auth_user';

  return null;
}

/**
 * Message shown to the admin doing the adding.
 *
 * Says only "already in use" — never which workspace or which role. An admin of
 * workspace A must not be able to discover who belongs to workspace B by typing
 * addresses into the invite form.
 */
const MESSAGES: Record<EmailOwner, string> = {
  team_member: 'This email is already in use. Please use a different address.',
  client: 'This email is already in use. Please use a different address.',
  auth_user:
    'This email already has an account. Please use a different address, or remove the old account first.',
};

/** Throws with a user-facing message if the address is taken anywhere. */
export async function assertEmailIsFree(
  email: string,
  opts: { ignoreClientId?: string } = {}
): Promise<void> {
  const owner = await findEmailOwner(email, opts);
  if (owner) throw new Error(MESSAGES[owner]);
}
