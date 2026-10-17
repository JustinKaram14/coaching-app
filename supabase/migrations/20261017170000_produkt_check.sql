-- Produkt-Check: Verlauf und Favoriten der gescannten Produkte (nur für den Nutzer selbst sichtbar)
CREATE TABLE IF NOT EXISTS public.produkt_scans (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode text NOT NULL CHECK (char_length(barcode) <= 20),
  name text NOT NULL CHECK (char_length(name) <= 200),
  marke text CHECK (char_length(marke) <= 100),
  bild text CHECK (char_length(bild) <= 300),
  punkte smallint CHECK (punkte BETWEEN 0 AND 100),
  favorit boolean NOT NULL DEFAULT false,
  gescannt_am timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, barcode)
);
CREATE INDEX IF NOT EXISTS produkt_scans_verlauf_idx ON public.produkt_scans (user_id, gescannt_am DESC);

ALTER TABLE public.produkt_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigene Scans" ON public.produkt_scans FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Persönliche Präferenzen (vegan, vegetarisch, ohne Palmöl)
ALTER TABLE public.client_settings
  ADD COLUMN IF NOT EXISTS produktcheck_praeferenzen jsonb NOT NULL DEFAULT '{}'::jsonb;
