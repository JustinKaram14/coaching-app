-- Rezepte „Entdecken“: Ballaststoffe im Tagebuch, persönliche Ausschlussliste, Anamnese-Schalter,
-- KI-Rezepte pro Nutzer und ein öffentlicher Bucket für Rezeptfotos.

-- 1) Ballaststoffe im Ernährungs-Tagebuch (für das Tagesziel von 30 g). Alte Einträge bleiben leer.
ALTER TABLE public.food_log ADD COLUMN IF NOT EXISTS ballaststoffe_g numeric;

-- 2) Ausschlussliste pro Nutzer:
--    hart = Allergie/Unverträglichkeit (Rezept wird ausgeblendet), weich = „Schmeckt mir nicht“ (Rezept rutscht nach hinten)
CREATE TABLE IF NOT EXISTS public.rezept_ausschluesse (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  begriff text NOT NULL,
  art text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rezept_ausschluesse_art CHECK (art IN ('hart', 'weich')),
  CONSTRAINT rezept_ausschluesse_begriff_length CHECK (char_length(begriff) BETWEEN 2 AND 60),
  CONSTRAINT rezept_ausschluesse_eindeutig UNIQUE (user_id, begriff)
);

ALTER TABLE public.rezept_ausschluesse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own rezept_ausschluesse" ON public.rezept_ausschluesse;
CREATE POLICY "Users manage own rezept_ausschluesse" ON public.rezept_ausschluesse
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3) Einstellungen für Entdecken (Schalter „Anamnese zum Filtern nutzen“)
CREATE TABLE IF NOT EXISTS public.rezept_praeferenzen (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  anamnese_filter boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rezept_praeferenzen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own rezept_praeferenzen" ON public.rezept_praeferenzen;
CREATE POLICY "Users manage own rezept_praeferenzen" ON public.rezept_praeferenzen
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4) Per KI erzeugte Entdecken-Rezepte (Zutaten als IDs der Zutaten-Datenbank, Nährwerte werden in der App berechnet)
CREATE TABLE IF NOT EXISTS public.entdecken_rezepte (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  daten jsonb NOT NULL,
  bild_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entdecken_rezepte_user_idx ON public.entdecken_rezepte (user_id, created_at DESC);

ALTER TABLE public.entdecken_rezepte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own entdecken_rezepte" ON public.entdecken_rezepte;
CREATE POLICY "Users manage own entdecken_rezepte" ON public.entdecken_rezepte
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5) Öffentlicher Bucket für Rezeptfotos (start/<id>.jpg und ki/<user>/<id>.jpg). Schreiben nur über die Edge Function.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rezept-bilder', 'rezept-bilder', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Auflisten (um zu sehen, welche Startfotos schon da sind) für angemeldete Nutzer; Abruf per URL geht ohnehin öffentlich
DROP POLICY IF EXISTS "Authenticated list rezept-bilder" ON storage.objects;
CREATE POLICY "Authenticated list rezept-bilder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'rezept-bilder');
