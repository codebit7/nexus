
DROP POLICY IF EXISTS "member_read_tasks_of_assigned_projects" ON tasks;

CREATE POLICY "member_read_own_assigned_tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  is_admin()
  OR
  assignee_id = auth.uid()
);
;
