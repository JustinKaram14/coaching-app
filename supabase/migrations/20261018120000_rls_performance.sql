-- Performance der Zugriffsregeln (RLS), ohne Rechte zu ändern. Nur nicht-zerstörende Befehle (ALTER/CREATE).
-- Vorher gesichert: wartung.policy_backup_20261018 (alle Policies); Wiederherstellung: supabase/wartung/policies_wiederherstellen.sql
--
-- 1) Doppelte/überflüssige Policies stillgelegt (gelten nur noch für service_role, die RLS ohnehin umgeht, und geben nichts frei).
--    Sie heißen jetzt „stillgelegt: …“ und können im Dashboard gelöscht werden.
-- 2) Eigene Challenges: Punkte 5–30 (galt bisher nur in einer doppelten Policy und war dadurch wirkungslos).
-- 3) auth.uid() → (SELECT auth.uid()): wird einmal pro Abfrage statt pro Zeile ausgewertet (Supabase-Hinweis auth_rls_initplan).
--    Ausnahme: Leseregel von profiles bleibt bei auth.uid(), weil die Änderungsregel von profiles profiles selbst abfragt
--    (sonst „infinite recursion detected in policy for relation profiles“).
-- 4) Policies für die Rolle public auf authenticated (alle prüfen auth.uid(); ohne Anmeldung gaben sie nie etwas frei).
-- 5) Coach darf Rezepte seiner Klienten lesen und ändern (Masterplan-Import: Rezepte zurücklesen, Bilder setzen, alte ersetzen).
-- 6) Indizes für Fremdschlüssel.

CREATE SCHEMA IF NOT EXISTS wartung;
REVOKE ALL ON SCHEMA wartung FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS wartung.policy_backup_20261018 AS
  SELECT now() AS gesichert_am, schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public';
REVOKE ALL ON wartung.policy_backup_20261018 FROM PUBLIC, anon, authenticated;

DO $opt$
DECLARE r record; q text; c text; stmt text;
BEGIN
  -- 1) stilllegen
  FOR r IN SELECT p.tablename, p.policyname, p.cmd FROM pg_policies p
    JOIN (VALUES
      ('belohnungen', 'Users manage own rewards'), ('characters', 'Coach reads client character'),
      ('koerperfotos', 'Users manage own body photo rows'), ('koerperfotos', 'Coach reads client body photo rows'),
      ('training_vorlagen', 'Users can manage own vorlagen'), ('vorlagen_uebungen', 'Users can manage vorlagen uebungen'),
      ('xp_events', 'Users add own xp events'), ('invite_codes', 'Coaches can read own invite codes'),
      ('invite_codes', 'Validate invite code during registration'), ('challenges', 'Users drop own challenges'),
      ('challenges', 'Users finish own challenges'), ('challenges', 'Users start own challenges'),
      ('profiles', 'Users can view own profile')
    ) AS v(t, pol) ON v.t = p.tablename AND v.pol = p.policyname
    WHERE p.schemaname = 'public'
  LOOP
    stmt := format('ALTER POLICY %I ON public.%I TO service_role', r.policyname, r.tablename);
    IF r.cmd <> 'INSERT' THEN stmt := stmt || ' USING (false)'; END IF;
    IF r.cmd IN ('ALL', 'INSERT', 'UPDATE') THEN stmt := stmt || ' WITH CHECK (false)'; END IF;
    EXECUTE stmt;
    EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I', r.policyname, r.tablename, left('stillgelegt: ' || r.policyname, 63));
  END LOOP;

  -- 2) Challenge-Punkte
  ALTER POLICY "Users insert own challenges" ON public.challenges
    WITH CHECK ((user_id = auth.uid()) AND (coach_id IS NULL) AND (punkte >= 5) AND (punkte <= 30));

  -- 3) + 4)
  FOR r IN SELECT tablename, policyname, qual, with_check, roles FROM pg_policies
    WHERE schemaname = 'public' AND NOT ('service_role' = ANY (roles))
  LOOP
    IF NOT (r.tablename = 'profiles' AND r.policyname = 'Coach can view client profiles') THEN
      q := regexp_replace(r.qual, '(?<!SELECT )auth\.uid\(\)', '(SELECT auth.uid())', 'g');
      c := regexp_replace(r.with_check, '(?<!SELECT )auth\.uid\(\)', '(SELECT auth.uid())', 'g');
      IF q IS DISTINCT FROM r.qual OR c IS DISTINCT FROM r.with_check THEN
        stmt := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename);
        IF q IS NOT NULL THEN stmt := stmt || ' USING (' || q || ')'; END IF;
        IF c IS NOT NULL THEN stmt := stmt || ' WITH CHECK (' || c || ')'; END IF;
        EXECUTE stmt;
      END IF;
    END IF;
    IF 'public' = ANY (r.roles) AND (coalesce(r.qual, '') || coalesce(r.with_check, '')) ~ 'auth\.uid\(\)' THEN
      EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.policyname, r.tablename);
    END IF;
  END LOOP;
  ALTER POLICY "Coach can view client profiles" ON public.profiles USING ((auth.uid() = id) OR (coach_id = auth.uid()));

  -- 5) Coach und Rezepte seiner Klienten
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rezepte' AND policyname = 'Coach reads client recipes') THEN
    CREATE POLICY "Coach reads client recipes" ON public.rezepte FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = rezepte.user_id AND p.coach_id = (SELECT auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rezepte' AND policyname = 'Coach updates client recipes') THEN
    CREATE POLICY "Coach updates client recipes" ON public.rezepte FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = rezepte.user_id AND p.coach_id = (SELECT auth.uid())))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = rezepte.user_id AND p.coach_id = (SELECT auth.uid())));
  END IF;
END $opt$;

-- 6) Indizes
CREATE INDEX IF NOT EXISTS coach_plans_coach_id_idx ON public.coach_plans (coach_id);
CREATE INDEX IF NOT EXISTS food_log_user_datum_idx ON public.food_log (user_id, datum);
CREATE INDEX IF NOT EXISTS haushalt_mitglieder_user_id_idx ON public.haushalt_mitglieder (user_id);
CREATE INDEX IF NOT EXISTS haushalte_coach_id_idx ON public.haushalte (coach_id);
CREATE INDEX IF NOT EXISTS invite_codes_coach_id_idx ON public.invite_codes (coach_id);
CREATE INDEX IF NOT EXISTS invite_codes_used_by_idx ON public.invite_codes (used_by);
CREATE INDEX IF NOT EXISTS meal_plans_rezept_id_idx ON public.meal_plans (rezept_id);
CREATE INDEX IF NOT EXISTS meal_plans_user_datum_idx ON public.meal_plans (user_id, datum);
CREATE INDEX IF NOT EXISTS profiles_coach_id_idx ON public.profiles (coach_id);
CREATE INDEX IF NOT EXISTS rezepte_user_id_idx ON public.rezepte (user_id);
CREATE INDEX IF NOT EXISTS supplement_log_user_id_idx ON public.supplement_log (user_id);
CREATE INDEX IF NOT EXISTS supplements_user_id_idx ON public.supplements (user_id);
CREATE INDEX IF NOT EXISTS uebungen_training_id_idx ON public.uebungen (training_id);
CREATE INDEX IF NOT EXISTS wasser_log_user_datum_idx ON public.wasser_log (user_id, datum);
