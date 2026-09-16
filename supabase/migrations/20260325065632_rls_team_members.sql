
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ADMIN: sees all team members
CREATE POLICY "admin_read_all_team_members"
ON team_members FOR SELECT
TO authenticated
USING (is_admin());

-- MEMBER: sees only their own profile
CREATE POLICY "member_read_own_profile"
ON team_members FOR SELECT
TO authenticated
USING (id = auth.uid());

-- ADMIN ONLY: insert
CREATE POLICY "admin_insert_team_members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ADMIN ONLY: update
CREATE POLICY "admin_update_team_members"
ON team_members FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ADMIN ONLY: delete
CREATE POLICY "admin_delete_team_members"
ON team_members FOR DELETE
TO authenticated
USING (is_admin());

-- SERVICE ROLE: full access (bypasses RLS for server-side ops)
CREATE POLICY "service_role_full_access_team_members"
ON team_members FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- BLOCK ANON
CREATE POLICY "block_anon_team_members"
ON team_members FOR ALL
TO anon
USING (false);
;
