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

-- Coach can insert recipes on behalf of clients
DROP POLICY IF EXISTS "Coach creates recipes for clients" ON rezepte;
CREATE POLICY "Coach creates recipes for clients" ON rezepte
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );
