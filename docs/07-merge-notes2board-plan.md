# Plan — bring notes2board's functionality into nexus-app

**Goal:** a user opens nexus-app, uploads a meeting transcript, AI pulls out the
tasks, the user checks them, and they are created in a project they choose.

**Constraint:** notes2board is not touched. It keeps working exactly as it does
today, including its existing push-to-nexus integration.

**Status:** plan only. Nothing built yet.

---

## 1. Why this is simpler than it looks

notes2board is a Vite app. Vite has no server, so anything needing a secret had
to become a Supabase edge function — that is why `parse-notes` exists and why the
OpenAI key lives in Supabase.

nexus-app is Next.js. **It already has a server.** So:

| notes2board needs | nexus-app needs |
|---|---|
| `parse-notes` edge function | a normal API route |
| OpenAI key in Supabase secrets | `OPENAI_API_KEY` in Vercel env |
| CORS headers | none — same origin |
| An API key to reach nexus-app | none — it *is* nexus-app |
| `nexus_connections` table | none |
| A staging `tasks` table + cleanup job | none — see §4.1 |

The whole connecting layer disappears. We are left with three real pieces: read
the file, ask the AI, save the tasks.

---

## 2. What is in scope

The flow the user described:

1. Upload `.txt`, `.md` or `.pdf` (or paste text)
2. AI extracts tasks
3. User reviews and edits them
4. User picks a project
5. Tasks are created in that project

## 2.1 What is NOT in scope

These exist in notes2board and are **not** part of this plan. Say if any are wanted:

- Trello connection and card creation
- Sprint reports and the sprint analyser
- Card history
- AI label analysis
- PowerPoint / PDF export
- The notes2board landing page and its own auth

---

## 3. Files to create

Nothing existing is modified except the sidebar and `package.json`.

### Frontend

| File | Purpose |
|---|---|
| `app/dashboard/notes/page.tsx` | Server component. Loads the projects and team members the caller may use. |
| `app/dashboard/notes/NotesClient.tsx` | The whole flow as one client component with three steps: upload → review → done. |
| `lib/file-processor.ts` | Text out of `.txt`, `.md`, `.pdf`. Ported from `notes2board/src/utils/fileProcessor.ts`. |

### Backend

| File | Purpose |
|---|---|
| `app/api/parse-notes/route.ts` | POST transcript text → returns extracted tasks. Does **not** save anything. |
| `app/dashboard/notes/actions.ts` | `createTasksFromNotesAction()` — bulk insert into the chosen project. |

### Changed

| File | Change |
|---|---|
| `app/dashboard/DashboardShell.tsx` | One new sidebar entry, "Meeting Notes", after Tasks. |
| `package.json` | Add `pdfjs-dist@^3.11.174`. |

---

## 4. Design decisions

### 4.1 Store the upload as a draft, never as fake tasks

notes2board writes AI output into its real `tasks` table with `status: 'pending'`,
converts those rows later, then runs a cleanup job to delete whatever was never
converted. That is why it needs `cleanup-tasks` and `schedule-cleanup`.

We do the opposite: **nothing enters `tasks` until the user presses create.**
The transcript and the AI's output are stored together in their own table.

New table `meeting_notes`:

| column | why |
|---|---|
| `id` | goes in the URL, so the review page is reloadable |
| `org_id` | workspace isolation, same as every other table |
| `created_by` | who uploaded it |
| `file_name`, `source` | `upload` or `paste` |
| `transcript` | the extracted text |
| `parsed_tasks` (jsonb) | exactly what the AI returned |
| `status` | `draft` or `converted` |
| `project_id` | filled in once converted |
| `created_at`, `converted_at` | |

**This is what makes a refresh safe.** After parsing, the user is at
`/dashboard/notes/<id>`. Refresh, close the tab, reopen tomorrow on another
device — the review screen reloads from that row. Nothing is lost and OpenAI is
never paid twice for the same file.

Also gained:

- **Re-parse from stored text** if the AI did badly — no re-upload
- **A history page** — past uploads, and which became tasks
- **Traceability** — every task can point back to the meeting it came from
- No orphan rows in the real `tasks` table, and **no cleanup job at all**

### 4.1.1 Retention — clear the text, keep the record

The row holds two different things, and they deserve different lifetimes.

| | Kept for | Why |
|---|---|---|
| `transcript`, `parsed_tasks` | **30 days** | Raw meeting words. Can contain pay, complaints, personal matters. Useful only in the weeks right after the meeting — re-parse, "was that in the notes?" |
| everything else | **forever** | Which tasks came from which meeting, who uploaded it, when. Small, not sensitive, and the reason for storing at all. |

After 30 days the two content columns are set to `NULL` and the row stays. The
history page still shows *"11 tasks from Team Standup, 4 Aug, uploaded by Zamar"*
— the traceability survives, the sensitive part does not.

A row is never deleted by the retention job, so no task ever loses its origin.

Also:

- `org_id` on every read, RLS on, same as every other table
- A delete action per upload, so anyone can clear a sensitive transcript at once
  rather than waiting 30 days
- The retention sweep runs as a scheduled job (`pg_cron`), not on page load

### 4.2 Assignees can actually be resolved

This is something the integration could never do.

notes2board's AI returns an assignee **name** from the transcript ("Bilal will fix
staging"). Pushing across the API, that name was useless — the two apps do not
share a member list, so `assignee_id` was always set to `null`.

