-- API keys that let an external tool (notes2board) push tasks into one project.
--
-- org_id and project_id are read from THIS row and never accepted from the
-- request body. That is what stops a leaked key from writing into another
-- workspace — the key itself is the whole authorisation.
--
-- Only a SHA-256 hash of the key is stored, same rule as clients.portal_password.
-- SHA-256 rather than bcrypt because lookup is by exact hash on every request;
-- bcrypt would force a table scan. The key is 32 random bytes, so it already has
-- far more entropy than a password and needs no work factor.
CREATE TABLE IF NOT EXISTS integration_keys (
  id           uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  org_id       uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id)      ON DELETE CASCADE,
  name         text NOT NULL,
  key_hash     text NOT NULL UNIQUE,
  key_prefix   text NOT NULL,
  last_used_at timestamp with time zone,
  revoked_at   timestamp with time zone,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES team_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS integration_keys_org_id_idx     ON integration_keys(org_id);
CREATE INDEX IF NOT EXISTS integration_keys_project_id_idx ON integration_keys(project_id);

ALTER TABLE integration_keys ENABLE ROW LEVEL SECURITY;

-- Read: anyone on the team can see which integrations exist. Application code
-- never selects key_hash, and the raw key is not recoverable from it.
CREATE POLICY "authenticated_select_own_org" ON integration_keys
  FOR SELECT TO authenticated
  USING (org_id = get_org_id());

-- Write: admins only. Creating a key hands out write access to a project.
CREATE POLICY "admin_insert" ON integration_keys
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_org_id() AND is_admin());

CREATE POLICY "admin_update" ON integration_keys
  FOR UPDATE TO authenticated
  USING (org_id = get_org_id() AND is_admin())
  WITH CHECK (org_id = get_org_id() AND is_admin());

CREATE POLICY "admin_delete" ON integration_keys
  FOR DELETE TO authenticated
  USING (org_id = get_org_id() AND is_admin());

CREATE POLICY "service_role_all" ON integration_keys
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);;
