-- =====================================================================
-- Nexus: Row Level Security (RLS) policies
-- =====================================================================
-- Based on the schema described in the repo docs. Assumptions (check them
-- against your real schema before running):
--   * ids and org_id are uuid
--   * team_members.id = auth.users.id
--   * team_members.user_role is 'admin' or 'member'
--   * team_members.is_owner is boolean
--   * project_members has project_id and member_id
--   * comments and files have NO org_id (isolation comes through task_id)
--
-- IMPORTANT: these policies only apply to queries made with the anon key
-- plus a user JWT (the "authenticated" role). The service-role client
-- (supabaseAdmin) still bypasses RLS. To benefit from these policies,
-- move normal user queries to the cookie-aware client.
--
-- Test on a staging database first. This script DROPS existing policies
-- on the tables below and recreates them.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Helper functions
-- ---------------------------------------------------------------------
-- SECURITY DEFINER lets these read team_members / project_members without
-- triggering RLS on those tables again (avoids infinite recursion).
-- search_path is pinned so the functions cannot be hijacked.

create or replace function public.get_org_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select org_id from public.team_members where id = (select auth.uid())
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select user_role = 'admin' from public.team_members where id = (select auth.uid())),
    false)
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select is_owner from public.team_members where id = (select auth.uid())),
    false)
$$;

-- True when the project is in the caller's org AND the caller is an admin
-- or has been added to that project.
create or replace function public.can_access_project(pid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = pid
      and p.org_id = public.get_org_id()
      and (
        public.is_admin()
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.member_id = (select auth.uid())
        )
      )
  )
$$;

revoke all on function public.get_org_id()           from public, anon;
revoke all on function public.is_admin()             from public, anon;
revoke all on function public.is_owner()             from public, anon;
revoke all on function public.can_access_project(uuid) from public, anon;
grant execute on function public.get_org_id()           to authenticated, service_role;
grant execute on function public.is_admin()             to authenticated, service_role;
grant execute on function public.is_owner()             to authenticated, service_role;
grant execute on function public.can_access_project(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. Enable RLS and clear old policies
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  r record;
  tables text[] := array[
    'organisations','team_members','clients','projects','project_members',
    'tasks','task_statuses','tags','task_tags','invoices','comments','files'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename = any(tables)
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- The anonymous (not logged in) role gets nothing.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------
-- 3. organisations
-- Create is done by the server (service role) at signup, so no INSERT policy.
-- ---------------------------------------------------------------------
create policy org_select on public.organisations
  for select to authenticated
  using (id = public.get_org_id());

create policy org_update on public.organisations
  for update to authenticated
  using (id = public.get_org_id() and public.is_owner())
  with check (id = public.get_org_id() and public.is_owner());

create policy org_delete on public.organisations
  for delete to authenticated
  using (id = public.get_org_id() and public.is_owner());

-- ---------------------------------------------------------------------
-- 4. team_members
-- Everyone sees teammates in their org (and always their own row).
-- Only admins add, edit or remove members.
-- ---------------------------------------------------------------------
create policy tm_select on public.team_members
  for select to authenticated
  using (org_id = public.get_org_id() or id = (select auth.uid()));

create policy tm_insert on public.team_members
  for insert to authenticated
  with check (public.is_admin() and org_id = public.get_org_id());

create policy tm_update on public.team_members
  for update to authenticated
  using (org_id = public.get_org_id() and public.is_admin())
  with check (org_id = public.get_org_id());

create policy tm_delete on public.team_members
  for delete to authenticated
  using (
    org_id = public.get_org_id()
    and public.is_admin()
    and team_members.is_owner is not true   -- the owner can never be removed this way
  );

-- RLS cannot restrict individual columns, so use a trigger to make sure
-- only the owner can change role, ownership or org of a member.
create or replace function public.protect_team_member_columns()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- service role / migrations have no JWT user: let them through
  if (select auth.uid()) is null then
    return new;
  end if;

  if (new.user_role is distinct from old.user_role
      or new.is_owner  is distinct from old.is_owner
      or new.org_id    is distinct from old.org_id)
     and not public.is_owner() then
    raise exception 'Only the workspace owner can change roles, ownership or org';
  end if;

  return new;
end $$;

drop trigger if exists trg_protect_team_member_columns on public.team_members;
create trigger trg_protect_team_member_columns
  before update on public.team_members
  for each row execute function public.protect_team_member_columns();

-- ---------------------------------------------------------------------
-- 5. clients
-- Admins see all clients in the org. Members only see clients that have
-- a project they were added to. Only admins write.
-- ---------------------------------------------------------------------
create policy clients_select on public.clients
  for select to authenticated
  using (
    org_id = public.get_org_id()
    and (
      public.is_admin()
      or exists (
        select 1 from public.projects p
        where p.client_id = clients.id
          and public.can_access_project(p.id)
      )
    )
  );

create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.is_admin() and org_id = public.get_org_id());

create policy clients_update on public.clients
  for update to authenticated
  using (public.is_admin() and org_id = public.get_org_id())
  with check (public.is_admin() and org_id = public.get_org_id());

create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_admin() and org_id = public.get_org_id());

