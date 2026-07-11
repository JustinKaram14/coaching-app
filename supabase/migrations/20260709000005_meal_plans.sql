CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  datum date NOT NULL,
  mahlzeit text NOT NULL,
  rezept_id uuid REFERENCES rezepte(id) ON DELETE SET NULL,
  rezept_name text NOT NULL,
  portionen numeric DEFAULT 1,
  kalorien integer,
  protein_g numeric,
  kohlenhydrate_g numeric,
  fett_g numeric,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own meal plans" ON meal_plans;
CREATE POLICY "Users manage own meal plans" ON meal_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
