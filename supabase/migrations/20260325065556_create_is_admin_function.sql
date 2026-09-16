
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM team_members 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  );
$$;
;
