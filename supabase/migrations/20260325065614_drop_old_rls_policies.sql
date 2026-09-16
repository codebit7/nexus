
-- team_members
DROP POLICY IF EXISTS "authenticated_full_access_team_members" ON team_members;
DROP POLICY IF EXISTS "authenticated_read_team_members" ON team_members;
DROP POLICY IF EXISTS "authenticated_insert_team_members" ON team_members;
DROP POLICY IF EXISTS "authenticated_update_team_members" ON team_members;
DROP POLICY IF EXISTS "authenticated_delete_team_members" ON team_members;
DROP POLICY IF EXISTS "authenticated_write_team_members" ON team_members;
DROP POLICY IF EXISTS "block_anon_team_members" ON team_members;
DROP POLICY IF EXISTS "service_role_full_access_team_members" ON team_members;

-- projects
DROP POLICY IF EXISTS "authenticated_full_access_projects" ON projects;
DROP POLICY IF EXISTS "authenticated_read_projects" ON projects;
DROP POLICY IF EXISTS "authenticated_insert_projects" ON projects;
DROP POLICY IF EXISTS "authenticated_update_projects" ON projects;
DROP POLICY IF EXISTS "authenticated_delete_projects" ON projects;
DROP POLICY IF EXISTS "authenticated_write_projects" ON projects;
DROP POLICY IF EXISTS "block_anon_projects" ON projects;
DROP POLICY IF EXISTS "service_role_full_access_projects" ON projects;

-- tasks
DROP POLICY IF EXISTS "authenticated_full_access_tasks" ON tasks;
DROP POLICY IF EXISTS "authenticated_read_tasks" ON tasks;
DROP POLICY IF EXISTS "authenticated_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "authenticated_update_tasks" ON tasks;
DROP POLICY IF EXISTS "authenticated_delete_tasks" ON tasks;
DROP POLICY IF EXISTS "authenticated_write_tasks" ON tasks;
DROP POLICY IF EXISTS "block_anon_tasks" ON tasks;
DROP POLICY IF EXISTS "service_role_full_access_tasks" ON tasks;

-- invoices
DROP POLICY IF EXISTS "authenticated_full_access_invoices" ON invoices;
DROP POLICY IF EXISTS "authenticated_read_invoices" ON invoices;
DROP POLICY IF EXISTS "authenticated_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "authenticated_update_invoices" ON invoices;
DROP POLICY IF EXISTS "authenticated_delete_invoices" ON invoices;
DROP POLICY IF EXISTS "authenticated_write_invoices" ON invoices;
DROP POLICY IF EXISTS "block_anon_invoices" ON invoices;
DROP POLICY IF EXISTS "service_role_full_access_invoices" ON invoices;
;
