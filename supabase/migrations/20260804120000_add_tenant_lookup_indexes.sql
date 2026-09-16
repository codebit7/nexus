-- Indexes for the columns every query filters on.
--
-- Multi-tenancy means literally every read ends in `.eq('org_id', …)`, and the
-- board/detail pages add `.eq('project_id', …)`. None of those columns had an
-- index, so each one was a sequential scan of the whole table.
--
-- Harmless today (the largest table has ~33 rows, where a scan is faster than
-- an index anyway) — this exists so it stays harmless at 50k rows.
--
-- Plain CREATE INDEX, not CONCURRENTLY: supabase migrations run inside a
-- transaction, which CONCURRENTLY forbids. At current row counts the lock is
-- sub-millisecond. If these tables ever get large before this is applied, run
-- the CONCURRENTLY versions by hand instead.

-- tasks: filtered by org on every page, by project on a board, by assignee in
-- the sidebar and the "my tasks" queries.
CREATE INDEX IF NOT EXISTS tasks_org_id_idx      ON public.tasks (org_id);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx  ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON public.tasks (assignee_id);

-- projects: listed per org, and joined from a client's detail page.
CREATE INDEX IF NOT EXISTS projects_org_id_idx    ON public.projects (org_id);
CREATE INDEX IF NOT EXISTS projects_client_id_idx ON public.projects (client_id);

-- team_members: read on nearly every request while resolving the caller's org.
CREATE INDEX IF NOT EXISTS team_members_org_id_idx ON public.team_members (org_id);

CREATE INDEX IF NOT EXISTS clients_org_id_idx ON public.clients (org_id);

CREATE INDEX IF NOT EXISTS invoices_org_id_idx    ON public.invoices (org_id);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON public.invoices (client_id);

-- comments / files hang off a task and have no org_id of their own.
CREATE INDEX IF NOT EXISTS comments_task_id_idx ON public.comments (task_id);
CREATE INDEX IF NOT EXISTS files_task_id_idx    ON public.files (task_id);

-- project_members: the unique (project_id, member_id) index already serves
-- lookups that start with project_id. These cover the other two directions —
-- "which projects is this member on" and the org filter.
CREATE INDEX IF NOT EXISTS project_members_member_id_idx ON public.project_members (member_id);
CREATE INDEX IF NOT EXISTS project_members_org_id_idx    ON public.project_members (org_id);

-- Deliberately NOT added, already covered by an existing index prefix:
--   task_statuses (org_id)  → unique (org_id, slug)
--   task_tags     (task_id) → primary key (task_id, tag_id)
--   tags          (org_id)  → tags_org_id_idx
