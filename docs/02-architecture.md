# 02 — Architecture

How requests flow, how tenants stay separated, and how the auth flows work.

---

## The problem this design solves

An agency tool has three groups of people who must never see each other's data:

1. Company A's team must not see Company B's anything.
2. A client must not see the internal task list, other clients, or team salaries.
3. A junior team member should only see the projects they were put on.

Nexus solves all three with one column (`org_id`) plus two extra layers
(`project_members` for #3, a separate cookie session for #2).

---

## Request lifecycle

```
Browser
  │
  ▼
middleware.ts ─────────────────────────────────────────────────────┐
  │  classifyRoute(pathname) → 'portal' | 'dashboard' | 'workspace' │
  │                                                                │
  ├─ 'portal'    → require portal_client_id + portal_csrf_token    │
  ├─ 'dashboard' → require Supabase session, then REDIRECT to /{slug}
  ├─ 'workspace' → require Supabase session, then REWRITE to /dashboard
  └─ 'other'     → pass through                                    │
  │                                                                │
  │  every response gets security headers + CSP ◄──────────────────┘
  ▼
app/dashboard/layout.tsx  (server component)
  │  resolves slug, member, isAdmin, org name
  │  preloads projects / members / statuses / tags for forms
  ▼
page.tsx (server) → *Client.tsx (client component)
  │
  ▼
server action  →  lib/db/*.ts  →  supabaseAdmin (service role)
                                    + explicit .eq('org_id', orgId)
```

### Route classification — `middleware.ts:26`

```ts
if (pathname.startsWith('/portal'))    return 'portal';
if (pathname.startsWith('/dashboard')) return 'dashboard';
// known prefixes: /api /auth /login /signup /setup-org /forgot-password
//                 /portal /dashboard /_next /favicon.ico /brand_assets
if (KNOWN_PREFIXES matches)            return 'other';
if (pathname === '/')                  return 'other';
if (SLUG_RE.test(pathname))            return 'workspace';
return 'other';
```

`SLUG_RE` is `/^\/([a-z0-9]+(?:-[a-z0-9]+)*)(\/.*)?$/` — lowercase words joined by hyphens.

### Why slug URLs are a rewrite, not a folder move

Files live in `app/dashboard/`. The browser sees `/acme/projects`. Middleware
**rewrites** `/acme/projects` → `/dashboard/projects` internally and sets an
`x-workspace-slug: acme` header. Nothing on disk moved, and `@/app/dashboard/...`
imports still work.

The trade-off: any client component that builds a link must not hardcode
`/dashboard/...`. It calls `useWorkspaceSlug()` from
[`app/dashboard/workspace-context.tsx`](../app/dashboard/workspace-context.tsx)
and builds `` `/${slug}/...` ``.

`revalidatePath('/dashboard', 'layout')` still uses `/dashboard` because that is a
filesystem path, not a URL.

---

## Multi-tenancy

### The rule

Every tenant table has `org_id UUID`. Every read filters on it. Every write sets it
from the server, never from client input.

```ts
// lib/db/team-members.ts:10
export async function getCallerOrgId(): Promise<string> {
  const serverClient = createSupabaseServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user?.email) throw new Error('Not authenticated');
  const member = await getTeamMemberByEmail(user.email);
  if (!member?.org_id) throw new Error('No organisation found for this account…');
  return member.org_id;
}
```

### Two Supabase clients, two jobs

| File | Key | Used for |
|---|---|---|
| [`lib/supabase-server.ts`](../lib/supabase-server.ts) | anon | Cookie-aware server client. Reading the session; RLS applies |
| [`lib/supabase-admin.ts`](../lib/supabase-admin.ts) | service role | Almost every `lib/db` query. **Bypasses RLS** |
| [`lib/supabase.ts`](../lib/supabase.ts) | anon | Universal client with `cache: 'no-store'` on fetch |

Because `supabaseAdmin` bypasses RLS, the `.eq('org_id', orgId)` filter in the query
**is** the security boundary, not a redundancy. RLS is the second net, not the first.

### Foreign keys are verified, never trusted

A client can POST any UUID. Server actions re-check ownership before inserting:

```ts
// app/dashboard/tasks/actions.ts:17 — createTaskAction
if (payload.project_id) {
  const { data: project } = await supabaseAdmin
    .from('projects').select('id')
    .eq('id', payload.project_id).eq('org_id', org_id).maybeSingle();
  if (!project) throw new Error('Invalid project');
}
// same pattern for assignee_id
```

Where a user-supplied value goes into a PostgREST `.or()` filter string (which is
**not** parameterised), it is validated first:

```ts
// lib/db/task-statuses.ts:31
const UUID_REGEX = /^[0-9a-f]{8}-…-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(scope.projectId)) throw new Error('Invalid projectId');
```

`getClientsForSidebar` does the same by stripping `, ( ) \ *` from search input
(`lib/db/clients.ts:92`).

### Member-level scoping

A non-admin sees only their assigned projects. Each module has a parallel query set:

| Full-org | Member-scoped |
|---|---|
| `getProjects()` | `getProjectsByMember(memberId)` |
| `getTasksWithAssignees()` | `getTasksWithAssigneesByMember(memberId)` |
| `getClients()` | `getClientsByMember(memberId)` |
| `getInvoices()` | `getInvoicesByMember(memberId)` |
| `getTaskStats()` | `getTaskStatsByMember(memberId)` |

Member-scoped task queries use `assignee_id.eq.X OR project_id.in.(…)` — assigned
directly **or** on the project.

Assignment happens automatically too: assigning a task to someone upserts them into
`project_members` for that project (`lib/db/tasks.ts:193`, `tasks/actions.ts:41`).

---

## Auth flows

### Login

One page, `/login`, two possible identities. Server action `signInAction`
([`app/(auth)/login/actions.ts:19`](<../app/(auth)/login/actions.ts>)):

```
1. Rate limit by IP           → 5 attempts / 15 min
2. Run in PARALLEL:
     supabase.auth.signInWithPassword({ email, password })
     supabaseAdmin.from('clients').select('id, portal_password').eq('email', email)
3. If Supabase auth succeeded:
     look up team_members row by email
       has org_id?  → redirect /{slug}
       no org_id?   → try user_metadata.org_id, auto-repair the row, redirect
       still none?  → redirect /setup-org
4. If auth failed with "email not confirmed" → show a specific message
5. Else if the clients row matched and bcrypt.compare(password, portal_password):
     set portal_client_id cookie (httpOnly, 7 days)
     set portal_csrf_token cookie
     redirect /portal/tasks
6. Else → "Invalid email or password."
```

Both lookups run in parallel so a wrong password costs one round trip, not two.

### Signup

The important design decision: **the workspace is not created until the email is
verified.** This stops an unverified signup from squatting on a slug or leaving
orphan rows.

```
POST /signup  → signupAction   (app/(auth)/signup/actions.ts)
  1. Rate limit (10 / 15 min)
  2. Validate: company ≥2 chars, slug matches ^[a-z0-9]+(-[a-z0-9]+)*$,
     name ≥2, email format, password ≥8, passwords match, terms checked
  3. Slug not already in organisations
  4. Email not already a team_members row WITH an org_id
  5. Delete any leftover auth user / orphan org from a previous failed attempt
  6. supabase.auth.signUp() with metadata:
       { full_name, company_name, slug, user_role:'admin',
         is_owner:true, signup_pending:true }
     emailRedirectTo = ${NEXT_PUBLIC_SITE_URL}/auth/confirm
  7. Delete any rows a DB trigger auto-created for the unverified user
  8. Return { success:true } — show "check your inbox"

User clicks the email link → /auth/confirm
  → client sets the session from the hash fragment
  → calls provisionSignupAction()   (app/auth/confirm/actions.ts)
       a. re-check slug is still free
       b. INSERT organisations { name, slug, plan:'free' }
       c. seedDefaultStatuses(orgId)   → todo / in_progress / done
       d. UPSERT team_members { id:user.id, org_id, name, email,
                                user_role:'admin', is_owner:true }
          (on failure: DELETE the org — rollback)
       e. clear signup_pending, store org_id in auth metadata
       f. send welcome email (non-blocking)
       g. redirect /{slug}
```

`POST /api/auth/provision-workspace` does the same thing over HTTP. Both paths exist;
the server action is what `/auth/confirm` calls.

### Team invites

`addTeamMemberAction` ([`app/dashboard/team-members/actions.ts:39`](../app/dashboard/team-members/actions.ts))
requires an admin, then:

1. `supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: /auth/confirm })`
2. Insert `team_members` with the **inviting admin's** `org_id`
3. `replaceProjectAssignments(userId, projectIds)`

Role changes are owner-only, and the current role is read from the DB, never from
the form (`team-members/actions.ts:129`). You cannot delete yourself or the owner.

### Portal sessions

Portal auth is **not** Supabase Auth. It is two cookies:

| Cookie | Purpose | Flags |
|---|---|---|
| `portal_client_id` | Which client is logged in | httpOnly, sameSite lax, 7 days, secure in prod |
| `portal_csrf_token` | 32 random bytes, hex | same |

Middleware rejects any `/portal/*` request missing either cookie. Every portal
mutation calls `verifyCsrfToken(formData)` ([`lib/csrf.ts:35`](../lib/csrf.ts)), which
does a constant-time comparison against the cookie.

Cross-session blocking is symmetric:
- a `portal_client_id` cookie on a workspace route → redirect to `/portal/tasks`
- no Supabase session on a workspace route → clear `sb-*` cookies, redirect to `/login`

---

## Task statuses (custom board columns)

`task_statuses` rows define kanban columns. The scope column is the interesting part:

| `project_id` | Meaning |
|---|---|
| `NULL` | **Org-wide.** Shows on the global `/tasks` page and on every project board |
| a UUID | **Project-scoped.** Shows only on that project's board |

`tasks.status` stores the **slug string**, not a foreign key. That is why
`(org_id, slug)` is UNIQUE — the slug has to point at exactly one status row across
the whole org, even though the same org may hold both org-wide and project-scoped rows.

Consequences handled in [`lib/db/task-statuses.ts`](../lib/db/task-statuses.ts):

- **Position bookkeeping is per-scope.** Inserting a project-scoped column must not
  shift the org-wide columns' positions, and the other way round.
- **New columns insert before "Done"** — `donePosition` is found, then everything at or
  after it shifts up by one.
- **Deleting a column moves its tasks to `todo`**, scoped to that project if the column
  was project-scoped. Default columns cannot be deleted.
- **Moving a task** (`updateTaskStatusAction`) checks the target column is either
  org-wide or belongs to the same project as the task.

---

## Security measures in place

| Measure | Where |
|---|---|
| Security headers + CSP | `middleware.ts:5` — `X-Frame-Options: DENY`, `nosniff`, HSTS, `frame-ancestors 'none'`, CSP allowing only self + `*.supabase.co` + `api.brevo.com` |
| Rate limiting | `lib/rate-limit.ts` — sliding window per `prefix:key`. login 5/15min, signup 10/15min, portal-login 5/15min, PDF 10/5min, email 10/5min |
| CSRF on portal | `lib/csrf.ts` — constant-time compare |
| Portal passwords | bcrypt hashed in `clients.portal_password` |
| Open-mailer guard | `/api/send-email` refuses any recipient who is not a `team_members` or `clients` row inside the caller's own `org_id` |
| Email body cap | 512 KB |
| Filter-injection guards | UUID regex on `.or()` interpolation; special chars stripped from search |
| Service-role key | Server-only. Never imported into a `"use client"` file |

**Known weakness:** the rate limiter is a `Map` in process memory. On Vercel, each
serverless instance holds its own counter, so the effective limit is
`configured × number of warm instances`.

---

## Delete workspace

Owner-only, GitHub style: type the workspace name to confirm. `deleteWorkspaceAction`
([`app/dashboard/settings/actions.ts:71`](../app/dashboard/settings/actions.ts)) deletes
in FK-safe order because several foreign keys are `NO ACTION`, not `CASCADE`:

```
comments (by task_id)  →  files (by task_id)
  →  tasks.assignee_id = NULL      (unblocks team_members delete)
  →  project_members  →  tasks  →  invoices  →  projects
  →  clients  →  team_members  →  organisations
  →  finally: delete every Supabase Auth user in the org
```

Auth users are deleted last so those emails can sign up again afterwards.

---

## Related docs

- [03-database.md](03-database.md) — the tables this all operates on
- [04-api-reference.md](04-api-reference.md) — every action and route by name