-- ---------------------------------------------------------------------
-- 6. projects
-- Admins see all; members only projects they were added to.
-- ---------------------------------------------------------------------
create policy projects_select on public.projects
  for select to authenticated
  using (org_id = public.get_org_id() and public.can_access_project(id));

create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    public.is_admin()
    and org_id = public.get_org_id()
    and (client_id is null or exists (
      select 1 from public.clients c
      where c.id = client_id and c.org_id = public.get_org_id()))
  );

create policy projects_update on public.projects
  for update to authenticated
  using (public.is_admin() and org_id = public.get_org_id())
  with check (
    public.is_admin()
    and org_id = public.get_org_id()
    and (client_id is null or exists (
      select 1 from public.clients c
      where c.id = client_id and c.org_id = public.get_org_id()))
  );

create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_admin() and org_id = public.get_org_id());

-- ---------------------------------------------------------------------
-- 7. project_members
-- Org is checked through the parent project (works even if the table has
-- no org_id column). Members see their own rows; admins see all.
-- ---------------------------------------------------------------------
create policy pm_select on public.project_members
  for select to authenticated
  using (
    exists (select 1 from public.projects p
            where p.id = project_members.project_id
              and p.org_id = public.get_org_id())
    and (public.is_admin() or member_id = (select auth.uid()))
  );

create policy pm_insert on public.project_members
  for insert to authenticated
  with check (
    public.is_admin()
    and exists (select 1 from public.projects p
                where p.id = project_id and p.org_id = public.get_org_id())
    and exists (select 1 from public.team_members m
                where m.id = member_id and m.org_id = public.get_org_id())
  );

create policy pm_delete on public.project_members
  for delete to authenticated
  using (
    public.is_admin()
    and exists (select 1 from public.projects p
                where p.id = project_members.project_id
                  and p.org_id = public.get_org_id())
  );

-- ---------------------------------------------------------------------
-- 8. tasks
-- Visible if: admin, OR assigned to me, OR on a project I belong to.
-- Writes must keep project and assignee inside the caller's org.
-- ---------------------------------------------------------------------
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    org_id = public.get_org_id()
    and (
      public.is_admin()
      or assignee_id = (select auth.uid())
      or (project_id is not null and public.can_access_project(project_id))
    )
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    org_id = public.get_org_id()
    and (project_id is null or public.can_access_project(project_id))
    and (assignee_id is null or exists (
      select 1 from public.team_members m
      where m.id = assignee_id and m.org_id = public.get_org_id()))
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    org_id = public.get_org_id()
    and (
      public.is_admin()
      or assignee_id = (select auth.uid())
      or (project_id is not null and public.can_access_project(project_id))
    )
  )
  with check (
    org_id = public.get_org_id()
    and (project_id is null or public.can_access_project(project_id))
    and (assignee_id is null or exists (
      select 1 from public.team_members m
      where m.id = assignee_id and m.org_id = public.get_org_id()))
  );

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (org_id = public.get_org_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- 9. task_statuses (kanban columns)
-- ---------------------------------------------------------------------
create policy statuses_select on public.task_statuses
  for select to authenticated
  using (
    org_id = public.get_org_id()
    and (project_id is null or public.can_access_project(project_id))
  );

create policy statuses_insert on public.task_statuses
  for insert to authenticated
  with check (
    public.is_admin()
    and org_id = public.get_org_id()
    and (project_id is null or public.can_access_project(project_id))
  );

create policy statuses_update on public.task_statuses
  for update to authenticated
  using (public.is_admin() and org_id = public.get_org_id())
  with check (
    public.is_admin()
    and org_id = public.get_org_id()
    and (project_id is null or public.can_access_project(project_id))
  );

create policy statuses_delete on public.task_statuses
  for delete to authenticated
  using (public.is_admin() and org_id = public.get_org_id());

-- ---------------------------------------------------------------------
-- 10. tags and task_tags
-- ---------------------------------------------------------------------
create policy tags_select on public.tags
  for select to authenticated
  using (org_id = public.get_org_id());

create policy tags_insert on public.tags
  for insert to authenticated
  with check (org_id = public.get_org_id());

create policy tags_update on public.tags
  for update to authenticated
  using (org_id = public.get_org_id())
  with check (org_id = public.get_org_id());

create policy tags_delete on public.tags
  for delete to authenticated
  using (org_id = public.get_org_id() and public.is_admin());

-- The subquery on tasks is itself filtered by the tasks policies, so a user
-- can only tag tasks they are allowed to see.
create policy task_tags_select on public.task_tags
  for select to authenticated
  using (
    org_id = public.get_org_id()
    and exists (select 1 from public.tasks t where t.id = task_tags.task_id)
  );

create policy task_tags_insert on public.task_tags
  for insert to authenticated
  with check (
    org_id = public.get_org_id()
    and exists (select 1 from public.tasks t where t.id = task_id)
    and exists (select 1 from public.tags g
                where g.id = tag_id and g.org_id = public.get_org_id())
  );

create policy task_tags_delete on public.task_tags
  for delete to authenticated
  using (
    org_id = public.get_org_id()
    and exists (select 1 from public.tasks t where t.id = task_tags.task_id)
  );

-- ---------------------------------------------------------------------
-- 11. invoices (admins only)
-- ---------------------------------------------------------------------
create policy invoices_all on public.invoices
  for all to authenticated
  using (public.is_admin() and org_id = public.get_org_id())
  with check (
    public.is_admin()
    and org_id = public.get_org_id()
    and exists (select 1 from public.clients c
                where c.id = client_id and c.org_id = public.get_org_id())
  );

-- ---------------------------------------------------------------------
-- 12. comments and files
-- No org_id on these tables, so isolation is inherited from the parent
-- task: the subquery on tasks is filtered by the tasks policies above.
-- ---------------------------------------------------------------------
create policy comments_select on public.comments
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = comments.task_id));

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id)
  );

