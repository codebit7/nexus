-- Widen a key from "one project" to "one workspace, choose the project per push".
--
-- project_id NOT NULL  → locked key: always lands in that project, and any
--                        project_id in the request is ignored.
-- project_id NULL      → workspace key: the caller picks a project on each push,
--                        and the endpoint verifies it belongs to this key's org.
--
-- Either way org_id still comes from the key row and is never taken from the
-- request, so a key can never reach another workspace.
ALTER TABLE integration_keys
  ALTER COLUMN project_id DROP NOT NULL;

COMMENT ON COLUMN integration_keys.project_id IS
  'NULL = workspace-scoped key (caller chooses the project per request, validated against org_id). Non-null = locked to this project.';;
