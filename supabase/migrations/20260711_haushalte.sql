-- Haushalt: Coach verknüpft Klienten-Paare für gemeinsame Meal Prep Planung
CREATE TABLE IF NOT EXISTS haushalte (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS haushalt_mitglieder (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  haushalt_id uuid REFERENCES haushalte(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anzeige_name text NOT NULL,
  kalorien_ziel integer,
  praeferenzen text,
  UNIQUE(haushalt_id, user_id)
);

ALTER TABLE haushalte ENABLE ROW LEVEL SECURITY;
ALTER TABLE haushalt_mitglieder ENABLE ROW LEVEL SECURITY;

-- Coach manages own haushalte
DROP POLICY IF EXISTS "Coach manages own haushalte" ON haushalte;
CREATE POLICY "Coach manages own haushalte" ON haushalte
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Members can read haushalte they belong to
DROP POLICY IF EXISTS "Members read own haushalt" ON haushalte;
CREATE POLICY "Members read own haushalt" ON haushalte
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT haushalt_id FROM haushalt_mitglieder WHERE user_id = auth.uid()
    )
  );

-- Coach manages mitglieder (via their haushalte)
DROP POLICY IF EXISTS "Coach manages haushalt_mitglieder" ON haushalt_mitglieder;
CREATE POLICY "Coach manages haushalt_mitglieder" ON haushalt_mitglieder
  FOR ALL TO authenticated
  USING (
    haushalt_id IN (SELECT id FROM haushalte WHERE coach_id = auth.uid())
  )
  WITH CHECK (
    haushalt_id IN (SELECT id FROM haushalte WHERE coach_id = auth.uid())
  );

-- Members can see all members of their shared haushalt (to get partner name, goals, preferences)
DROP POLICY IF EXISTS "Members read household members" ON haushalt_mitglieder;
CREATE POLICY "Members read household members" ON haushalt_mitglieder
  FOR SELECT TO authenticated
  USING (
    haushalt_id IN (
      SELECT haushalt_id FROM haushalt_mitglieder WHERE user_id = auth.uid()
    )
  );