create policy comments_update on public.comments
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = comments.task_id)
  )
  with check (user_id = (select auth.uid()));

create policy comments_delete on public.comments
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) or public.is_admin())
    and exists (select 1 from public.tasks t where t.id = comments.task_id)
  );

create policy files_select on public.files
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = files.task_id));

create policy files_insert on public.files
  for insert to authenticated
  with check (exists (select 1 from public.tasks t where t.id = task_id));

create policy files_delete on public.files
  for delete to authenticated
  using (
    public.is_admin()
    and exists (select 1 from public.tasks t where t.id = files.task_id)
  );

-- ---------------------------------------------------------------------
-- 13. Indexes (policies filter on these columns on every query)
-- ---------------------------------------------------------------------
create index if not exists idx_team_members_org     on public.team_members (org_id);
create index if not exists idx_clients_org          on public.clients (org_id);
create index if not exists idx_projects_org         on public.projects (org_id);
create index if not exists idx_projects_client      on public.projects (client_id);
create index if not exists idx_pm_member_project    on public.project_members (member_id, project_id);
create index if not exists idx_tasks_org            on public.tasks (org_id);
create index if not exists idx_tasks_project        on public.tasks (project_id);
create index if not exists idx_tasks_assignee       on public.tasks (assignee_id);
create index if not exists idx_task_statuses_org    on public.task_statuses (org_id);
create index if not exists idx_tags_org             on public.tags (org_id);
create index if not exists idx_task_tags_task       on public.task_tags (task_id);
create index if not exists idx_invoices_org         on public.invoices (org_id);
create index if not exists idx_invoices_client      on public.invoices (client_id);
create index if not exists idx_comments_task        on public.comments (task_id);
create index if not exists idx_files_task           on public.files (task_id);

commit;

-- =====================================================================
-- OPTIONAL A: hide the client portal password hash from team members
-- RLS works on rows, not columns. Use column privileges instead.
-- Replace the column list with your real columns (everything EXCEPT
-- portal_password). The service role is not affected.
-- =====================================================================
-- revoke select on public.clients from authenticated;
-- grant select (id, org_id, name, email, status, monthly_rate, created_at)
--   on public.clients to authenticated;

-- =====================================================================
-- OPTIONAL B: private storage buckets with per-org folders
-- Requires: buckets set to private, and files stored as '<org_id>/<file>'.
-- Serve files with short-lived signed URLs.
-- =====================================================================
-- create policy storage_org_read on storage.objects
--   for select to authenticated
--   using (
--     bucket_id in ('invoices', 'project-files')
--     and (storage.foldername(name))[1] = public.get_org_id()::text
--   );
-- create policy storage_org_write on storage.objects
--   for insert to authenticated
--   with check (
--     bucket_id in ('invoices', 'project-files')
--     and (storage.foldername(name))[1] = public.get_org_id()::text
--   );

-- =====================================================================
-- TESTING in the Supabase SQL editor (run each block on its own)
-- Pretend to be a user from org A, then confirm org B rows are invisible.
-- =====================================================================
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     '{"sub":"<USER_ID_FROM_ORG_A>","role":"authenticated"}', true);
--   select count(*) from public.tasks;                 -- only org A tasks
--   select count(*) from public.tasks where org_id = '<ORG_B_ID>';  -- must be 0
--   insert into public.tasks (org_id, title)
--     values ('<ORG_B_ID>', 'hack');                   -- must fail (RLS)
-- rollback;
