
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ADMIN: sees all invoices
CREATE POLICY "admin_read_all_invoices"
ON invoices FOR SELECT
TO authenticated
USING (is_admin());

-- MEMBER: sees invoices for clients whose projects they are assigned to
-- Chain: tasks.assignee_id -> tasks.project_id -> projects.client_id -> invoices.client_id
CREATE POLICY "member_read_own_invoices"
ON invoices FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    WHERE projects.client_id = invoices.client_id
    AND tasks.assignee_id = auth.uid()
  )
);

-- ADMIN ONLY: insert
CREATE POLICY "admin_insert_invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ADMIN ONLY: update
CREATE POLICY "admin_update_invoices"
ON invoices FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ADMIN ONLY: delete
CREATE POLICY "admin_delete_invoices"
ON invoices FOR DELETE
TO authenticated
USING (is_admin());

-- SERVICE ROLE: full access
CREATE POLICY "service_role_full_access_invoices"
ON invoices FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- BLOCK ANON
CREATE POLICY "block_anon_invoices"
ON invoices FOR ALL
TO anon
USING (false);
;
