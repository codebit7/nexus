
-- ── 1. Create project_members junction table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   UUID NOT NULL REFERENCES projects(id)      ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES team_members(id)  ON DELETE CASCADE,
  assigned_at  TIMESTAMPTZ DEFAULT now(),
  assigned_by  UUID REFERENCES team_members(id),
  UNIQUE(project_id, member_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY "service_role_full_access_project_members"
ON project_members FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Admins: full access
CREATE POLICY "admin_full_access_project_members"
ON project_members FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

-- Members: read their own assignments
CREATE POLICY "member_read_own_assignments"
ON project_members FOR SELECT TO authenticated
USING (member_id = auth.uid());

-- Block anon
CREATE POLICY "block_anon_project_members"
ON project_members FOR ALL TO anon
USING (false);

-- ── 2. Update projects member-read policy to use junction table ───────────────
DROP POLICY IF EXISTS "member_read_assigned_projects" ON projects;

CREATE POLICY "member_read_assigned_projects"
ON projects FOR SELECT TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
      AND project_members.member_id  = auth.uid()
  )
);

-- ── 3. Update tasks member-read policy to use junction table ──────────────────
DROP POLICY IF EXISTS "member_read_tasks_of_assigned_projects" ON tasks;

CREATE POLICY "member_read_tasks_of_assigned_projects"
ON tasks FOR SELECT TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tasks.project_id
      AND project_members.member_id  = auth.uid()
  )
);
;
