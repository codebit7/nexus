
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_name TEXT;
;
