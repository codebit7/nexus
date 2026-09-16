-- Adds per-project scope to task_statuses.
-- NULL project_id = org-wide (appears on the global /tasks page and as a
-- default on every project board).
-- Non-null project_id = scoped to that project only.
ALTER TABLE task_statuses
  ADD COLUMN IF NOT EXISTS project_id UUID NULL
    REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS task_statuses_project_id_idx
  ON task_statuses(project_id);;
