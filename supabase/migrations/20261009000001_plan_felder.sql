-- Felder für den Plan-Baukasten und Erinnerungen an Termine (alle optional, bestehende Daten bleiben unverändert)

-- Pläne bestehen aus mehreren Trainingstagen (Vorlagen), die zusammen unter einem Plan-Namen laufen
ALTER TABLE public.training_vorlagen
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS plan_split text,
  ADD COLUMN IF NOT EXISTS plan_reihenfolge integer;

-- Wiederholungs-Bereich ("6-8"), Muskelgruppe und Rolle der Übung im Plan
ALTER TABLE public.vorlagen_uebungen
  ADD COLUMN IF NOT EXISTS wdh_text text,
  ADD COLUMN IF NOT EXISTS gruppe text,
  ADD COLUMN IF NOT EXISTS rolle text;

-- Termine: verknüpfte Vorlage, Erinnerung vorher (Minuten) und wer den Termin angelegt hat
ALTER TABLE public.kalender_events
  ADD COLUMN IF NOT EXISTS vorlage_id uuid REFERENCES public.training_vorlagen(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS erinnerung_min integer,
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  ALTER TABLE public.training_vorlagen
    ADD CONSTRAINT plan_name_length CHECK (char_length(plan_name) <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.kalender_events
    ADD CONSTRAINT erinnerung_min_range CHECK (erinnerung_min IS NULL OR erinnerung_min BETWEEN 0 AND 10080);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
