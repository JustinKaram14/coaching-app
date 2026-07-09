-- Table for tracking coach-created plans per client
CREATE TABLE IF NOT EXISTS coach_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coach_id uuid REFERENCES auth.users(id) NOT NULL,
  pdf_storage_path text,
  pdf_name text,
  angewendet_am timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coach_plans ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS coach_plans_client_id_key ON coach_plans (client_id);

DROP POLICY IF EXISTS "Coach manages own plans" ON coach_plans;
CREATE POLICY "Coach manages own plans" ON coach_plans FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Client reads own plan" ON coach_plans;
CREATE POLICY "Client reads own plan" ON coach_plans FOR SELECT TO authenticated
  USING (client_id = auth.uid());

-- Water goal column for client_settings
ALTER TABLE client_settings
  ADD COLUMN IF NOT EXISTS wasser_ziel_ml integer DEFAULT 2000;

-- Allow coach to insert training_vorlagen for their clients
DROP POLICY IF EXISTS "Coach creates templates for clients" ON training_vorlagen;
CREATE POLICY "Coach creates templates for clients" ON training_vorlagen
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );

-- Allow coach to delete training_vorlagen for their clients
DROP POLICY IF EXISTS "Coach deletes templates for clients" ON training_vorlagen;
CREATE POLICY "Coach deletes templates for clients" ON training_vorlagen
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );

-- Allow coach to insert exercises for client training templates
DROP POLICY IF EXISTS "Coach inserts exercises for client vorlagen" ON vorlagen_uebungen;
CREATE POLICY "Coach inserts exercises for client vorlagen" ON vorlagen_uebungen
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_vorlagen tv
      WHERE tv.id = vorlage_id
        AND (tv.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = tv.user_id AND coach_id = auth.uid()))
    )
  );

-- Allow coach to update client_settings
DROP POLICY IF EXISTS "Coach updates client settings" ON client_settings;
CREATE POLICY "Coach updates client settings" ON client_settings
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );

-- Supabase Storage: masterplans bucket (create via Dashboard or run:)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('masterplans', 'masterplans', false) ON CONFLICT DO NOTHING;

-- Storage: coach can upload/read for their clients
DROP POLICY IF EXISTS "Coach manages masterplan files" ON storage.objects;
CREATE POLICY "Coach manages masterplan files" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'masterplans' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id::text = (storage.foldername(name))[1]
        AND coach_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'masterplans' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id::text = (storage.foldername(name))[1]
        AND coach_id = auth.uid()
    )
  );

-- Storage: client can download their own file
DROP POLICY IF EXISTS "Client reads own masterplan" ON storage.objects;
CREATE POLICY "Client reads own masterplan" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'masterplans' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