Inside nexus-app we have `team_members` for the workspace. So we can match the
name the AI found against real members and pre-select the assignee, leaving it
blank when there is no confident match. The user confirms it on the review screen.

Match on lowercase full name, then on first name if exactly one member matches.
Never guess when two members share a first name.

### 4.3 Which column tasks land in

Same rule already used by the integration endpoint: read `task_statuses` for the
org, filter to rows that are org-wide or scoped to the chosen project, order by
`position`, take the first.

`app/api/integrations/notes2board/route.ts` already has `resolveLandingStatus()`.
Move it to `lib/db/task-statuses.ts` so both callers share one copy.

### 4.4 Reuse the existing insert path

`createTaskAction` in `app/dashboard/tasks/actions.ts` already verifies that the
project and assignee belong to the caller's org before inserting. The new bulk
action must do the same checks **once** for the batch, not per task, then insert
all rows in a single statement.

### 4.5 Which AI provider

Currently OpenAI `gpt-4o`. Two options:

- **OpenAI** — same prompt, same output, no changes. Needs credit on the account;
  it ran out during testing (`429 insufficient_quota`).
- **Anthropic** — `@anthropic-ai/sdk` is **already in `package.json` and unused**.
  Same prompt works with small changes.

**Needs a decision.** Either is fine technically.

### 4.6 Permissions

The project dropdown must show only projects the caller may use:

- admins → every project in the org
- members → only projects they belong to, via `project_members`

`lib/db/projects.ts` already has both queries. Use the same rule the tasks page uses.

---

## 5. Build order

Each phase leaves the app working.

### Phase 1 — File to text
Add `pdfjs-dist`. Port `fileProcessor.ts` into `lib/file-processor.ts`. Build the
upload page with drag-and-drop, a file picker, a paste-text box, and the same
limits notes2board uses: 10MB, `.txt` / `.md` / `.pdf` only.

**Done when:** dropping a PDF shows its extracted text on screen. No AI yet.

### Phase 2 — The AI route
Create `app/api/parse-notes/route.ts`. Move the prompt across verbatim — it is
tuned and works. Add:

- auth check (`getCallerOrgId()` — throws if not signed in)
- rate limit, new `parse-notes` bucket in `lib/rate-limit.ts` (AI calls cost money)
- input cap: reject transcripts over ~40,000 characters with a clear message,
  rather than sending a huge bill to OpenAI
- validate the AI's JSON before returning it — it is model output, not trusted input

**Done when:** posting a transcript returns a task list. Nothing is saved.

### Phase 3 — Review screen
Editable table: title, description, priority, due date, assignee, and a checkbox
per row. Plus the project dropdown and a "Create tasks" button.

Priority mapping — notes2board has three levels, nexus-app has four:

| AI returns | becomes |
|---|---|
| low | low |
| medium | normal |
| high | high |
| — | urgent (user can set by hand) |

**Done when:** the user can edit everything before saving.

### Phase 4 — Create the tasks
`createTasksFromNotesAction(projectId, tasks[])`:

1. `getCallerOrgId()`
2. verify the project belongs to that org, and the caller may use it
3. verify every assignee id is a member of that org
4. resolve the landing status
5. insert all rows in one statement
6. `revalidatePath('/dashboard', 'layout')`

**Done when:** tasks appear on the project board.

### Phase 5 — Finish
Sidebar entry. Loading and error states. Empty state when the AI finds nothing.
A success view linking to the project board.

---

## 6. Environment

One new variable in Vercel: `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`).

Server-side only — **never** prefixed `NEXT_PUBLIC_`. It is read inside the route
handler, which never reaches the browser.

---

## 7. Risks

| Risk | Handling |
|---|---|
| Long transcript is slow or expensive | Cap input length; show progress; cap `max_tokens` |
| AI returns malformed JSON | Already handled — regex-extract the array, fail with a clear message |
| AI invents an assignee who does not exist | Only match against real members; blank otherwise |
| PDF is scanned images, no text layer | Detect empty extraction, tell the user to paste the text instead |
| User refreshes mid-review | `sessionStorage` restore (§4.1) |
| OpenAI has no credit | Same failure notes2board hit. Decide provider first (§4.5) |
| Someone uploads a 10MB PDF of unrelated content | Cost cap plus rate limit |

---

## 8. What does NOT change

- **notes2board** — untouched, per the requirement. It keeps its own upload,
  its own AI, and its existing push into nexus-app.
- **`/api/integrations/notes2board`** — stays. Deleting it would break
  notes2board, which we are told not to change. Two ways into nexus-app will
  exist side by side until someone decides to retire the old one.
- **`integration_keys`** — stays, for the same reason.

---

## 9. Decisions taken

Answered 2026-08-05:

1. **AI provider: OpenAI.** Keep `gpt-4o` and the existing prompt. The account
   needs credit — it returned `429 insufficient_quota` during testing, and that
   will block this feature exactly as it blocked notes2board.
2. **Who can use it: everyone.** Members see only the projects they are assigned
   to; admins see every project in the workspace. Same rule as the tasks page.
3. **Store the transcript: yes.** See §4.1 — it is also what makes a page refresh
   safe, so it is doing two jobs.
4. **Old integration endpoint: keep for now.** `/api/integrations/notes2board`
   and `integration_keys` stay so notes2board keeps working. Revisit once this
   feature is live and in use.

## 10. Still open

- **Auto-delete transcripts after N days?** Not built unless asked. Worth deciding
  before real meeting content accumulates.
- **Retire the old integration path?** Decide after this ships (§9.4).
