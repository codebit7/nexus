# 06 — notes2board Integration (built, then removed)

> **Status: removed from the codebase on 2026-08-06.** Kept as a record of what
> existed and why it went.
>
> **Timeline**
> 1. Designed in an earlier session, left unbuilt (this document's original state)
> 2. Built 2026-08-04 — `integration_keys` table, `/api/integrations/notes2board`
>    (POST ingest + GET projects), `lib/db/integration-keys.ts`,
>    `lib/integration-auth.ts`, and an Integrations section in Settings
> 3. **Removed 2026-08-06.** The requirement was always to merge notes2board's
>    features *into* nexus-app, not to connect two separate apps. An API key only
>    exists because the apps are separate — a merged app has nothing to connect.
>
> **Replaced by:** the in-app Meeting Notes feature — upload a transcript at
> `/{slug}/notes`, AI extracts the tasks, they are created in a project directly.
> See [07-merge-notes2board-plan.md](07-merge-notes2board-plan.md).
>
> **Consequence:** notes2board's "send to nexus-app" now fails with a 404. That app
> was deliberately left untouched. Its `nexus-push` function and connection
> settings still exist and still point at the deleted endpoint.
>
> **Still in the database:** the `integration_keys` table was not dropped. Removing
> a table is destructive and needs a deliberate decision; the code that used it
> is gone, so it is inert.
>
> Everything below describes the removed design, unchanged.

## Where this came from

Both apps live under `d:\Job\Projects\Nexus Root\` and are owned by the same team:

- **notes2board** turns meeting notes and call transcripts into tasks, then pushes
  them into Trello.
- **nexus-app** is this project management tool.

The idea: add nexus-app as a second destination alongside Trello, so a meeting can
become tasks directly on a nexus-app project board.

See the notes2board side of this at
[`../../notes2board/docs/06-nexus-app-integration.md`](../../notes2board/docs/06-nexus-app-integration.md).

---

## The problem

notes2board runs as a separate application with its own users and its own Supabase
project. It has no Supabase session for a nexus-app workspace, so it cannot use any
existing server action or the `getCallerOrgId()` path. It needs a machine-to-machine
credential that identifies **which workspace** and **which project** the tasks belong to.

The obvious wrong answer is letting notes2board send `org_id` and `project_id` in the
request body. That turns a leaked key into a cross-workspace write. The design below
derives both from the key instead.

---

## How it would work

```
1. A workspace opens Settings → Integrations
2. They create a "notes2board key" and pick ONE target project
3. The key is shown once, then only its prefix is ever displayed again
4. They paste the key into notes2board
5. notes2board turns a meeting into tasks and POSTs them to nexus-app
6. nexus-app hashes the key, finds the row, reads org_id + project_id from it,
   and inserts the tasks
7. The tasks appear on that project's board
```

---

## 1. New table — `integration_keys`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `org_id` | UUID FK → organisations | Where the tasks land |
| `project_id` | UUID FK → projects | Fixed target, chosen at key creation |
| `name` | TEXT | Human label, e.g. "Weekly standup" |
| `key_hash` | TEXT | Hash of the key. The raw key is never stored — same rule as `clients.portal_password` |
| `key_prefix` | TEXT | First few characters, so the UI can show `ntb_a1b2…` |
| `last_used_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `revoked_at` | TIMESTAMPTZ | Nullable. Non-null means the key is dead |

RLS: scoped to `org_id` like every other table (see [03-database.md](03-database.md)).

---

## 2. New endpoint — `POST /api/integrations/notes2board`

**Auth:** `Authorization: Bearer ntb_xxx`

**Request body** (batch, because one meeting produces many tasks):

```json
{
  "tasks": [
    {
      "title": "Send proposal to client",
      "description": "Agreed in the Tuesday call. Include the revised timeline.",
      "priority": "high",
      "due_date": "2026-08-10"
    }
  ]
}
```

**Field mapping to the `tasks` table:**

| Incoming | Column | Rule |
|---|---|---|
| `title` | `title` | Required. Length-capped |
| `description` | `description` | Optional |
| `priority` | `priority` | Must be `urgent` \| `high` \| `normal` \| `low`. Defaults to `normal` |
| `due_date` | `due_date` | Optional, `YYYY-MM-DD` |
| — | `status` | Always `todo` |
| — | `assignee_id` | Always `null` — notes2board does not know nexus-app member ids |
| — | `org_id`, `project_id` | **From the key row. Never from the request** |

**Server steps:**

```
1. Read the bearer token
2. Hash it, look up the integration_keys row
3. Reject if not found or revoked_at IS NOT NULL          → 401
4. Rate limit per key using lib/rate-limit.ts             → 429
5. Validate every task; cap the batch size                → 400
6. Insert with supabaseAdmin, org_id + project_id from the key row
7. Update last_used_at
8. Return { created: n, taskIds: [...] }
```

`/api/*` already passes through middleware as an `'other'` route, so nothing in the
auth flow needs changing.

---

## 3. Settings UI

A new **Integrations** section on the existing settings page:

- **Create notes2board key** → name it, pick a project → the key is shown once with a
  copy button and a "you will not see this again" warning
- **Key list** — name, prefix, target project, last used, and a **Revoke** button

Revoking sets `revoked_at`; the endpoint then rejects the key.

---

## 4. Change needed on the notes2board side

Add a destination selector next to Trello. Instead of calling `add_card_to_list` on
the `trello-api` edge function, POST the task array to the nexus-app endpoint with the
stored key. Same review-and-edit screen, different push target.

---

## Security properties

| Property | How |
|---|---|
| Key leak cannot reach another workspace | `org_id` and `project_id` come from the key row, never the request |
| Key theft is limited to one project | Each key is bound to one project at creation |
| Stored key is useless if the DB leaks | Only the hash is stored |
| Compromised key can be cut off | `revoked_at` |
| Abuse is bounded | Per-key rate limit, batch size cap, title length cap |
| Injected values cannot break queries | `priority` validated against a fixed list; `due_date` format-checked |

---

## Open questions

These were not settled before the session ended:

1. **Hash algorithm.** `bcrypt` matches the existing portal-password pattern but cannot
   be looked up by index — every request would have to scan candidate rows. A plain
   SHA-256 of a high-entropy key is indexable and is the usual choice for API keys.
   This needs a decision before implementation.
2. **Duplicate submissions.** If notes2board retries, the same meeting could create
   the tasks twice. An idempotency key per batch would fix it.
3. **Assignees.** Currently always `null`. Mapping a name from a transcript to a
   nexus-app team member is a separate, harder problem.
4. **Which side owns the mapping UI** if a workspace wants more than one project as a
   target — one key per project, or one key with a project chosen per request
   (which reopens the trust problem).

---

## Related docs

- [03-database.md](03-database.md) — where `integration_keys` would sit
- [04-api-reference.md](04-api-reference.md) — the existing API route patterns to follow
- [`../../notes2board/docs/06-nexus-app-integration.md`](../../notes2board/docs/06-nexus-app-integration.md) — the same plan from the notes2board side
