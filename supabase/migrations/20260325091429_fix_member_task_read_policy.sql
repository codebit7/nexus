
-- Drop the old policy that only allowed members to see tasks assigned to them
DROP POLICY IF EXISTS "member_read_own_assigned_tasks" ON tasks;

-- New policy: members can read ALL tasks in projects they are assigned to
CREATE POLICY "member_read_assigned_project_tasks" ON tasks
FOR SELECT TO authenticated
USING (
  is_admin()
  OR project_id IN (
    SELECT project_id
    FROM project_members
    WHERE member_id = auth.uid()
  )
);
;
