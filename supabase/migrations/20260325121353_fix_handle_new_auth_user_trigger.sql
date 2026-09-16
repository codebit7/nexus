
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.team_members (id, name, email, role, avatar_url, org_id, user_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    NEW.raw_user_meta_data->>'avatar_url',
    (NEW.raw_user_meta_data->>'org_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'member')
  )
  ON CONFLICT (id) DO UPDATE
    SET org_id    = EXCLUDED.org_id,
        user_role = EXCLUDED.user_role,
        name      = EXCLUDED.name;
  RETURN NEW;
END;
$$;
;
