-- Fix 1: Trigger allowed blocking initial coach_id assignment.
-- When a profile is created by the auth trigger without coach_id,
-- the subsequent upsert in signUp() was raising an exception and silently failing.
-- Now: only block coach_id changes when it was ALREADY set (prevent reassignment).
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger AS $$
BEGIN
  IF NEW.role != OLD.role THEN
    RAISE EXCEPTION 'Changing role is not permitted via this endpoint.';
  END IF;
  -- Allow initial assignment (null → value), block reassignment (value → different value)
  IF NEW.coach_id IS DISTINCT FROM OLD.coach_id AND OLD.coach_id IS NOT NULL THEN
    RAISE EXCEPTION 'Changing coach_id is not permitted via this endpoint.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Backfill coach_id for clients who registered but got stuck with null coach_id.
-- Match via invite_codes.used_by = profiles.id.
UPDATE profiles p
SET coach_id = ic.coach_id
FROM invite_codes ic
WHERE ic.used_by = p.id
  AND p.coach_id IS NULL
  AND p.role = 'client';

-- Fix 3: Ensure coaches can SELECT their clients' profiles.
-- Without this policy, the coach dashboard query returns 0 rows.
DROP POLICY IF EXISTS "Coach can view client profiles" ON profiles;
CREATE POLICY "Coach can view client profiles" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR coach_id = auth.uid());
