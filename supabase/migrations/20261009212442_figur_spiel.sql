-- Figur, XP, Challenges und Belohnungen
-- Tabellen: characters, xp_events, challenges, belohnungen, einloesungen; Ansicht: character_stats; Bucket: challenge-proofs
-- Die CHECK-Regeln entsprechen dem Stand in der Datenbank (Prüfung am 10.10.2026).

-- ── Figur ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.characters (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  equipped jsonb NOT NULL DEFAULT '{}'::jsonb,
  kennenlernen jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT characters_name_check CHECK (char_length(name) BETWEEN 1 AND 16)
);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own character" ON public.characters;
CREATE POLICY "Users manage own character" ON public.characters
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Coach reads client characters" ON public.characters;
CREATE POLICY "Coach reads client characters" ON public.characters
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = characters.user_id AND p.coach_id = auth.uid()));

-- ── XP und Punkte (nur anhängen, nie ändern) ─────────────────
-- xp = Erfahrung für das Level, punkte = Währung für Shop und Belohnungen (negativ = ausgegeben)
CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quelle text NOT NULL,
  ref text NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  punkte integer NOT NULL DEFAULT 0,
  titel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Jedes Ereignis zählt nur einmal (z. B. "wasser" am 2026-10-09)
  CONSTRAINT xp_events_einmalig UNIQUE (user_id, quelle, ref),
  CONSTRAINT xp_events_punkte_check CHECK (punkte BETWEEN -5000 AND 500),
  CONSTRAINT xp_events_xp_check CHECK (xp BETWEEN 0 AND 500)
);

CREATE INDEX IF NOT EXISTS xp_events_user_created_idx ON public.xp_events (user_id, created_at DESC);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own xp events" ON public.xp_events;
CREATE POLICY "Users read own xp events" ON public.xp_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own xp events" ON public.xp_events;
CREATE POLICY "Users insert own xp events" ON public.xp_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Coach reads client xp events" ON public.xp_events;
CREATE POLICY "Coach reads client xp events" ON public.xp_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = xp_events.user_id AND p.coach_id = auth.uid()));

-- Prüft jedes neue Ereignis: erlaubte Quellen, Obergrenzen, und ausgegeben werden darf nur, was da ist.
-- Fehlercode P0001 (RAISE EXCEPTION): die App versucht es dann nicht erneut.
CREATE OR REPLACE FUNCTION public.xp_events_pruefen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_kontostand integer;
BEGIN
  IF NEW.punkte < 0 THEN
    -- Ausgabe: nur Shop oder Belohnung, keine XP, und das Guthaben muss reichen
    IF NEW.quelle NOT IN ('shop', 'belohnung') OR NEW.xp <> 0 THEN
      RAISE EXCEPTION 'Ungültige Ausgabe';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtext('xp:' || NEW.user_id::text));
    SELECT COALESCE(SUM(punkte), 0) INTO v_kontostand FROM public.xp_events WHERE user_id = NEW.user_id;
    IF v_kontostand + NEW.punkte < 0 THEN
      RAISE EXCEPTION 'Nicht genug Punkte';
    END IF;
  ELSE
    -- Gutschrift: nur bekannte Quellen mit Obergrenzen
    IF NEW.xp < 0 OR NEW.xp > 500 THEN
      RAISE EXCEPTION 'Ungültige XP';
    END IF;
    IF NEW.quelle IN ('mahlzeit', 'schlaf', 'gewicht', 'training', 'supplements', 'wasser', 'gruener-tag') THEN
      IF NEW.xp > 50 OR NEW.punkte > 50 THEN RAISE EXCEPTION 'Ungültige Gutschrift'; END IF;
    ELSIF NEW.quelle = 'challenge' THEN
      IF NEW.punkte > 100 THEN RAISE EXCEPTION 'Ungültige Gutschrift'; END IF;
    ELSIF NEW.quelle = 'streak' THEN
      IF NEW.punkte > 500 THEN RAISE EXCEPTION 'Ungültige Gutschrift'; END IF;
    ELSIF NEW.quelle = 'start' THEN
      IF NEW.ref <> 'willkommen' OR NEW.xp <> 0 OR NEW.punkte > 50 THEN RAISE EXCEPTION 'Ungültige Gutschrift'; END IF;
    ELSE
      RAISE EXCEPTION 'Unbekannte Quelle';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS xp_events_pruefen_trigger ON public.xp_events;
CREATE TRIGGER xp_events_pruefen_trigger
  BEFORE INSERT ON public.xp_events
  FOR EACH ROW EXECUTE FUNCTION public.xp_events_pruefen();

-- Summen pro Nutzer. security_invoker: es gelten die Zugriffsregeln von xp_events (Klient: eigene, Coach: seine Klienten)
CREATE OR REPLACE VIEW public.character_stats
WITH (security_invoker = true) AS
SELECT
  user_id,
  COALESCE(SUM(xp), 0)::integer AS xp,
  COALESCE(SUM(punkte), 0)::integer AS punkte
