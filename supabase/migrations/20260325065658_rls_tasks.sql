
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ADMIN: sees all tasks
CREATE POLICY "admin_read_all_tasks"
ON tasks FOR SELECT
TO authenticated
USING (is_admin());

-- MEMBER: sees tasks they are directly assigned to
CREATE POLICY "member_read_tasks_of_assigned_projects"
ON tasks FOR SELECT
TO authenticated
USING (assignee_id = auth.uid());

-- ADMIN ONLY: insert
CREATE POLICY "admin_insert_tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ADMIN ONLY: update
CREATE POLICY "admin_update_tasks"
ON tasks FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ADMIN ONLY: delete
CREATE POLICY "admin_delete_tasks"
ON tasks FOR DELETE
TO authenticated
USING (is_admin());

-- SERVICE ROLE: full access
CREATE POLICY "service_role_full_access_tasks"
ON tasks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- BLOCK ANON
CREATE POLICY "block_anon_tasks"
ON tasks FOR ALL
TO anon
USING (false);
;
