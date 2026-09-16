-- Tags are org-wide: same "backend" tag is the same row everywhere in the org.
-- Anyone on the team can create new tags (ClickUp-style).
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#5e6ad2',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS tags_org_id_idx ON tags(org_id);

-- Many-to-many: a task can have many tags, a tag can apply to many tasks.
-- org_id denormalised on the join so RLS can scope without a second lookup.
CREATE TABLE IF NOT EXISTS task_tags (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  org_id  uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS task_tags_tag_id_idx ON task_tags(tag_id);
CREATE INDEX IF NOT EXISTS task_tags_org_id_idx ON task_tags(org_id);

-- RLS matching the rest of the schema: authenticated users see only their org;
-- anon blocked; service_role bypasses.
ALTER TABLE tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tags_authenticated_org_scope ON tags;
CREATE POLICY tags_authenticated_org_scope ON tags
  FOR ALL
  TO authenticated
  USING (org_id = get_org_id())
  WITH CHECK (org_id = get_org_id());

DROP POLICY IF EXISTS task_tags_authenticated_org_scope ON task_tags;
CREATE POLICY task_tags_authenticated_org_scope ON task_tags
  FOR ALL
  TO authenticated
  USING (org_id = get_org_id())
  WITH CHECK (org_id = get_org_id());;
