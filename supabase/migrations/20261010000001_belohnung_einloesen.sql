-- Belohnungen einlösen: Gutschein und Punkteabzug in einem Schritt, nur über diese Funktion.
-- Vorher legte die App den Gutschein selbst an und zog danach die Punkte ab; wer die Datenbank direkt ansprach,
-- konnte Gutscheine ohne Punkteabzug anlegen. Jetzt darf ein Nutzer Einlösungen nur noch lesen
-- und als "genutzt" markieren, anlegen und löschen geht nur über belohnung_einloesen.
-- Die Datei darf mehrfach laufen.

CREATE OR REPLACE FUNCTION public.belohnung_einloesen(p_belohnung uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_belohnung public.belohnungen%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet' USING errcode = 'P0001';
  END IF;

  -- Titel und Preis kommen aus der gespeicherten Belohnung, nicht vom Gerät
  SELECT * INTO v_belohnung FROM public.belohnungen WHERE id = p_belohnung AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Belohnung nicht gefunden' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.einloesungen (user_id, titel, preis, emoji)
  VALUES (v_uid, v_belohnung.titel, v_belohnung.preis, v_belohnung.emoji)
  RETURNING id INTO v_id;

  -- Die Prüfungen auf xp_events (Guthaben, Quelle) laufen weiter; reicht das Guthaben nicht,
  -- wird auch der Gutschein zurückgenommen.
  INSERT INTO public.xp_events (user_id, quelle, ref, xp, punkte, titel)
  VALUES (v_uid, 'belohnung', v_id::text, 0, -v_belohnung.preis, left(v_belohnung.titel || ' eingelöst', 160));

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.belohnung_einloesen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.belohnung_einloesen(uuid) TO authenticated;

-- Einlösungen: lesen und als genutzt markieren, mehr nicht
DROP POLICY IF EXISTS "Users manage own einloesungen" ON public.einloesungen;
DROP POLICY IF EXISTS "Users read own einloesungen" ON public.einloesungen;
DROP POLICY IF EXISTS "Users mark own einloesungen used" ON public.einloesungen;

CREATE POLICY "Users read own einloesungen" ON public.einloesungen
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users mark own einloesungen used" ON public.einloesungen
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.einloesungen FROM anon, authenticated;
GRANT UPDATE (genutzt) ON public.einloesungen TO authenticated;
