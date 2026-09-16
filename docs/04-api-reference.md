# 04 — API Reference

Every route, server action, and data-access helper, with what it takes and what it
guards.

---

## URL map

### Public / auth

| URL | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Marketing landing page |
| `/login` | `app/(auth)/login/page.tsx` | Shared login — team **and** client |
| `/signup` | `app/(auth)/signup/page.tsx` | Create workspace |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Request reset email |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Set new password |
| `/setup-org` | `app/(auth)/setup-org/page.tsx` | For a member whose `org_id` is `NULL` |
| `/auth/callback` | `app/auth/callback/route.ts` | Supabase code exchange |
| `/auth/confirm` | `app/auth/confirm/page.tsx` | Post-verification — provisions the workspace |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | Hash-fragment reset landing |

### Workspace — `/{slug}/*` (rewritten to `/dashboard/*`)

| URL | Purpose |
|---|---|
| `/{slug}` | Overview: task stats + recent tasks |
| `/{slug}/projects` | Paginated project list |
| `/{slug}/projects/[id]` | Project detail |
| `/{slug}/projects/[id]/board` | Per-project kanban |
| `/{slug}/tasks` | Global task list + board |
| `/{slug}/tasks/[id]` | Task detail: comments, files, tags |
| `/{slug}/clients` | Client list |
| `/{slug}/clients/[id]` | Client detail + portal password reset |
| `/{slug}/invoices` | Invoice list |
| `/{slug}/invoices/[id]` | Invoice detail + PDF |
| `/{slug}/team-members` | Admin only: invite, edit, remove, assign projects |
| `/{slug}/settings` | Profile, password, delete workspace |

### Client portal — `/portal/*`

| URL | Purpose |
|---|---|
| `/portal/login` | Portal-only login form |
| `/portal/tasks` | The client's tasks |
| `/portal/tasks/[id]` | Task detail + comment form |
| `/portal/invoices` | The client's invoices |
| `/portal/files` | Every file across the client's tasks |
| `/portal/settings` | Change portal password |
| `/portal/logout` | Clears cookies (route handler) |

---

## HTTP API routes

### `GET /api/me`

Returns the signed-in team member's display name.

- **Auth:** Supabase session required
- **200** `{ "name": "Zamar" }` (or `{ "name": null }`)
- **401** `{ "error": "Unauthorized" }`

---

### `POST /api/send-email`

Sends a transactional email. Brevo HTTP API in production, console log in development.

- **Auth:** Supabase session required
- **Rate limit:** `send-email:<userId>` — 10 per 5 min
- **Body:** `{ to: string, subject: string, html: string }`

Validation:

| Check | Failure |
|---|---|
| All three fields present | 400 |
| `to` matches the email regex | 400 `Invalid email address` |
| `html` ≤ 512,000 chars | 400 `Email body too large` |
| **`to` is a `team_members` or `clients` row in the caller's own `org_id`** | 400 `Recipient must be a member or client of your workspace.` |

That last check is the open-mailer guard — without it any logged-in user could send
arbitrary HTML to any address from your verified sender domain.

Responses: `{ success: true, mode: 'development' \| 'stub' \| 'brevo' }`, or **502**
`Email delivery failed`.

Env used: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`.

> Supabase auth emails (confirmation, reset, invite) do **not** go through this route.
> They are sent by Supabase over Brevo SMTP configured in the Supabase dashboard.
> See [supabase-email-setup.md](supabase-email-setup.md).

---

### `POST /api/generate-invoice-pdf`

Renders an invoice to PDF, uploads it, and stores the public URL.

- **Auth:** Supabase session required
- **Rate limit:** `generate-pdf:<userId>` — 10 per 5 min
- **Body:** `{ invoiceId: string }`

Flow:

```
getInvoiceById(invoiceId)          ← org-scoped, so cross-org ids 404 here
  → getClientByIdForPortal(client_id)
  → renderToBuffer(<InvoicePDFTemplate invoice client />)
  → storage.from('invoices').upload(`${invoiceId}.pdf`, buffer, { upsert: true })
  → getPublicUrl()
  → updateInvoice(invoiceId, { pdf_url })
