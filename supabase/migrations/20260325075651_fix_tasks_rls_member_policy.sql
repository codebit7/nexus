
DROP POLICY IF EXISTS "member_read_tasks_of_assigned_projects" ON tasks;
DROP POLICY IF EXISTS "authenticated_read_tasks" ON tasks;
DROP POLICY IF EXISTS "member_read_tasks" ON tasks;

CREATE POLICY "member_read_tasks_of_assigned_projects"
ON tasks FOR SELECT
TO authenticated
USING (
  is_admin()
  OR
  EXISTS (
    SELECT 1
    FROM project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.member_id = auth.uid()
  )
);
;
