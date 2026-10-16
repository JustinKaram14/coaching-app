-- Wochenziel „30 Pflanzen“: pro Nutzer, Tag und Pflanze eine Zeile (Schlüssel aus der Pflanzenliste der App oder „eigen:name“).
-- Rezepte aus „Entdecken“ tragen beim Eintrag ins Tagebuch ihre Pflanzen ein, weitere lassen sich von Hand nachtragen.
CREATE TABLE IF NOT EXISTS public.pflanzen_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  datum date NOT NULL,
  pflanze text NOT NULL,
  name text NOT NULL,
  quelle text NOT NULL DEFAULT 'manuell',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pflanzen_log_pflanze_length CHECK (char_length(pflanze) BETWEEN 2 AND 60),
  CONSTRAINT pflanzen_log_name_length CHECK (char_length(name) BETWEEN 1 AND 40),
  CONSTRAINT pflanzen_log_quelle CHECK (quelle IN ('rezept', 'manuell')),
  CONSTRAINT pflanzen_log_eindeutig UNIQUE (user_id, datum, pflanze)
);

CREATE INDEX IF NOT EXISTS pflanzen_log_user_datum_idx ON public.pflanzen_log (user_id, datum DESC);

ALTER TABLE public.pflanzen_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pflanzen_log" ON public.pflanzen_log;
CREATE POLICY "Users manage own pflanzen_log" ON public.pflanzen_log
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
