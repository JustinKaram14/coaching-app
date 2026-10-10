-- Sicherheit: Einladungscode-Funktion absichern, Rollenschutz für Profile einschalten, interne Funktionen sperren.
-- Ergebnis der Supabase-Prüfung vom 10.10.2026. Die Datei darf mehrfach laufen.
--
-- 1. validate_and_use_invite_code(p_code, p_user_id) war ohne Anmeldung aufrufbar und nahm eine beliebige Nutzer-ID.
--    Jetzt: Wer angemeldet ist, darf nur sich selbst zuordnen; zugeordnet wird nur ein frisches Konto (höchstens 30 Minuten alt)
--    ohne Coach. Die Registrierung funktioniert wie bisher (sie ruft die Funktion direkt nach der Anmeldung auf).
-- 2. prevent_privilege_escalation() existierte, hing aber an keiner Tabelle. Jetzt als Trigger auf profiles:
--    Über die API (auth.uid() gesetzt) lassen sich Rolle und Coach nicht mehr ändern; der Coach wird nur über die
--    Einladungscode-Funktion gesetzt. Der SQL-Editor und der Service-Schlüssel sind nicht betroffen.
-- 3. Interne Trigger-Funktionen waren über die API aufrufbar. Der Aufruf wird gesperrt, die Trigger laufen weiter.

CREATE OR REPLACE FUNCTION public.validate_and_use_invite_code(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_code invite_codes%ROWTYPE;
  v_fehler constant jsonb := jsonb_build_object('error', 'Ungültiger oder bereits verwendeter Einladungscode.');
BEGIN
  -- Angemeldet: nur für sich selbst
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN v_fehler;
  END IF;

  -- Nur ein frisches Konto ohne Coach darf zugeordnet werden
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND role = 'client' AND coach_id IS NULL AND created_at > now() - interval '30 minutes'
  ) THEN
    RETURN v_fehler;
  END IF;

  SELECT * INTO v_code
  FROM invite_codes
  WHERE code = upper(trim(p_code))
    AND used_by IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_code.id IS NULL THEN
    RETURN v_fehler;
  END IF;

  UPDATE invite_codes SET used_by = p_user_id WHERE id = v_code.id AND used_by IS NULL;

  -- Der Trigger auf profiles erlaubt die Coach-Zuordnung nur mit diesem Merker
  PERFORM set_config('app.einladung', '1', true);
  UPDATE profiles SET coach_id = v_code.coach_id WHERE id = p_user_id AND coach_id IS NULL;
  PERFORM set_config('app.einladung', '', true);

  RETURN jsonb_build_object('coach_id', v_code.coach_id, 'ok', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_and_use_invite_code(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_and_use_invite_code(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- SQL-Editor und Service-Schlüssel (keine angemeldete Person): erlaubt
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not permitted via this endpoint.';
  END IF;
  IF NEW.coach_id IS DISTINCT FROM OLD.coach_id AND current_setting('app.einladung', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Changing coach_id is not permitted via this endpoint.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_rollenschutz ON public.profiles;
CREATE TRIGGER profiles_rollenschutz
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- Interne Funktionen: fester search_path und nicht über /rest/v1/rpc aufrufbar
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_last_active() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_last_active() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_privilege_escalation() FROM PUBLIC, anon, authenticated;

-- Hilfsfunktionen für die Haushalts-Regeln: nur für angemeldete Personen (die Regeln brauchen sie)
REVOKE EXECUTE ON FUNCTION public.is_haushalt_coach(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_haushalt_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_haushalt_coach(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_haushalt_member(uuid) TO authenticated;
