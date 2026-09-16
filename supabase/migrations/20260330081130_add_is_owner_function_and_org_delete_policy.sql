
-- Create is_owner() function: returns true if the authenticated user is the workspace owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE id = auth.uid()
    AND is_owner = true
  );
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

-- Allow the workspace owner (and only the owner) to delete their own organisation
CREATE POLICY "owner_delete_own_org"
  ON organisations
  FOR DELETE
  TO authenticated
  USING (
    is_owner()
    AND id = get_org_id()
  );

-- Allow owner full access to organisations (update their org)
CREATE POLICY "owner_update_own_org"
  ON organisations
  FOR UPDATE
  TO authenticated
  USING (
    is_owner()
    AND id = get_org_id()
  )
  WITH CHECK (
    is_owner()
    AND id = get_org_id()
  );
;
