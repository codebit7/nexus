-- ANON role: block all access (no unauthenticated reads of any table)
-- clients
CREATE POLICY "block_anon_clients"
  ON clients FOR ALL TO anon USING (false) WITH CHECK (false);

-- comments
CREATE POLICY "block_anon_comments"
  ON comments FOR ALL TO anon USING (false) WITH CHECK (false);

-- files
CREATE POLICY "block_anon_files"
  ON files FOR ALL TO anon USING (false) WITH CHECK (false);

-- invoices
CREATE POLICY "block_anon_invoices"
  ON invoices FOR ALL TO anon USING (false) WITH CHECK (false);

-- projects
CREATE POLICY "block_anon_projects"
  ON projects FOR ALL TO anon USING (false) WITH CHECK (false);

-- tasks
CREATE POLICY "block_anon_tasks"
  ON tasks FOR ALL TO anon USING (false) WITH CHECK (false);

-- team_members
CREATE POLICY "block_anon_team_members"
  ON team_members FOR ALL TO anon USING (false) WITH CHECK (false);;
