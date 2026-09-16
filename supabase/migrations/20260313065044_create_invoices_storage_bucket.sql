
-- Create the invoices storage bucket (public so PDFs can be linked directly)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  10485760,  -- 10 MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (public bucket — needed for iframe preview & direct links)
CREATE POLICY "Public read invoices"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices');

-- Allow authenticated users (team members) to upload/overwrite
CREATE POLICY "Auth users can upload invoices"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Auth users can update invoices"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'invoices');
;
