
-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename, policyname
           FROM pg_policies
           WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' ||
      quote_ident(r.policyname) ||
      ' ON ' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- ============================================
-- UPDATE is_admin() FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE id = auth.uid()
    AND user_role = 'admin'
  );
$$;

-- ============================================
-- ORGANISATIONS POLICIES
-- ============================================
CREATE POLICY "members_read_own_org"
ON organisations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT org_id FROM team_members
    WHERE id = auth.uid()
  )
);

CREATE POLICY "service_role_full_access_organisations"
ON organisations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "block_anon_organisations"
ON organisations FOR ALL
TO anon
USING (false);

-- ============================================
-- TEAM_MEMBERS POLICIES
-- ============================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_org_team_members"
ON team_members FOR SELECT
TO authenticated
USING (
  is_admin()
  AND org_id = get_org_id()
);

CREATE POLICY "member_read_own_profile"
ON team_members FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "admin_insert_team_members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (
  is_admin()
  AND org_id = get_org_id()
);

CREATE POLICY "admin_update_team_members"
ON team_members FOR UPDATE
TO authenticated
USING (is_admin() AND org_id = get_org_id())
WITH CHECK (is_admin() AND org_id = get_org_id());

CREATE POLICY "admin_delete_team_members"
ON team_members FOR DELETE
TO authenticated
USING (is_admin() AND org_id = get_org_id());

CREATE POLICY "service_role_full_access_team_members"
ON team_members FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "block_anon_team_members"
ON team_members FOR ALL
TO anon
USING (false);

-- ============================================
-- PROJECTS POLICIES
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_projects"
ON projects FOR ALL
TO authenticated
USING (is_admin() AND org_id = get_org_id())
WITH CHECK (is_admin() AND org_id = get_org_id());

CREATE POLICY "member_read_assigned_projects"
ON projects FOR SELECT
TO authenticated
USING (
  org_id = get_org_id()
  AND EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.member_id = auth.uid()
  )
);

CREATE POLICY "service_role_full_access_projects"
ON projects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "block_anon_projects"
ON projects FOR ALL
TO anon
USING (false);

-- ============================================
-- CLIENTS POLICIES
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_clients"
ON clients FOR ALL
TO authenticated
USING (is_admin() AND org_id = get_org_id())
WITH CHECK (is_admin() AND org_id = get_org_id());

CREATE POLICY "member_read_assigned_clients"
ON clients FOR SELECT
TO authenticated
USING (
  org_id = get_org_id()
  AND EXISTS (
    SELECT 1
    FROM projects
    INNER JOIN project_members
      ON project_members.project_id = projects.id
    WHERE projects.client_id = clients.id
    AND project_members.member_id = auth.uid()
  )
);

CREATE POLICY "service_role_full_access_clients"
ON clients FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "block_anon_clients"
ON clients FOR ALL
TO anon
USING (false);

-- ============================================
-- TASKS POLICIES
-- ============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_tasks"
ON tasks FOR ALL
TO authenticated
USING (is_admin() AND org_id = get_org_id())
WITH CHECK (is_admin() AND org_id = get_org_id());

CREATE POLICY "member_read_assigned_tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  org_id = get_org_id()
  AND EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.member_id = auth.uid()
  )
);

CREATE POLICY "service_role_full_access_tasks"
ON tasks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "block_anon_tasks"
ON tasks FOR ALL
TO anon
USING (false);

-- ============================================
-- INVOICES POLICIES
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_invoices"
ON invoices FOR ALL
TO authenticated
USING (is_admin() AND org_id = get_org_id())
WITH CHECK (is_admin() AND org_id = get_org_id());

CREATE POLICY "member_read_assigned_invoices"
ON invoices FOR SELECT
TO authenticated
USING (
  org_id = get_org_id()
  AND EXISTS (
    SELECT 1
    FROM clients
    INNER JOIN projects ON projects.client_id = clients.id
    INNER JOIN project_members
      ON project_members.project_id = projects.id
    WHERE clients.id = invoices.client_id
    AND project_members.member_id = auth.uid()
  )
);

CREATE POLICY "service_role_full_access_invoices"
ON invoices FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "block_anon_invoices"
ON invoices FOR ALL
TO anon
USING (false);

-- ============================================
-- PROJECT_MEMBERS POLICIES
-- ============================================
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_project_members"
ON project_members FOR ALL
TO authenticated
USING (is_admin() AND org_id = get_org_id())
WITH CHECK (is_admin() AND org_id = get_org_id());

CREATE POLICY "member_read_own_assignments"
ON project_members FOR SELECT
TO authenticated
USING (member_id = auth.uid());

CREATE POLICY "service_role_full_access_project_members"
ON project_members FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "block_anon_project_members"
ON project_members FOR ALL
TO anon
USING (false);

-- ============================================
-- COMMENTS POLICIES (keep existing pattern + org isolation via task→project)
-- ============================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access_comments"
ON comments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_full_access_comments"
ON comments FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "block_anon_comments"
ON comments FOR ALL
TO anon
USING (false);

-- ============================================
-- FILES POLICIES
-- ============================================
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access_files"
ON files FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_full_access_files"
ON files FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "block_anon_files"
ON files FOR ALL
TO anon
USING (false);
;
