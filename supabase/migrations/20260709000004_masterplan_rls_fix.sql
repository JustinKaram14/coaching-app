-- Coach can READ training_vorlagen for their clients (needed before delete/replace)
DROP POLICY IF EXISTS "Coach reads client templates" ON training_vorlagen;
CREATE POLICY "Coach reads client templates" ON training_vorlagen
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );

-- Coach can READ vorlagen_uebungen for client templates
DROP POLICY IF EXISTS "Coach reads client exercises" ON vorlagen_uebungen;
CREATE POLICY "Coach reads client exercises" ON vorlagen_uebungen
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_vorlagen tv
      WHERE tv.id = vorlage_id
        AND (tv.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = tv.user_id AND coach_id = auth.uid()))
    )
  );

-- Coach can DELETE vorlagen_uebungen for client templates (needed before deleting vorlagen)
DROP POLICY IF EXISTS "Coach deletes exercises for client vorlagen" ON vorlagen_uebungen;
CREATE POLICY "Coach deletes exercises for client vorlagen" ON vorlagen_uebungen
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_vorlagen tv
      WHERE tv.id = vorlage_id
        AND (tv.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = tv.user_id AND coach_id = auth.uid()))
    )
  );

-- Rezepte table (in case migration 20260709_rezepte.sql was not yet run)
CREATE TABLE IF NOT EXISTS rezepte (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  zutaten_text text,
  portionen integer DEFAULT 1,
  kalorien integer NOT NULL,
  protein_g numeric,
  kohlenhydrate_g numeric,
  fett_g numeric,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE rezepte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recipes" ON rezepte;
CREATE POLICY "Users manage own recipes" ON rezepte
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coach creates recipes for clients" ON rezepte;
CREATE POLICY "Coach creates recipes for clients" ON rezepte
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );

-- Coach also needs to DELETE client recipes (for replace-on-apply)
DROP POLICY IF EXISTS "Coach deletes client recipes" ON rezepte;
CREATE POLICY "Coach deletes client recipes" ON rezepte
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );
