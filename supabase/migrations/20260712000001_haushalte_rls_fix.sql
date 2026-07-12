-- Fix infinite RLS recursion between haushalte <-> haushalt_mitglieder.
-- Both tables' policies referenced each other (and haushalt_mitglieder referenced itself),
-- causing Postgres error 42P17 "infinite recursion detected in policy", surfaced by
-- PostgREST as a generic 500 Internal Server Error.
-- Fix: SECURITY DEFINER helper functions bypass RLS internally, breaking the cycle.

CREATE OR REPLACE FUNCTION public.is_haushalt_coach(p_haushalt_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM haushalte WHERE id = p_haushalt_id AND coach_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_haushalt_member(p_haushalt_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM haushalt_mitglieder WHERE haushalt_id = p_haushalt_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Members read own haushalt" ON haushalte;
CREATE POLICY "Members read own haushalt" ON haushalte
  FOR SELECT TO authenticated
  USING (public.is_haushalt_member(id));

DROP POLICY IF EXISTS "Coach manages haushalt_mitglieder" ON haushalt_mitglieder;
CREATE POLICY "Coach manages haushalt_mitglieder" ON haushalt_mitglieder
  FOR ALL TO authenticated
  USING (public.is_haushalt_coach(haushalt_id))
  WITH CHECK (public.is_haushalt_coach(haushalt_id));

DROP POLICY IF EXISTS "Members read household members" ON haushalt_mitglieder;
CREATE POLICY "Members read household members" ON haushalt_mitglieder
  FOR SELECT TO authenticated
  USING (public.is_haushalt_member(haushalt_id));
