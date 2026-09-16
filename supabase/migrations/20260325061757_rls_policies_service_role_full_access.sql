-- SERVICE ROLE: Full access on all tables (used by backend/server-side code)
CREATE POLICY "service_role_full_access_clients"
  ON clients FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_comments"
  ON comments FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_files"
  ON files FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_invoices"
  ON invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_projects"
  ON projects FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_tasks"
  ON tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_team_members"
  ON team_members FOR ALL TO service_role USING (true) WITH CHECK (true);;
