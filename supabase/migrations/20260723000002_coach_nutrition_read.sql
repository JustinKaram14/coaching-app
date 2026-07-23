-- Coach can read food_log entries for their clients
DROP POLICY IF EXISTS "Coach reads client food log" ON food_log;
CREATE POLICY "Coach reads client food log" ON food_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );

-- Coach can read wasser_log entries for their clients
DROP POLICY IF EXISTS "Coach reads client water log" ON wasser_log;
CREATE POLICY "Coach reads client water log" ON wasser_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );

-- Ensure ernaehrung coach policy exists (may already be in schema)
DROP POLICY IF EXISTS "Coach can view client nutrition" ON ernaehrung;
CREATE POLICY "Coach can view client nutrition" ON ernaehrung
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND coach_id = auth.uid())
  );
