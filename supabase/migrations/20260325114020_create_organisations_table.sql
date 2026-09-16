
-- Create organisations table
CREATE TABLE IF NOT EXISTS organisations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_full_access_organisations"
ON organisations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Block anon
CREATE POLICY "block_anon_organisations"
ON organisations FOR ALL
TO anon
USING (false);
;
