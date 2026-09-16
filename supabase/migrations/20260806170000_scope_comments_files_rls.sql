-- Close the open RLS on comments and files.
--
-- THE HOLE
-- Both tables carried `USING (true) WITH CHECK (true)` for ALL on the
-- `authenticated` role. Any logged-in user of any workspace could read and write
-- every comment and every file in the database straight through PostgREST, just
-- by guessing a task id. Multi-tenancy was enforced only by application code.
--
-- Neither table has an org_id of its own; both hang off tasks.task_id, so the
-- policies join through tasks and compare against get_org_id().
--
-- WHY THIS IS SAFE TO APPLY
-- Almost all app code reaches these tables through supabaseAdmin (service role),
-- which bypasses RLS entirely and is unaffected. Exactly three call sites use
-- the user-scoped client, and all three already operate inside the caller's own
-- org, so they satisfy the new policy:
--   lib/db/tasks.ts  getCommentsByTaskId   SELECT comments
--   lib/db/tasks.ts  getFilesByTaskId      SELECT files
--   app/dashboard/tasks/[id]/actions.ts    INSERT comments
--
-- Those three are also the reason this matters beyond defence in depth: none of
-- them filters by org itself. They were relying on RLS, and RLS was allowing
-- everything.
--
-- Verified before writing: 19 comments and 6 files exist, and every one has a
-- task_id that resolves to a real task — so no existing row becomes invisible.

-- ── comments ────────────────────────────────────────────────────────────────
drop policy if exists "authenticated_full_access_comments" on public.comments;

create policy "comments_scoped_to_org"
  on public.comments
  for all
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = comments.task_id
        and t.org_id = public.get_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = comments.task_id
        and t.org_id = public.get_org_id()
    )
  );

-- ── files ───────────────────────────────────────────────────────────────────
drop policy if exists "authenticated_full_access_files" on public.files;

create policy "files_scoped_to_org"
  on public.files
  for all
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = files.task_id
        and t.org_id = public.get_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = files.task_id
        and t.org_id = public.get_org_id()
    )
  );

-- The service_role and anon policies are deliberately left alone: service_role
-- keeps full access (the app depends on it), anon stays blocked.

-- Supporting indexes — the policies run this lookup on every row touched.
create index if not exists comments_task_id_idx on public.comments (task_id);
create index if not exists files_task_id_idx    on public.files    (task_id);
