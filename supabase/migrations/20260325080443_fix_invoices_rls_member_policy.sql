
DROP POLICY IF EXISTS "member_read_own_invoices" ON invoices;

CREATE POLICY "member_read_assigned_invoices"
ON invoices FOR SELECT
TO authenticated
USING (
  is_admin()
  OR
  EXISTS (
    SELECT 1
    FROM projects
    INNER JOIN project_members
      ON project_members.project_id = projects.id
    WHERE projects.client_id = invoices.client_id
    AND project_members.member_id = auth.uid()
  )
);
;
