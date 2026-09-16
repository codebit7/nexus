# Design Tokens — Nexus App

> Defined in `app/globals.css` and extended in `tailwind.config.ts`

---

## Master Color System

These are the primary semantic tokens. All new UI should reference these first.

### Light Mode (`:root`)

| Token | Value | RGB | Usage |
|---|---|---|---|
| `--color-base` | `248 250 252` | #f8fafc | Page background |
| `--color-surface` | `241 245 249` | #f1f5f9 | Cards, panels |
| `--color-elevated` | `226 232 240` | #e2e8f0 | Modals, dropdowns |
| `--color-primary` | `124 58 237` | #7c3aed | Brand violet |
| `--color-primary-hover` | `109 40 217` | #6d28d9 | Button hover |
| `--color-text` | `15 23 42` | #0f172a | Main text |
| `--color-text-muted` | `71 85 105` | #475569 | Secondary text |
| `--color-border` | `0 0 0` | (used with opacity) | Borders |
| `--color-success` | `52 211 153` | #34d399 | Paid, done |
| `--color-warning` | `251 191 36` | #fbbf24 | Pending, in progress |
| `--color-danger` | `248 113 113` | #f87171 | Overdue, urgent |

### Dark Mode (`.dark`)

| Token | Value | RGB | Usage |
|---|---|---|---|
| `--color-base` | `15 17 23` | #0f1117 | Page background |
| `--color-surface` | `17 19 24` | #111318 | Cards, panels |
| `--color-elevated` | `26 28 37` | #1a1c25 | Modals, dropdowns |
| `--color-primary` | `124 58 237` | #7c3aed | Brand violet (same) |
| `--color-primary-hover` | `109 40 217` | #6d28d9 | Button hover |
| `--color-text` | `255 255 255` | #ffffff | Main text |
| `--color-text-muted` | `156 163 175` | #9ca3af | Secondary text |
| `--color-border` | `255 255 255` | (used with opacity) | Borders |
| `--color-success` | `52 211 153` | #34d399 | Paid, done |
| `--color-warning` | `251 191 36` | #fbbf24 | Pending, in progress |
| `--color-danger` | `248 113 113` | #f87171 | Overdue, urgent |

---

## Extended Surface System

Finer-grained surface tokens for layering depth.

### Light Mode

| Token | Value | Usage |
|---|---|---|
| `--surface-page` | `248 250 252` | Body background (slate-50) |
| `--surface-sidebar` | `255 255 255` | Sidebar background (white) |
| `--surface-card` | `241 245 249` | Card backgrounds (slate-100) |
| `--surface-subtle` | `226 232 240` | Subtle highlights (slate-200) |
| `--surface-inset` | `203 213 225` | Inset areas (slate-300) |

### Dark Mode

