-- Per-set logging: each set stored as JSONB array [{wdh, kg}]
ALTER TABLE uebungen ADD COLUMN IF NOT EXISTS saetze_log jsonb;

-- Coach can read client food_log
DROP POLICY IF EXISTS "Coach reads client food log" ON food_log;
CREATE POLICY "Coach reads client food log" ON food_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid()));
