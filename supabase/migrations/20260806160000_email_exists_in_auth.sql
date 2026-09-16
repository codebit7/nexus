-- Email uniqueness across the whole product.
--
-- team_members.email and clients.email are each UNIQUE on their own, but nothing
-- stopped one address being a team member of workspace A and a client of
-- workspace B. Two such addresses already exist in production.
--
-- auth.users is the third place an email can live, and PostgREST cannot see the
-- auth schema. Leftover auth rows (a member removed before their auth user was
-- deleted) therefore blocked a fresh invite with an unhelpful "already
-- registered" error from Supabase instead of a message we control.
--
-- SECURITY DEFINER because auth.users is not readable by anon/authenticated.
-- It returns a boolean and nothing else, so no address can be read back out,
-- and EXECUTE is granted only to service_role — the app calls it through
-- supabaseAdmin. Without the revoke, any logged-in user could probe whether an
-- arbitrary address has an account.
create or replace function public.email_exists_in_auth(p_email text)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(p_email)
  );
$$;

revoke all on function public.email_exists_in_auth(text) from public;
revoke all on function public.email_exists_in_auth(text) from anon;
revoke all on function public.email_exists_in_auth(text) from authenticated;
grant execute on function public.email_exists_in_auth(text) to service_role;
