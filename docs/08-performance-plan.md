# Plan — make nexus-app feel as fast as Xale

Written after reading Xale's candidate and recruiter pages. Facts below are from
that code, not assumptions.

**Status: plan only. Nothing changed yet.**

---

## 1. What you are seeing, and the actual cause

> "Blue loader for 2 seconds → then the tab opens → then skeleton → then content."

That order is the clue. The skeleton is supposed to appear **instantly**. It does
not, and the reason is one line:

`app/dashboard/layout.tsx` has `export const dynamic = "force-dynamic"`.

**A page's `loading.tsx` cannot render until its layout has finished rendering.**
The layout is the parent. So the sequence is really:

1. You click a sidebar link
2. Middleware runs — `auth.getUser()`, a network call to Supabase Auth
3. The **layout** re-renders on the server: auth, member, org, projects, team
   members, statuses, tags
4. Only now can Next send the shell — and only now does your skeleton appear
5. The page's own data loads
6. Content

Steps 2 and 3 are the "2 seconds of nothing". The skeleton is not slow; it is
**blocked**.

Measured on production earlier today, on a workspace with **zero** tasks and
**zero** projects:

| Page | First byte | Waiting on data | Total |
|---|---|---|---|
| Dashboard | 127ms | 2398ms | 3.3s |
| Projects | 108ms | 3369ms | 4.0s |
| Tasks | 112ms | 2672ms | 3.3s |
| Settings | 113ms | 3897ms | 5.0s |
| Same page, client-side nav | — | 69ms | **0.07s** |

The server answers in ~110ms every time. Everything after that is waiting on the
database. And an empty workspace proves it is not data volume — it is the number
of round trips, made worse by the app running in Washington while the database is
in Sydney.

---

## 2. What Xale actually does differently

I checked several theories and **two were wrong**, so they are recorded here to
save someone re-testing them:

| Theory | Verdict |
|---|---|
| Xale's middleware is lighter | **Wrong.** `middleware.ts` is 19 lines but delegates to `updateSession()` — 348 lines that also call `getUser()` and query the DB. |
| Xale uses Turbopack in dev | **Wrong.** Its dev script is `next dev --webpack`. Both apps use webpack. |

The real differences:

### 2.1 React `cache()` on session lookups — the big one

`Xale/src/lib/candidate/session.ts` exists purely for this. Its own comment:

> "auth.getUser() is a network round-trip to Supabase's auth server, so those
> duplicates added real latency to every navigation. React's cache() memoizes a
> function for the lifetime of a single server request render... collapses to
> one auth call and one profile query per request."

They cache **both** the auth user and the profile row:

```ts
export const getRequestUser = cache(async () => { ... auth.getUser() ... })
export const getRequestSeekerProfile = cache(async (userId) => { ... })
```

**nexus-app has half of this.** I wrapped `getCallerOrgId` in `cache()` earlier
today, which removed 8 duplicate calls. But `supabase.auth.getUser()` and
`getTeamMemberByEmail()` are still called raw in the layout and in every page —
roughly 15 call sites, each its own network round trip.

Xale's file also answers the objection I raised when I decided not to cache the
member lookup:

> "It does NOT dedupe across separate requests — e.g. a client-initiated server
> action is a different request — which is the correct, safe behavior."

A server action is a separate request from the page render, so a mutation
followed by a re-read cannot serve stale data. My caution was unnecessary.

### 2.2 Zero `force-dynamic`

| | pages | `force-dynamic` | `loading.tsx` |
|---|---|---|---|
| Xale | 66 | **0** | 17 |
| nexus-app | 28 | **15** | 14 |

`force-dynamic` opts out of every caching layer Next has, including the router
cache that makes a second visit instant.

### 2.3 One consolidated action per page

`Xale/src/app/candidate/(main)/opportunities/page.tsx` is 24 lines:

```ts
const { data } = await getOpportunitiesPageData()
```

