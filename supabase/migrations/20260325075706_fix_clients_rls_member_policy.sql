
DROP POLICY IF EXISTS "member_read_clients" ON clients;
DROP POLICY IF EXISTS "authenticated_read_clients" ON clients;
DROP POLICY IF EXISTS "authenticated_full_access_clients" ON clients;

CREATE POLICY "admin_read_all_clients"
ON clients FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "member_read_assigned_clients"
ON clients FOR SELECT
TO authenticated
USING (
  is_admin()
  OR
  EXISTS (
    SELECT 1
    FROM projects
    INNER JOIN project_members
      ON project_members.project_id = projects.id
    WHERE projects.client_id = clients.id
    AND project_members.member_id = auth.uid()
  )
);
;
