-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add per-project scope to task_statuses
--
-- Run this in your Supabase project (SQL editor) BEFORE deploying the
-- matching TypeScript changes.
--
-- Semantics after this migration:
--   project_id IS NULL      → org-wide status (defaults + org-wide customs).
--                             Appears on the global /tasks page. Shared.
--   project_id = <projectId> → scoped to that project only. Appears on that
--                              project's board. Invisible to other projects.
--
-- Existing rows keep their meaning: they all get project_id = NULL (org-wide),
-- so nothing visible changes for end users after the migration. After deploying
-- the new code, newly-added columns on a project board will be project-scoped.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE task_statuses
  ADD COLUMN IF NOT EXISTS project_id UUID NULL
    REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS task_statuses_project_id_idx
  ON task_statuses(project_id);

-- (org_id, slug) UNIQUE constraint is preserved — slugs stay unique per org so
-- that tasks.status (a slug string) unambiguously points to one status row.
