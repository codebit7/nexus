
-- Add org_id to team_members
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE;

-- Add org_id to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE;

-- Add org_id to clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE;

-- Add org_id to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE;

-- Add org_id to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE;

-- Add org_id to project_members
ALTER TABLE project_members
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE;

-- Now create get_org_id() helper function (org_id column now exists)
CREATE OR REPLACE FUNCTION get_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM team_members WHERE id = auth.uid() LIMIT 1;
$$;

-- And the members_read_own_org policy (deferred from step 2)
CREATE POLICY "members_read_own_org"
ON organisations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT org_id FROM team_members
    WHERE id = auth.uid()
  )
);
;
