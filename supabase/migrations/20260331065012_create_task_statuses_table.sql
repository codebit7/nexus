
-- Custom task statuses per org (kanban board columns)
CREATE TABLE task_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#666666',
  position INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

-- Enable RLS
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read their org's statuses
CREATE POLICY "authenticated_select_own_org" ON task_statuses
  FOR SELECT TO authenticated
  USING (org_id = get_org_id());

-- Only admins can insert/update/delete
CREATE POLICY "admin_insert" ON task_statuses
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_org_id() AND is_admin());

CREATE POLICY "admin_update" ON task_statuses
  FOR UPDATE TO authenticated
  USING (org_id = get_org_id() AND is_admin())
  WITH CHECK (org_id = get_org_id() AND is_admin());

CREATE POLICY "admin_delete" ON task_statuses
  FOR DELETE TO authenticated
  USING (org_id = get_org_id() AND is_admin() AND is_default = false);

-- Service role full access
CREATE POLICY "service_role_all" ON task_statuses
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed default statuses for all existing organisations
INSERT INTO task_statuses (org_id, slug, label, color, position, is_default)
SELECT id, 'todo', 'To Do', '#666666', 0, true FROM organisations
UNION ALL
SELECT id, 'in_progress', 'In Progress', '#5e6ad2', 1, true FROM organisations
UNION ALL
SELECT id, 'done', 'Done', '#26c97f', 2, true FROM organisations;
;