```

- **200** `{ pdf_url, invoice }`
- **400** missing/invalid `invoiceId`, or the invoice has no client
- **401 / 429 / 500**

---

### `POST /api/auth/provision-workspace`

Creates the organisation + team member row after email verification, from the
metadata stored on the auth user.

- **Auth:** Supabase session required
- **Rate limit:** `provision:<ip>` — 5 per 15 min
- **Body:** none
- **200** `{ ok: true }` — also returned if already provisioned (safe on refresh)
- **400** missing signup metadata
- **409** slug was taken while awaiting verification
- **500** org or member creation failed (org creation is rolled back)

---

## Server actions

All are `'use server'`. Actions used with `useFormState` take `(prevState, formData)`.

### Auth

| Action | File | Guards |
|---|---|---|
| `signInAction(prev, formData)` | `app/(auth)/login/actions.ts` | Rate limit 5/15min by IP |
| `signOutAction()` | same | Clears Supabase session + portal cookies |
| `signupAction(prev, formData)` | `app/(auth)/signup/actions.ts` | Rate limit 10/15min, full field validation, slug + email uniqueness |
| `forgotPasswordAction(prev, formData)` | `app/(auth)/forgot-password/actions.ts` | Rate limit `forgot-pw` 5/15min |
| `setupOrgAction(prev, formData)` | `app/(auth)/setup-org/actions.ts` | Rate limit `setup-org` 5/15min |
| `provisionSignupAction()` | `app/auth/confirm/actions.ts` | Session required; rolls back the org if the member insert fails |
| `portalSignInAction(prev, formData)` | `app/portal/login/actions.ts` | Rate limit `portal-login` 5/15min, bcrypt compare |

### Tasks

| Action | Signature | Notes |
|---|---|---|
| `createTaskAction` | `(payload: Omit<TaskInsert,'org_id'>) → Task` | Verifies `project_id` and `assignee_id` belong to the caller's org. Auto-adds the assignee to `project_members` |
| `updateTaskStatusAction` | `(taskId, status) → {error} \| null` | Verifies the target status is org-wide or scoped to the task's own project |
| `createCustomStatusAction` | `(label, color, projectId = null) → {status?, error?}` | Slugifies the label (`"In Testing"` → `in_testing`), rejects duplicate slugs across the whole org, verifies `projectId` ownership |
| `deleteCustomStatusAction` | `(statusId) → {error?}` | Refuses default statuses. Moves affected tasks to `todo` |
| `createCommentAction` | `app/dashboard/tasks/[id]/actions.ts` | |
| `uploadFileAction` | `(formData) → ProjectFile` | Uploads to the `project-files` bucket |

Tag actions live in `app/dashboard/tasks/tag-actions.ts`.

### Projects / clients / invoices

| Action | Notes |
|---|---|
| `createProjectAction` | |
| `fetchProjectsPageAction(page, pageSize)` | Client-side pagination |
| `searchProjectsForSidebarAction(search, page = 0)` | |
| `createClientAction(payload)` | |
| `updateClientAction` | |
| `resetPortalPasswordAction` | Generates + bcrypt-hashes a new portal password |
| `fetchClientsPageAction(page, pageSize)` | |
| `searchClientsForSidebarAction(search, page = 0)` | Strips PostgREST filter specials from input |
| `createInvoiceAction` / `updateInvoiceAction` | |
| `fetchInvoicesPageAction` / `searchInvoicesForSidebarAction` | |

### Team members — all require admin

`requireAdmin()` throws unless the caller's `user_role` is `admin`.

| Action | Extra guards |
|---|---|
| `addTeamMemberAction` | Email format, email not already used. Sends a Supabase invite |
| `editTeamMemberAction` | Only the owner may change roles. Only the owner may edit the owner. The owner's role cannot change. Current role is read from the DB, never the form |
| `deleteTeamMemberAction` | Cannot delete yourself. Cannot delete the owner. Target must be in your org. Deletes the Auth user, nulls `tasks.assignee_id`, then deletes the row |
| `fetchTeamMembersPageAction(page, pageSize)` | |

### Settings

| Action | Notes |
|---|---|
| `updateProfileAction` | Name + avatar. Revalidates the dashboard layout so the sidebar updates |
| `updatePasswordAction` | Rate limit `change-pw` 5/15min, min 8 chars, must match confirm |
| `deleteWorkspaceAction` | **Owner only.** Requires typing the exact workspace name. Full cascade — see [02-architecture.md](02-architecture.md#delete-workspace) |

### Portal

| Action | Notes |
|---|---|
| `submitPortalComment` | Requires a valid CSRF token |
| `updateClientProfileAction` | |
| `updateClientPasswordAction` | |

### Dashboard shell

| Action | Notes |
|---|---|
| `revalidateDashboard()` | `revalidatePath('/dashboard', 'layout')` |
| `fetchSearchData(): SearchResult[]` | Feeds the command palette |

---

## Data access layer — `lib/db/`

Every function here is `'use server'`. Unless noted, each one calls `getCallerOrgId()`
and filters `.eq('org_id', orgId)`.

### `team-members.ts`

```ts
getCallerOrgId(): Promise<string>                  // throws if unauthenticated / no org
getTeamMembers(): TeamMember[]
getTeamMembersWithProjects(): TeamMemberWithProjects[]
getTeamMembersWithProjectsPaginated(page, pageSize, orgIdOverride?)
getTeamMemberByEmail(email): TeamMember | null     // NOT org-scoped — used during login
getIsAdminByEmail(email): boolean
getIsOwnerById(id): boolean
getOrgSlugById(orgId): string | null
updateTeamMember(id, { name?, avatar_url?, role? })
updateTeamMemberFull(id, { name, user_role })
insertTeamMember({ id, name, email, role, user_role, org_id? })
deleteTeamMember(id)
replaceProjectAssignments(memberId, projectIds)    // verifies every project is in-org
```

### `tasks.ts`

```ts
getTasks(projectId?)
getTasksWithAssignees(projectId?)                  // + comment_count
getRecentTasksWithAssignees(limit = 10)
getTaskStats(): { total, done, overdue, dueSoon }
getTaskCountsByProject(): Record<projectId, { total, done }>
getTaskById(id) / getTaskByIdWithAssignee(id)
createTask(task) / updateTask(id, updates) / deleteTask(id)
getCommentsByTaskId(taskId) / createComment(taskId, content, userId?)
getFilesByTaskId(taskId) / uploadFileToTask(taskId, file)
getTasksByAssignee(assigneeId): TaskSidebarItem[]

