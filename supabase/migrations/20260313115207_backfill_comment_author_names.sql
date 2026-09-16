
-- Backfill team member names for existing dashboard comments
UPDATE comments c
SET author_name = tm.name
FROM team_members tm
WHERE c.user_id = tm.id
  AND c.author_name IS NULL;

-- Backfill client names for existing portal comments
UPDATE comments c
SET author_name = cl.name
FROM clients cl
WHERE c.user_id = cl.id
  AND c.author_name IS NULL;
;
