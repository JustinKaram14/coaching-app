-- Add foto_url column to gewicht table for body progress photos
ALTER TABLE gewicht ADD COLUMN IF NOT EXISTS foto_url text;

-- Storage bucket for body photos (run manually in Supabase dashboard if bucket doesn't exist)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('body-photos', 'body-photos', false) ON CONFLICT DO NOTHING;

-- RLS for body-photos storage bucket
-- CREATE POLICY "Users manage own body photos" ON storage.objects FOR ALL TO authenticated
--   USING (bucket_id = 'body-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
--   WITH CHECK (bucket_id = 'body-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