// member-scoped
getTasksWithAssigneesByMember(memberId)
getRecentTasksWithAssigneesByMember(memberId, limit = 10)
getTaskStatsByMember(memberId)
getTaskCountsByProjectFiltered(projectIds)
```

`updateTask` has a side effect: setting `assignee_id` upserts that member into
`project_members` for the task's project.

### `projects.ts`

```ts
getProjects(clientId?) / getProjectsForList(clientId?)
getProjectsForSidebar(pageSize = 5, search?, page = 0)
getProjectsPaginated(page, pageSize, clientId?, orgIdOverride?)
getProjectById(id) / createProject(p) / updateProject(id, updates)
getProjectsByMember(memberId) / getProjectsForListByMember(memberId)
getProjectsByMemberPaginated(memberId, page, pageSize)
```

### `clients.ts`

```ts
getClients() / getClientsForList()                 // never select portal_password
getClientsForSidebar(pageSize = 5, search?, page = 0)
getClientsPaginated(page, pageSize, orgIdOverride?)
getClientById(id)
getClientByIdForPortal(id)                         // NOT org-scoped — portal has no team session
createClient(c) / updateClient(id, updates)
getClientsByMember(memberId) / getClientsForListByMember(memberId)
getClientsByMemberPaginated(memberId, page, pageSize)
```

### `invoices.ts`

```ts
getInvoices(clientId?) / getInvoicesForList(clientId?)
getInvoicesForSidebar(pageSize = 5, search?, page = 0)
getInvoicesPaginated(page, pageSize, orgIdOverride?)
getInvoiceById(id) / createInvoice(i)
updateInvoice(id, updates, orgId?)                 // orgId lets the PDF route skip re-auth
getInvoicesByMember(memberId) / getInvoicesForListByMember(memberId)
getInvoicesByMemberPaginated(memberId, page, pageSize)
```

### `task-statuses.ts`

```ts
type StatusScope = "all" | { projectId: string | null }

