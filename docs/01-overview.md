# 01 — Project Overview

## What it is

Nexus is a **multi-tenant project management tool with a built-in client portal**.
It replaces two tools at once: a task tracker (ClickUp / Linear) for the internal
team, and a client-facing portal (GetOrchestra) for the people paying for the work.

One company signs up → gets a **workspace** (an `organisations` row) → invites team
members → adds clients, projects, tasks, and invoices. Every row in every table
carries an `org_id`, so no workspace can ever see another workspace's data.

## Two kinds of user

| User type | How they log in | What they see | Session |
|---|---|---|---|
| **Team member** | Supabase Auth (email + password) | The full workspace at `/{slug}/*` | Supabase `sb-*` cookies |
| **Client** | Same `/login` page, but matched against `clients.portal_password` (bcrypt) | Only `/portal/*` — their own tasks, files, invoices | `portal_client_id` + `portal_csrf_token` cookies |

Both use the **same login form**. The server tries Supabase Auth first; if that
fails it checks the `clients` table. See [02-architecture.md](02-architecture.md#login).

## Roles inside a workspace

| Field | Values | Meaning |
|---|---|---|
| `team_members.user_role` | `admin` \| `member` | Admins can invite, edit, and remove team members |
| `team_members.is_owner` | `true` \| `false` | Exactly one owner per workspace. Only the owner can delete the workspace or change anyone's role |

Non-admin members do **not** see everything. They see only the projects they are
assigned to via the `project_members` table — plus tasks assigned directly to them.
Every `lib/db` module has a matching `…ByMember(memberId)` query for this.

## Feature list (what actually exists in the code)

### Workspace side — `/{slug}/*`

- **Overview dashboard** — task stats (total / done / overdue / due soon), recent tasks
- **Projects** — list (paginated), detail page, and a per-project **kanban board**
- **Tasks** — global list, kanban board, task detail with comments and file uploads
- **Custom board columns** — beyond `todo` / `in_progress` / `done`, a workspace can add
  its own columns, either org-wide or scoped to a single project
- **Tags** — coloured labels attached to tasks, shared across the workspace
- **Clients** — list, detail, portal password reset
- **Invoices** — list, detail, **PDF generation** stored in Supabase Storage
- **Team members** — invite by email (Supabase invite), edit role, assign to projects, remove
- **Settings** — profile, change password, and a GitHub-style **delete workspace** flow
- **Search command palette** — cross-entity search in the sidebar
- **Light / dark theme** — dark is the default, toggle via `next-themes`

### Client portal — `/portal/*`

- Task list and task detail (read-only status, but the client **can comment**)
- Invoice list with PDF links
- File list across all their tasks
- Portal settings (change their own portal password)

### Auth and email

- Signup with workspace slug reservation
- Email verification **before** the workspace is created (see [02-architecture.md](02-architecture.md#signup))
- Forgot password / reset password
- Team invites via Supabase
- Welcome email via Brevo

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui on Radix primitives |
| Fonts | Geist (`geist` package) |
| Icons | `lucide-react` |
| Drag & drop | `@hello-pangea/dnd` (kanban) |
| Database / Auth / Storage | Supabase (PostgreSQL) |
| PDF | `@react-pdf/renderer` |
| Password hashing | `bcryptjs` (portal passwords only) |
| Email | Brevo (SMTP for Supabase auth mail, HTTP API for app mail) |
| Hosting | Vercel |

## Current status

- Branch `main`, working tree clean, remote `git@github.com:ZamarMasood/nexus-app.git`
- Latest commit: `157c8fe` — *"Add tags + per-project boards, confirm dialog, security fixes, form preloading"*
- The three build phases named in `CLAUDE.md` (internal tasks → client portal → CRM/invoices)
  are all present in the code. Invoicing exists but has no payment provider wired up.

## Known gaps and stale items

These are facts about the repo as it stands, not bugs to fix right now.

1. **`docs/schema.sql` is out of date.** It has no `org_id`, no `organisations`,
   `task_statuses`, `tags`, `task_tags`, or `project_members`. [03-database.md](03-database.md)
   is the accurate description.
2. **`docs/design-tokens.md` is out of date.** It documents `--color-base`,
   `--color-primary` etc. Those variables do not appear in `app/globals.css` any more.
   The live tokens are `--bg-*`, `--text-*`, `--accent`, `--priority-*`.
3. **`@anthropic-ai/sdk` is in `package.json` but never imported.** No AI feature ships today.
4. **Rate limiting is in-memory** (`lib/rate-limit.ts`). On Vercel each serverless
   instance keeps its own counter, so the real limit is looser than the configured number.
5. **No automated tests.** There is no test runner in `package.json`.
6. **`getPortalTaskStatuses`** in `lib/db/portal.ts` fetches every status in the client's
   org (scope `"all"`), including columns scoped to other projects.

## Related docs

- [02-architecture.md](02-architecture.md) — how the routing and auth actually work
- [06-notes2board-integration.md](06-notes2board-integration.md) — the planned link to notes2board
