-- Setzt alle Policies auf den Stand vor 20261018120000_rls_performance.sql zurück (aus wartung.policy_backup_20261018).
-- Stillgelegte Policies bekommen Namen, Rollen und Regeln zurück. Die zwei neuen Rezept-Policies des Coaches
-- („Coach reads client recipes“, „Coach updates client recipes“) bleiben bestehen und müssen bei Bedarf im Dashboard gelöscht werden.
DO $w$
DECLARE b record; aktuell text; stmt text;
BEGIN
  FOR b IN SELECT * FROM wartung.policy_backup_20261018 LOOP
    aktuell := CASE
      WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = b.tablename AND policyname = b.policyname) THEN b.policyname
      ELSE left('stillgelegt: ' || b.policyname, 63) END;
    stmt := format('ALTER POLICY %I ON public.%I TO %s', aktuell, b.tablename, array_to_string(b.roles, ', '));
    IF b.qual IS NOT NULL THEN stmt := stmt || ' USING (' || b.qual || ')'; END IF;
    IF b.with_check IS NOT NULL THEN stmt := stmt || ' WITH CHECK (' || b.with_check || ')'; END IF;
    EXECUTE stmt;
    IF aktuell <> b.policyname THEN
      EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I', aktuell, b.tablename, b.policyname);
    END IF;
  END LOOP;
END $w$;
