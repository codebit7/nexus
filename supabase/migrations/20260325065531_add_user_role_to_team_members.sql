
-- Add user_role column for RBAC (separate from existing 'role' which stores job titles)
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS user_role TEXT 
DEFAULT 'member' 
CHECK (user_role IN ('admin', 'member'));

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'team_members'
AND column_name = 'user_role';
;
