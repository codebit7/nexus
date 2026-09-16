
DROP POLICY IF EXISTS "member_read_assigned_projects" ON projects;
DROP POLICY IF EXISTS "authenticated_read_projects" ON projects;
DROP POLICY IF EXISTS "member_read_projects" ON projects;

CREATE POLICY "member_read_assigned_projects"
ON projects FOR SELECT
TO authenticated
USING (
  is_admin()
  OR
  EXISTS (
    SELECT 1 
    FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.member_id = auth.uid()
  )
);
;
