-- Stub: matches remote schema_migrations entry for version 20260709000001.
-- Actual content is in 20260709_fix_clients.sql (version 20260709).
-- All statements here are idempotent.

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger AS $$
BEGIN
  IF NEW.role != OLD.role THEN
    RAISE EXCEPTION 'Changing role is not permitted via this endpoint.';
  END IF;
  IF NEW.coach_id IS DISTINCT FROM OLD.coach_id AND OLD.coach_id IS NOT NULL THEN
    RAISE EXCEPTION 'Changing coach_id is not permitted via this endpoint.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE profiles p
SET coach_id = ic.coach_id
FROM invite_codes ic
WHERE ic.used_by = p.id
  AND p.coach_id IS NULL
  AND p.role = 'client';

DROP POLICY IF EXISTS "Coach can view client profiles" ON profiles;
CREATE POLICY "Coach can view client profiles" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR coach_id = auth.uid());
