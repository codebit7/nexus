# 03 — Database Reference

Supabase PostgreSQL. This is the **accurate** current schema, derived from
[`lib/types.ts`](../lib/types.ts) (generated from the live database) plus the queries
in [`lib/db/`](../lib/db/).

> `docs/schema.sql` in this folder is an early draft. It predates multi-tenancy and is
> missing five tables. Do not use it.

---

## Table map

```
organisations (the tenant root)
   │
   ├── team_members ──┬── project_members ──┐
   │                  │                     │
   │                  └── tasks.assignee_id │
   │                                        │
   ├── clients ── projects ─────────────────┘
   │      │          │
   │      │          └── tasks ──┬── comments
   │      │                      ├── files
   │      │                      └── task_tags ── tags
   │      │                      │
   │      └── invoices           └── task_statuses (project-scoped or org-wide)
```

---

## organisations

The tenant root. One row per company that signs up.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | Company name. Typed back to confirm workspace deletion |
| `slug` | TEXT NOT NULL | **Unique.** Drives the URL `/{slug}/*`. Pattern `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `plan` | TEXT | `free` \| `pro` \| `enterprise`. Always `free` on signup |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

RLS: `owner_update_own_org` and `owner_delete_own_org` — both require
`is_owner() AND id = get_org_id()`.

---

## team_members

Internal users. `id` **equals** the Supabase Auth user id — that is the join to `auth.users`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Same value as `auth.users.id` |
| `org_id` | UUID FK → organisations | Nullable. `NULL` means "signed up but no workspace yet" → redirected to `/setup-org` |
| `name` | TEXT NOT NULL | |
| `email` | TEXT NOT NULL | Unique. Always stored lowercase |
| `role` | TEXT | Free-text job title (e.g. "Designer") |
| `user_role` | TEXT | Permission level: `admin` \| `member` |
| `is_owner` | BOOLEAN NOT NULL | Exactly one `true` per org. Cannot be removed or demoted |
| `avatar_url` | TEXT | |

---

## clients

The agency's customers. Each may have portal access.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `org_id` | UUID FK → organisations | |
| `name` | TEXT NOT NULL | Also used as `comments.author_name` for portal comments |
| `email` | TEXT | Unique. The portal login identity |
| `status` | TEXT | `active` \| `inactive` \| `paused` |
| `project_type` | TEXT | Free text |
| `monthly_rate` | NUMERIC(10,2) | |
| `start_date` | DATE | |
| `portal_password` | TEXT | **bcrypt hash.** Never selected by list queries |
| `created_at` | TIMESTAMPTZ | |

`portal_password` is deliberately excluded from `ClientListItem` and from
`getClients()` / `getClientById()` — only `signInAction` and `portalSignInAction`
select it.

---

## projects

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `org_id` | UUID FK → organisations | |
| `client_id` | UUID FK → clients | Nullable |
| `name` | TEXT NOT NULL | |
| `status` | TEXT | Default `active` |
| `total_value` | NUMERIC(10,2) | |
| `deadline` | DATE | |
| `created_at` | TIMESTAMPTZ | |

---

## tasks

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `org_id` | UUID FK → organisations | |
| `project_id` | UUID FK → projects | Nullable |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `status` | TEXT | The **slug** of a `task_statuses` row, not a UUID. Default `todo` |
| `priority` | TEXT | `urgent` \| `high` \| `normal` \| `low` |
| `assignee_id` | UUID FK → team_members | Nullable. Set to `NULL` when a member is deleted |
| `due_date` | DATE | |
| `created_at` | TIMESTAMPTZ | |

**`status` is a string, not an enum.** That is what makes custom board columns
possible. `lib/types.ts` reflects this: `export type TaskStatus = string`.

---

## task_statuses

Kanban columns. Added after the original schema; see
[`migration-task-statuses-project-scope.sql`](migration-task-statuses-project-scope.sql).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `org_id` | UUID FK → organisations | |
| `project_id` | UUID FK → projects, ON DELETE CASCADE | **Nullable.** `NULL` = org-wide; UUID = that project only |
| `slug` | TEXT | e.g. `in_testing`. **UNIQUE per `(org_id, slug)`** |
| `label` | TEXT | e.g. "In Testing" |
| `color` | TEXT | Hex |
| `position` | INT | Order on the board. Maintained per scope |
| `is_default` | BOOLEAN | `true` for the three seeded rows. Cannot be deleted |
| `created_at` | TIMESTAMPTZ | |

Seeded at workspace creation by `seedDefaultStatuses(orgId)`:

| slug | label | color | position |
|---|---|---|---|
| `todo` | To Do | `#666666` | 0 |
| `in_progress` | In Progress | `#5e6ad2` | 1 |
| `done` | Done | `#26c97f` | 2 |

