# Nexus App — Documentation

Full documentation for the Nexus project management + client portal app.

Written 2026-08-03 from a read of the codebase at commit `157c8fe` (branch `main`).

## Read in this order

| Doc | What it covers |
|---|---|
| [01-overview.md](01-overview.md) | What the product is, who uses it, feature list, current status |
| [02-architecture.md](02-architecture.md) | Routing, middleware, auth flows, multi-tenancy, data access, security |
| [03-database.md](03-database.md) | Every table, column, relationship, and storage bucket |
| [04-api-reference.md](04-api-reference.md) | API routes, server actions, and `lib/db` helper functions |
| [05-setup-and-deploy.md](05-setup-and-deploy.md) | Environment variables, local run, Supabase setup, deploy |
| [06-notes2board-integration.md](06-notes2board-integration.md) | Proposed (not built) integration with the notes2board app |

## Other files in this folder

| File | Status |
|---|---|
| `schema.sql` | **Stale.** Pre-multi-tenant. Use [03-database.md](03-database.md) instead. |
| `design-tokens.md` | **Stale.** Describes `--color-*` tokens that no longer exist in `app/globals.css`. |
| `migration-task-statuses-project-scope.sql` | Current. Adds `project_id` to `task_statuses`. |
| `supabase-email-setup.md` | Current. Brevo SMTP + Supabase email template setup. |
| `qa-log.md` | Historical QA run log (2026-03-14). |

## The one-paragraph version

Nexus is a multi-tenant SaaS for agencies: one workspace per company, isolated by
`org_id`. Inside a workspace, a team manages clients, projects, tasks (kanban),
team members, and invoices. Each client also gets a read-mostly portal at
`/portal/*` where they see only their own tasks, files, and invoices. Built on
Next.js 14 App Router with Supabase for database, auth, and storage.