FROM public.xp_events
GROUP BY user_id;

GRANT SELECT ON public.character_stats TO authenticated;

-- ── Challenges ───────────────────────────────────────────────
-- coach_id gesetzt = vom Coach gestellt (Coach sieht den Nachweis); sonst eigene Challenge des Klienten (privat)
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vorlage_id text,
  titel text NOT NULL,
  beschreibung text,
  kategorie text,
  punkte integer NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'aktiv',
  frist date,
  nachweis_text text,
  nachweis_pfad text,
  erledigt_am timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenges_status_check CHECK (status IN ('aktiv', 'erledigt', 'abgebrochen')),
  CONSTRAINT challenges_punkte_check CHECK (punkte BETWEEN 5 AND 100),
  CONSTRAINT challenges_titel_check CHECK (char_length(titel) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS challenges_user_created_idx ON public.challenges (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS challenges_coach_idx ON public.challenges (coach_id) WHERE coach_id IS NOT NULL;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own challenges" ON public.challenges;
CREATE POLICY "Users read own challenges" ON public.challenges
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Klienten legen nur eigene (private) Challenges an; vom Coach gestellte kommen vom Coach
DROP POLICY IF EXISTS "Users insert own challenges" ON public.challenges;
CREATE POLICY "Users insert own challenges" ON public.challenges
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND coach_id IS NULL);

DROP POLICY IF EXISTS "Users update own challenges" ON public.challenges;
CREATE POLICY "Users update own challenges" ON public.challenges
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own private challenges" ON public.challenges;
CREATE POLICY "Users delete own private challenges" ON public.challenges
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND coach_id IS NULL);

DROP POLICY IF EXISTS "Coach reads own challenges" ON public.challenges;
CREATE POLICY "Coach reads own challenges" ON public.challenges
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coach creates challenges for clients" ON public.challenges;
CREATE POLICY "Coach creates challenges for clients" ON public.challenges
  FOR INSERT TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = challenges.user_id AND p.coach_id = auth.uid())
  );

DROP POLICY IF EXISTS "Coach deletes own challenges" ON public.challenges;
CREATE POLICY "Coach deletes own challenges" ON public.challenges
  FOR DELETE TO authenticated
  USING (coach_id = auth.uid());

-- Klienten dürfen eine Challenge nur abschließen (Status, Nachweis), nicht Titel, Punkte oder Coach ändern
CREATE OR REPLACE FUNCTION public.challenges_nur_abschliessen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id AND (
       NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.coach_id IS DISTINCT FROM OLD.coach_id
    OR NEW.vorlage_id IS DISTINCT FROM OLD.vorlage_id
    OR NEW.titel IS DISTINCT FROM OLD.titel
    OR NEW.beschreibung IS DISTINCT FROM OLD.beschreibung
    OR NEW.punkte IS DISTINCT FROM OLD.punkte
    OR NEW.frist IS DISTINCT FROM OLD.frist
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Challenge kann nur abgeschlossen werden';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS challenges_nur_abschliessen_trigger ON public.challenges;
CREATE TRIGGER challenges_nur_abschliessen_trigger
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.challenges_nur_abschliessen();

-- ── Belohnungen (eigene Wünsche gegen Punkte) und Einlösungen ─
CREATE TABLE IF NOT EXISTS public.belohnungen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titel text NOT NULL,
  preis integer NOT NULL,
  emoji text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT belohnungen_preis_check CHECK (preis BETWEEN 10 AND 5000),
  CONSTRAINT belohnungen_titel_check CHECK (char_length(titel) BETWEEN 1 AND 60)
);

CREATE TABLE IF NOT EXISTS public.einloesungen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titel text NOT NULL,
  preis integer NOT NULL,
  emoji text,
  genutzt boolean NOT NULL DEFAULT false,
  eingeloest_am timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS belohnungen_user_idx ON public.belohnungen (user_id, preis);
CREATE INDEX IF NOT EXISTS einloesungen_user_idx ON public.einloesungen (user_id, eingeloest_am DESC);

ALTER TABLE public.belohnungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.einloesungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own belohnungen" ON public.belohnungen;
CREATE POLICY "Users manage own belohnungen" ON public.belohnungen
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own einloesungen" ON public.einloesungen;
CREATE POLICY "Users manage own einloesungen" ON public.einloesungen
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Speicher für Challenge-Nachweise (Fotos), privat ─────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('challenge-proofs', 'challenge-proofs', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users manage own challenge proofs" ON storage.objects;
CREATE POLICY "Users manage own challenge proofs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'challenge-proofs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'challenge-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Coach sieht nur Nachweise zu Challenges, die er selbst gestellt hat
DROP POLICY IF EXISTS "Coach reads proofs of own challenges" ON storage.objects;
CREATE POLICY "Coach reads proofs of own challenges" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'challenge-proofs'
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.coach_id = auth.uid()
        AND c.nachweis_pfad = name
    )
  );