Index: `task_statuses_project_id_idx` on `project_id`.

---

## tags and task_tags

Coloured labels on tasks, shared across the workspace.

**tags**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `org_id` | UUID FK → organisations | |
| `name` | TEXT | Unique per org. `upsertTag` does a case-insensitive lookup first, so creating an existing tag returns it instead of erroring |
| `color` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

**task_tags** (junction)

| Column | Type | Notes |
|---|---|---|
| `task_id` | UUID FK → tasks | |
| `tag_id` | UUID FK → tags | |
| `org_id` | UUID | Carried on the junction so tag reads can filter without a join |

`setTaskTags(taskId, tagIds)` verifies the task **and** every tag belong to the caller's
org, then deletes all rows for the task and re-inserts. Replace, not diff — N is small.

---

## project_members

Which team members can see which projects. This is what makes a non-admin's view narrow.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `project_id` | UUID FK → projects | |
| `member_id` | UUID FK → team_members | |
| `org_id` | UUID | |
| `assigned_at` | TIMESTAMPTZ | |
| `assigned_by` | UUID | FK → team_members. `NO ACTION`, which is why workspace deletion clears this table before `team_members` |

Unique on `(project_id, member_id)` — used as the `onConflict` target for upserts.

Rows are created two ways: explicitly on the team-members page, and **automatically**
when a task is assigned to someone on a project they were not yet on.

---

## invoices

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `org_id` | UUID FK → organisations | |
| `client_id` | UUID FK → clients | |
| `invoice_number` | TEXT | Unique |
| `amount` | NUMERIC(10,2) | |
| `status` | TEXT | `pending` \| `paid` \| `overdue` |
| `due_date` | DATE | |
| `pdf_url` | TEXT | Public Supabase Storage URL, written by `/api/generate-invoice-pdf` |
| `created_at` | TIMESTAMPTZ | |

---

## comments

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `task_id` | UUID FK → tasks | |
| `user_id` | UUID | Team member id **or** client id — no FK. This is how "Your message" vs "Team message" is decided in the portal |
| `author_name` | TEXT | Snapshot of the name at write time |
| `content` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

No `org_id`. Tenant isolation is inherited through `task_id`.

---

## files

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `task_id` | UUID FK → tasks | |
| `filename` | TEXT | Original name |
| `file_url` | TEXT | Public Storage URL |
| `created_at` | TIMESTAMPTZ | |

No `org_id`. Isolation inherited through `task_id`.

---

## Storage buckets

| Bucket | Path pattern | Written by |
|---|---|---|
| `invoices` | `{invoiceId}.pdf` | `app/api/generate-invoice-pdf/route.tsx` (`upsert: true`) |
| `project-files` | `tasks/{taskId}/{timestamp}-{filename}` | `uploadFileToTask()` in `lib/db/tasks.ts` |

Both return **public** URLs. Anyone holding the URL can read the file.

---

## RLS

Row Level Security is enabled on all tables.

| Role | Access |
|---|---|
| `service_role` | Full. Bypasses RLS — this is what `supabaseAdmin` uses |
| `authenticated` | Scoped by `org_id = get_org_id()` |
| `anon` | Blocked |

Helper SQL functions:

```sql
get_org_id()  →  SELECT org_id FROM team_members WHERE id = auth.uid()
is_admin()    →  EXISTS (SELECT 1 FROM team_members
                          WHERE id = auth.uid() AND user_role = 'admin')
is_owner()    →  EXISTS (SELECT 1 FROM team_members
                          WHERE id = auth.uid() AND is_owner = true)
```

Because nearly every application query runs through `supabaseAdmin` (service role),
**RLS is the backstop, not the primary control.** The `.eq('org_id', …)` in the query
is what actually enforces isolation. Any new query that forgets it is a data leak even
though RLS is on.

---

## Regenerating types

`lib/types.ts` is generated:

```bash
supabase gen types typescript
```

Some newer tables (`project_members`, `task_statuses`, `tags`, `task_tags`) were added
after the last generation, which is why the code casts `supabaseAdmin as any` when
touching them. Re-running generation would remove those casts.

---

## Related docs

- [02-architecture.md](02-architecture.md) — how these tables are queried safely
- [04-api-reference.md](04-api-reference.md) — the functions that touch them
