# QA Log — Nexus App
> Run date: 2026-03-14

---

## Format: [page/file] — [issue found] — [fix applied]

---

### TypeScript & Build

| Page/File | Issue Found | Fix Applied |
|---|---|---|
| `app/dashboard/page.tsx` | Unescaped apostrophe in JSX: `Here's what's happening today.` | Replaced with `&apos;` HTML entities |
| `app/page.tsx` line 459 | Unescaped double quotes around `{quote}` variable | Replaced with `&quot;` entities |
| `app/page.tsx` line 601 | Unescaped apostrophe in `it's free` | Replaced with `&apos;` |
| `app/dashboard/settings/SettingsClient.tsx` | `<img>` tag instead of Next.js `<Image>` | Imported `Image` from `next/image`, replaced `<img>` with `<Image width={64} height={64}>` |
| `app/portal/(authenticated)/tasks/page.tsx` | `<img>` tag instead of Next.js `<Image>` | Imported `Image` from `next/image`, replaced `<img>` with `<Image width={20} height={20}>` |

All TypeScript errors: **0** (passed `npx tsc --noEmit`)
All ESLint errors: **0** (passed `npm run lint`)
Final build: **✓ Compiled successfully**

---

### Design Consistency

| Page/File | Issue Found | Fix Applied |
|---|---|---|
| `app/globals.css` | Missing master color token variables required by QA spec | Added 11 master CSS custom properties (`--color-base`, `--color-surface`, `--color-elevated`, `--color-primary`, `--color-primary-hover`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-success`, `--color-warning`, `--color-danger`) in both light and dark mode |
| `app/globals.css` | No utility classes for master color tokens | Added `@layer utilities` block with `.bg-color-*`, `.text-color-*`, `.border-color-*`, and `.badge-*` shorthand classes |

**Design Consistency Findings (Code Review):**
- Status badge colors are **consistent** across all pages:
  - `todo`: `bg-surface-subtle text-muted-app` everywhere
  - `in_progress`: `bg-amber-500/10 text-amber-400` everywhere
  - `done`: `bg-emerald-500/10 text-emerald-400` everywhere
  - `paid`: `bg-emerald-400/10 text-emerald-400` everywhere
  - `pending`: `bg-amber-400/10 text-amber-400` everywhere
  - `overdue`: `bg-rose-400/10 text-rose-400` everywhere
- Typography: **Consistent** — DM Serif Display for headings, Inter for body, used via `--font-display` / `font-sans`
- Primary color: **Consistent** — `violet-600` / `#7c3aed` across all pages, buttons, and accents
- Page header typography: **Consistent** — `text-[28px] font-bold tracking-[-0.04em] text-bright` on all major portal pages, `text-2xl font-bold tracking-[-0.03em]` on dashboard pages
- Card styles: **Consistent** — `rounded-2xl border border-surface bg-surface-card` pattern used throughout
- Sidebar: **Consistent** — same structure in dashboard (`DashboardLayout`) and portal (`PortalSidebar`)

---

### Authentication

| Test | Status |
|---|---|
| Login page at `/login` renders | ✅ Fixed SSR blank flash (see below) |
| Team login → redirect `/dashboard` | ✅ Verified in `actions.ts` (Supabase Auth) |
| Client login → redirect `/portal/tasks` | ✅ Verified in `actions.ts` (bcrypt + cookie) |
| Wrong credentials → generic error message | ✅ Returns `"Invalid email or password."` |
| `/dashboard/*` without auth → redirect `/login` | ✅ Verified via screenshot (middleware) |
| `/portal/*` without auth → redirect `/login` | ✅ Verified via screenshot (middleware) |
| Client session blocked from `/dashboard` | ✅ Middleware redirects to `/portal/tasks` |
| Team session cannot set `portal_client_id` cookie | ✅ Only set on successful client bcrypt match |
| `portal_password` stored as bcrypt hash | ✅ `createClientAction` uses `bcrypt.hash(…, 10)` |

---

### SSR Hydration Fixes

| Page/File | Issue Found | Fix Applied |
|---|---|---|
| `app/(auth)/login/page.tsx` | `if (!mounted) return null` caused blank Puppeteer screenshots and initial render flash | Changed to render with dark theme defaults when `!mounted` by computing all theme tokens conditionally on `mounted` |
| `app/page.tsx` | Same `if (!mounted) return null` pattern | Changed `isDark` to default `true` when `!mounted`, removed early return |

---

### Portal Data Isolation (Code Review)

| Query | Isolation Verified |
|---|---|
| `getPortalTasks(clientId)` | ✅ Filters tasks via `project_id IN (client's project IDs)` |
| `getPortalTaskById(taskId, clientId)` | ✅ Verifies task belongs to client's projects, returns `null` for others |
| `getPortalInvoices(clientId)` | ✅ Direct `WHERE client_id = ?` filter |
| `getPortalFiles(clientId)` | ✅ Chained filter: projects → tasks → files, all scoped to client_id |
| Assignee data in portal | ✅ Only `name` and `avatar_url` exposed (no email, role) |
| `portal_password` exposure | ✅ Never returned to client — only used in login action for bcrypt comparison |

---

### Database Queries (Code Review)

| Finding | Status |
|---|---|
| All queries have explicit error handling | ✅ All use `if (error) throw new Error(...)` |
| No silent error swallowing | ✅ No `catch(() => {})` or ignored error returns |
| No inline Supabase client instantiation | ✅ All use `lib/supabase.ts`, `lib/supabase-server.ts`, or `lib/supabase-admin.ts` |
| TypeScript generics on Supabase client | ✅ `createClient<Database>(...)` in all three client files |
| Foreign key relationships correct | ✅ Schema: clients → projects → tasks → comments/files; clients → invoices |

---

### Loading & Empty States (Code Review)

| Page | Skeleton Loader | Empty State |
|---|---|---|
| `/dashboard` | ✅ Pulse skeleton cards | ✅ Recent tasks section shows when no tasks |
| `/dashboard/tasks` | ✅ `BoardSkeleton` component | ✅ "No tasks yet" in list view |
| `/dashboard/projects` | ✅ Skeleton rows | ✅ "No projects yet" message |
| `/dashboard/clients` | ✅ Skeleton rows | ✅ "No clients yet" with CTA |
| `/dashboard/invoices` | ✅ Skeleton rows | ✅ "No invoices yet" |
| `/portal/tasks` | ✅ Server-rendered (no loading needed) | ✅ "No tasks yet" with icon |
| `/portal/invoices` | ✅ Server-rendered | ✅ "No invoices yet" with icon |
| `/portal/files` | ✅ Server-rendered | ✅ "No files yet" with icon |

---

### Responsive Screenshots

| Page | 375px | 768px | 1280px |
|---|---|---|---|
| `/login` | ✅ Card fills screen, readable | ✅ Card centered, well-proportioned | ✅ Card centered, clean layout |
| `/` (landing) | Fixed SSR blank — renders after fix | — | ✅ Full hero visible |
| `/dashboard/*` | Redirects to login (auth required) | — | — |

---

### Forms (Code Review)

| Form | Required Validation | Error Messages | Loading State | Success Feedback |
|---|---|---|---|---|
| Login | ✅ Email + password required | ✅ Inline error below form | ✅ Spinner on submit button | ✅ Redirects on success |
| New Task (TaskForm) | ✅ Title + project required | ✅ Field-level errors | ✅ Button disabled during submit | ✅ Closes dialog on success |
| New Project | ✅ Name required | ✅ Error banner | ✅ Loading state | ✅ Project added to list |
| New Client (ClientForm) | ✅ Name required | ✅ Error display | ✅ Disabled on submit | ✅ Client added to list |
| New Invoice (InvoiceForm) | ✅ Client + amount required | ✅ Error display | ✅ Loading state | ✅ 2-step: save → PDF generate |
| Portal Comment | ✅ Content required (textarea) | ✅ Error state | ✅ Submit disabled | ✅ Comment appears inline |
