# 05 — Setup and Deploy

## What you need

- Node.js 18+
- A Supabase project (PostgreSQL + Auth + Storage)
- A Brevo account (for email)
- A Vercel account (for deploy)

---

## Environment variables

Copy the example file and fill it in:

```bash
cp .env.local.example .env.local
```

| Variable | Where it is used | Safe in the browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Everywhere | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + middleware; RLS applies | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase-admin.ts` only | **No — bypasses RLS** |
| `NEXT_PUBLIC_SITE_URL` | Email redirect links (`/auth/confirm`) | Yes |
| `BREVO_API_KEY` | `/api/send-email` | **No** |
| `BREVO_SENDER_EMAIL` | Sender address. Must be verified in Brevo | — |
| `BREVO_SENDER_NAME` | Display name | — |

`NEXT_PUBLIC_SITE_URL` must exactly match what is set in
**Supabase Dashboard → Authentication → URL Configuration**. If it does not, every
confirmation and reset link lands on the wrong host and silently fails.

**Never import `SUPABASE_SERVICE_ROLE_KEY` into a file with `"use client"` at the top.**
It bypasses row-level security entirely.

---

## Run it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build          # production build
npm run start          # serve the production build
npm run lint           # ESLint
npx tsc --noEmit       # type check — run before every commit
npm run preview:emails # renders email templates to .email-previews/
```

---

## Supabase setup

### 1. Database

Create the tables described in [03-database.md](03-database.md).

> `docs/schema.sql` is a stale early draft — it has no `org_id` and is missing five
> tables. Do not run it against a fresh project expecting a working app.

Then run the one current migration:

```sql
-- docs/migration-task-statuses-project-scope.sql
ALTER TABLE task_statuses
  ADD COLUMN IF NOT EXISTS project_id UUID NULL
    REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS task_statuses_project_id_idx
  ON task_statuses(project_id);
```

### 2. Helper functions and RLS

Create the three SQL helpers and enable RLS on every table:

```sql
CREATE FUNCTION get_org_id() RETURNS uuid AS $$
  SELECT org_id FROM team_members WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM team_members
                 WHERE id = auth.uid() AND user_role = 'admin')
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_owner() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM team_members
                 WHERE id = auth.uid() AND is_owner = true)
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Policies for `authenticated` enforce `org_id = get_org_id()`. `anon` gets nothing.
`organisations` additionally has `owner_update_own_org` and `owner_delete_own_org`,
both requiring `is_owner() AND id = get_org_id()`.

### 3. Storage buckets

Create two buckets, both **public**:

| Bucket | Holds |
|---|---|
| `invoices` | Generated invoice PDFs, named `{invoiceId}.pdf` |
| `project-files` | Task attachments at `tasks/{taskId}/{timestamp}-{filename}` |

### 4. Auth

- Enable email/password
- Turn on email confirmation
- Set the site URL and redirect URLs to match `NEXT_PUBLIC_SITE_URL`
- Point SMTP at Brevo and paste in the templates —
  see [supabase-email-setup.md](supabase-email-setup.md)

### 5. Type generation

After any schema change:

```bash
supabase gen types typescript > lib/types.ts
```

`project_members`, `task_statuses`, `tags`, and `task_tags` are newer than the last
generation, which is why several queries cast `supabaseAdmin as any`. Regenerating
lets those casts go.

---

## Email

Two separate paths — this trips people up:

| Email | Sent by | Configured where |
|---|---|---|
| Signup confirmation, password reset, team invite | **Supabase**, over Brevo SMTP | Supabase Dashboard → Auth → SMTP + Email Templates |
| Welcome email, any app-triggered mail | **Your app**, via Brevo HTTP API through `/api/send-email` | `BREVO_API_KEY` env var |

In development `/api/send-email` logs to the console and sends nothing. If
`BREVO_API_KEY` is missing in production it returns `{ mode: 'stub' }` and still sends
nothing — a silent no-op, so check the key is set.

Preview the templates:

```bash
npm run preview:emails   # writes HTML into .email-previews/
```

---

## Deploy (Vercel)

1. Connect the GitHub repo (`git@github.com:ZamarMasood/nexus-app.git`, branch `main`)
2. Add every environment variable in the Vercel project settings
3. Push — Vercel builds and deploys automatically

`next.config.mjs` allows `next/image` to load from any HTTPS host, which is what makes
Supabase-hosted avatars work.

### After deploying

Check these, because they break quietly:

- `NEXT_PUBLIC_SITE_URL` matches the real domain **and** the Supabase URL config
- `BREVO_SENDER_EMAIL` is verified in Brevo → Senders & IPs
- Both storage buckets exist
- The CSP in `middleware.ts` allows every host you actually call. Today it permits
  `*.supabase.co` and `api.brevo.com` only

---

## Local gotchas

| Symptom | Cause |
|---|---|
| `Failed to fetch team member: Could not query the database for the schema cache` | The Supabase project is paused or restarting. Free-tier projects sleep after about a week. Open the dashboard and restore it — this is not a code bug |
| Confirmation email link goes to `localhost` in production | `NEXT_PUBLIC_SITE_URL` not set on Vercel |
| `No organisation found for this account` | The `team_members` row has `org_id = NULL`. Log in — you will be redirected to `/setup-org` |
| Rate limit feels much looser than configured | Expected. The limiter is in-memory per serverless instance |
| Emails never arrive in dev | Expected. Dev mode logs instead of sending |

---

## Commands you should not run without asking

Per the project working rules, builds, servers, and deploys are run by the owner:

```bash
npm run build     # ask first
npm run dev       # ask first
git commit / git push / vercel deploy   # ask first
```

---

## Related docs

- [03-database.md](03-database.md) — the schema to create
- [supabase-email-setup.md](supabase-email-setup.md) — Brevo + Supabase email templates