One call fetches everything the page needs, then hands off to a client component
for interactivity. nexus-app's board page instead calls `getProjectById`,
`getTasksWithAssignees`, `getTaskStatuses`, `getTagsForTasks` separately — each
re-deriving the caller.

### 2.4 Parallel, not sequential

Xale's candidate layout, verbatim:

> "Fetch the gating profile and the bottom-nav badge counts concurrently —
> they're independent, so the layout's server time is max(profile, badges)
> instead of their sum."

### 2.5 Next 16 / React 19 vs Next 14 / React 18

Newer client router, better prefetch and streaming. Real, but the least
actionable item here — an upgrade is its own project.

---

## 3. The plan, in order of impact

### Step 1 — Unblock the skeleton (biggest win, lowest risk)

The layout gates every skeleton in the app, so it must become cheap.

1. **Add `lib/db/session.ts`**, copying Xale's pattern exactly:
   ```ts
   export const getRequestUser = cache(async () => { ... })
   export const getRequestMember = cache(async (email: string) => { ... })
   ```
2. Replace every raw `supabase.auth.getUser()` + `getTeamMemberByEmail()` pair in
   `app/dashboard/**` with these. ~15 call sites.
3. The layout's five parallel fetches (org, projects, team members, statuses,
   tags) exist to preload the task form. **Move them out of the layout.** They
   are not needed to draw the shell, and they currently block every skeleton in
   the app. Load them inside the form when it opens, or in the page that needs
   them.

Expected: layout drops from ~9 round trips to ~2. The skeleton appears almost
immediately, which is the specific thing you asked for.

### Step 2 — Remove `force-dynamic` where it is not needed

Audit all 15. Most are marked dynamic only because they read cookies, which Next
detects on its own. Removing the directive restores the router cache, so going
back to a page you just visited is instant.

Keep it only where a page must never be stale.

### Step 3 — One data call per page

Give each dashboard page a single `getXPageData()` in `lib/db/`, doing its
queries in one `Promise.all` and deriving the caller once. Mirrors §2.3.

### Step 4 — Hybrid: server shell, client refresh

What you asked for. The server renders the first paint; the client owns updates
after that.

- Server component fetches the initial data and passes it as `initialX` props
  (Xale's naming: `initialRoles`, `initialRecruiters`)
- The client component owns everything after: pagination, filters, refetch after
  a mutation
- No data-fetching library needed — Xale uses none. Plain server actions called
  from client components.

### Step 5 — Move the app next to the database

Everything above reduces the **number** of round trips. This reduces the **cost**
of each one, from ~200ms to ~10ms.

Blocked: the Vercel free plan pins functions to `iad1` (Washington). Options are
a paid plan, or a new Supabase project in a US region and a data migration.
Recorded here because after steps 1-4 it becomes the dominant cost again.

---

## 4. Expected result

| | now | after 1-3 | after 5 |
|---|---|---|---|
| Skeleton appears | after ~2s | **immediately** | immediately |
| Page content | 3.3-5.0s | ~1.5s | ~0.3s |
| Return to a visited page | 3.3s | instant (router cache) | instant |

---

## 5. What NOT to do

- **Do not upgrade to Next 16 as part of this.** It is a separate, riskier piece
  of work, and steps 1-3 deliver most of the gain without it.
- **Do not add react-query or SWR.** Xale is fast without one. It would be new
  surface area for no measured benefit here.
- **Do not judge speed from `npm run dev`.** Dev compiles each route on first
  visit, which is most of your "first time slow, second time fast". Measure on
  the deployed site.

---

## 6. Open question

Step 1.3 moves the task-form preload out of the layout. That data (projects, team
members, statuses, tags) is currently fetched on **every page** so the "New Task"
modal can open instantly from anywhere.

Moving it means the modal fetches when opened — a short delay the first time it
is opened per page, in exchange for every page in the app painting faster.

**Needs a decision before Step 1 is implemented.**