| Token | Value | Usage |
|---|---|---|
| `--surface-page` | `15 17 23` | Body background (#0f1117) |
| `--surface-sidebar` | `11 12 18` | Sidebar background (#0b0c12) |
| `--surface-card` | `17 19 24` | Card backgrounds (#111318) |
| `--surface-subtle` | `22 24 32` | Subtle highlights (#161820) |
| `--surface-inset` | `26 28 37` | Inset areas (#1a1c25) |

---

## Text System

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| `--text-bright` | `15 23 42` | `255 255 255` | Headings, emphasis |
| `--text-primary` | `30 41 59` | `209 213 219` | Body text |
| `--text-secondary` | `71 85 105` | `156 163 175` | Secondary text |
| `--text-muted` | `100 116 139` | `107 114 128` | Muted labels |
| `--text-faint` | `100 116 139` | `75 85 99` | Very subtle text |
| `--text-dim` | `148 163 184` | `55 65 81` | Dimmest decorative text |

---

## Tailwind Utility Classes

### Surface Classes (use these in JSX)

```
bg-surface-page      — page background
bg-surface-sidebar   — sidebar
bg-surface-card      — cards
bg-surface-subtle    — subtle highlights
bg-surface-inset     — inset areas
```

### Text Classes

```
text-bright          — headings, important labels
text-primary-app     — body text
text-secondary-app   — secondary body text
text-muted-app       — muted text
text-faint-app       — very subtle text
text-dim-app         — dimmest text (labels, dates)
```

### Border Classes

```
border-surface       — standard card/panel border
border-subtle-app    — subtle divider
```

### Master Color Classes (new)

```
bg-color-base        bg-color-surface      bg-color-elevated
bg-color-primary     bg-color-success      bg-color-warning      bg-color-danger
text-color-text      text-color-muted      text-color-primary
text-color-success   text-color-warning    text-color-danger
border-color-border  border-color-primary  border-color-success
border-color-warning border-color-danger
```

### Status Badge Shorthand

```
badge-todo      — todo status: muted background
badge-progress  — in_progress: amber
badge-done      — done: emerald
badge-pending   — pending invoice: amber
badge-paid      — paid invoice: emerald
badge-overdue   — overdue: rose/danger
```

---

## Typography

| Role | Font | Size | Weight | Tracking | Line-height |
|---|---|---|---|---|---|
| Display / Hero | DM Serif Display (`--font-display`) | 48–72px | 700 | `-0.04em` | 1.0–1.1 |
| Page title | DM Serif Display | 28px | 700 | `-0.04em` | tight |
| Section heading | Inter | 20–24px | 700 | `-0.03em` | tight |
| Card title | Inter | 14–16px | 600 | `-0.01em` | snug |
| Body text | Inter | 14px | 400 | normal | 1.7 |
| Small / label | Inter | 11–12px | 600 | `0.08em` (widest) | normal |
| Muted / meta | Inter | 11–13px | 400 | normal | normal |

---

## Status Badge Colors

Consistent across dashboard AND portal pages:

| Status | Background | Text | Ring |
|---|---|---|---|
| `todo` | `bg-surface-subtle` | `text-muted-app` | `ring-surface` |
| `in_progress` | `bg-amber-500/10` | `text-amber-400` | `ring-amber-500/20` |
| `done` | `bg-emerald-500/10` | `text-emerald-400` | `ring-emerald-500/20` |
| `pending` (invoice) | `bg-amber-400/10` | `text-amber-400` | `ring-amber-400/20` |
| `paid` (invoice) | `bg-emerald-400/10` | `text-emerald-400` | `ring-emerald-400/20` |
| `overdue` (invoice) | `bg-rose-400/10` | `text-rose-400` | `ring-rose-400/20` |
| `active` (client) | `bg-emerald-400/10` | `text-emerald-400` | `ring-emerald-400/20` |
| `paused` (client) | `bg-amber-400/10` | `text-amber-400` | `ring-amber-400/20` |
| `inactive` (client) | `bg-surface-subtle` | `text-muted-app` | `ring-surface` |

## Priority Badge Colors

| Priority | Background | Text | Ring |
|---|---|---|---|
| `urgent` | `bg-rose-500/10` | `text-rose-400` | `ring-rose-500/20` |
| `high` | `bg-orange-500/10` | `text-orange-400` | `ring-orange-500/20` |
| `normal` | `bg-sky-500/10` | `text-sky-400` | `ring-sky-500/20` |
| `low` | `bg-surface-subtle` | `text-muted-app` | `ring-surface` |

---

## Shadows & Depth Layers

| Layer | Class / Value | Usage |
|---|---|---|
| Base | none | Page background |
| Surface | `shadow-[0_2px_8px_rgba(0,0,0,0.08)]` | Cards |
| Elevated | `shadow-[0_8px_32px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.12)]` | Modals, dropdowns |
| Primary glow | `shadow-[0_4px_24px_rgba(139,92,246,0.35)]` | Violet CTAs |
| Danger | `shadow-[0_4px_12px_rgba(239,68,68,0.2)]` | Destructive actions |

---

## Border Radius Scale

| Name | Value | Usage |
|---|---|---|
| `rounded-lg` | `0.5rem` (8px) | Inputs, tags |
| `rounded-xl` | `0.75rem` (12px) | Cards, table rows |
| `rounded-2xl` | `1rem` (16px) | Main content cards |
| `rounded-3xl` | `1.5rem` (24px) | Login card, hero elements |
| `rounded-full` | 9999px | Badges, avatars, pills |

---

## Spacing Scale (Key Values)

| Token | px | Usage |
|---|---|---|
| `p-4` | 16px | Compact card padding |
| `p-5/px-5 py-4` | 20px/16px | Standard card padding |
| `p-6` | 24px | Content area padding (mobile) |
| `p-8` | 32px | Content area padding (tablet) |
| `p-10` | 40px | Content area padding (desktop) |
| `gap-4` | 16px | Item spacing in lists |
| `gap-6` | 24px | Section spacing |
| `gap-8` | 32px | Major section gaps |
| `max-w-4xl` | 896px | Task/portal detail pages |
| `max-w-7xl` | 1280px | Dashboard content areas |
