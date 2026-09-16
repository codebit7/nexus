
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ADMIN: sees all projects
CREATE POLICY "admin_read_all_projects"
ON projects FOR SELECT
TO authenticated
USING (is_admin());

-- MEMBER: sees projects where they have at least one assigned task
CREATE POLICY "member_read_assigned_projects"
ON projects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.project_id = projects.id
    AND tasks.assignee_id = auth.uid()
  )
);

-- ADMIN ONLY: insert
CREATE POLICY "admin_insert_projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ADMIN ONLY: update
CREATE POLICY "admin_update_projects"
ON projects FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ADMIN ONLY: delete
CREATE POLICY "admin_delete_projects"
ON projects FOR DELETE
TO authenticated
USING (is_admin());

-- SERVICE ROLE: full access
CREATE POLICY "service_role_full_access_projects"
ON projects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- BLOCK ANON
CREATE POLICY "block_anon_projects"
ON projects FOR ALL
TO anon
USING (false);
;