getTaskStatuses(orgIdOverride?, scope = "all"): TaskStatusRow[]
seedDefaultStatuses(orgId)                         // todo / in_progress / done
createTaskStatus(orgId, slug, label, color, projectId = null)
deleteTaskStatus(statusId, orgId)
```

Scope meanings:

| Scope | Returns | Use on |
|---|---|---|
| `"all"` | Every status in the org | Task form preload, before the project is known |
| `{ projectId: null }` | Org-wide only | Global `/tasks` page |
| `{ projectId: "uuid" }` | Org-wide **plus** that project's own | A project board |

### `tags.ts`

```ts
getTags(orgIdOverride?): TagRow[]
getTagsForTask(taskId): TagRow[]
getTagsForTasks(taskIds): Record<taskId, TagRow[]>   // bulk, for board rendering
upsertTag(orgId, name, color)                        // idempotent by case-insensitive name
setTaskTags(taskId, tagIds)                          // replaces the whole set
```

### `portal.ts` — client-session queries

These take a `clientId` (from the cookie) instead of an `orgId`. Ownership is proved by
an **inner join through `projects.client_id`**, so a client cannot read another
client's rows even by guessing a task id.

```ts
getPortalTasks(clientId): PortalTask[]
getPortalTaskById(taskId, clientId)
getPortalTaskByIdWithProject(taskId, clientId)
getPortalTaskStatuses(clientId)
getPortalComments(taskId, clientId)
createPortalComment(taskId, content, clientId)     // user_id = clientId, author_name = client name
getPortalFilesByTaskId(taskId, clientId)
getPortalFiles(clientId): PortalFileWithContext[]  // files → tasks → projects, one query
getPortalInvoices(clientId)
```

---

## Utility modules

| File | Exports |
|---|---|
| `lib/rate-limit.ts` | `checkRateLimit(identifier)`, `formatResetTime(ms)` |
| `lib/csrf.ts` | `generateCsrfToken()`, `setCsrfCookie()`, `getCsrfToken()`, `deleteCsrfCookie()`, `verifyCsrfToken(formData)` |
| `lib/email.ts` | `sendEmail({ to, subject, html })` — posts to `/api/send-email` |
| `lib/email-templates.ts` | `getSignupConfirmEmail()`, `getPasswordResetEmail()`, `getWelcomeEmail({ memberName, companyName })`, `getTeamInviteEmail({...})` |
| `lib/utils.ts` | `cn()` — Tailwind class merge |

### Rate limit configuration

`checkRateLimit('login:1.2.3.4')` reads the prefix before the colon:

| Prefix | Limit |
|---|---|
| `login`, `forgot-pw`, `setup-org`, `change-pw`, `portal-login`, `provision` | 5 per 15 min |
| `signup` | 10 per 15 min |
| `signup-otp` | 5 per 5 min |
| `send-email`, `generate-pdf` | 10 per 5 min |

An unknown prefix means **no limit** (`{ success: true, remaining: Infinity }`).

---

## Related docs

- [02-architecture.md](02-architecture.md) — why the guards are shaped this way
- [03-database.md](03-database.md) — the tables these functions read and write
