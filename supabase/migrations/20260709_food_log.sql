-- Food log: individual food items per meal (multiple per day/meal)
CREATE TABLE IF NOT EXISTS food_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  datum date NOT NULL,
  mahlzeit text NOT NULL,
  name text NOT NULL,
  menge_g numeric,
  kalorien numeric,
  protein_g numeric,
  kohlenhydrate_g numeric,
  fett_g numeric,
  barcode text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE food_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own food log" ON food_log;
CREATE POLICY "Users manage own food log" ON food_log
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Water log: per-glass tracking
CREATE TABLE IF NOT EXISTS wasser_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  datum date NOT NULL,
  menge_ml integer NOT NULL DEFAULT 250,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE wasser_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own water log" ON wasser_log;
CREATE POLICY "Users manage own water log" ON wasser_log
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add macro goal columns to client_settings
ALTER TABLE client_settings
  ADD COLUMN IF NOT EXISTS protein_ziel integer DEFAULT 150,
  ADD COLUMN IF NOT EXISTS karbs_ziel integer DEFAULT 250,
  ADD COLUMN IF NOT EXISTS fett_ziel integer DEFAULT 70;
