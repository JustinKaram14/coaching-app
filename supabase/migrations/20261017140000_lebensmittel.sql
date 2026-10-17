-- Lebensmittel-Datenbank für die Suche in Ernährung (ohne KI):
-- Grundnahrungsmittel aus dem Bundeslebensmittelschlüssel (BLS 4.0, Max Rubner-Institut 2025)
-- und bekannte Markenprodukte aus Open Food Facts (ODbL). Befüllt per scripts/lebensmittel/import.py.

-- Suchtext normalisieren: Kleinschreibung, Umlaute und ß ausschreiben
CREATE OR REPLACE FUNCTION public.suchnorm(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT replace(replace(replace(replace(lower(coalesce(t, '')), 'ß', 'ss'), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue')
$$;

CREATE TABLE IF NOT EXISTS public.lebensmittel (
  id text PRIMARY KEY,                       -- 'bls:<BLS-Code>' oder 'off:<Barcode>'
  quelle text NOT NULL CHECK (quelle IN ('bls', 'off')),
  name text NOT NULL CHECK (char_length(name) <= 200),
  marke text,
  kategorie text,
  barcode text,
  -- Nährwerte pro 100 g bzw. 100 ml
  kcal numeric NOT NULL,
  protein numeric,
  kh numeric,
  zucker numeric,
  fett numeric,
  gesaettigt numeric,
  ballast numeric,
  salz numeric,
  ml boolean NOT NULL DEFAULT false,
  portion_g numeric,
  menge text,                                -- Packungsgröße laut Hersteller
  -- Für die Produktbewertung (Barcode-Analyse)
  nutriscore text,
  nova smallint,
  zusatzstoffe text[],
  bio boolean,
  beliebtheit integer NOT NULL DEFAULT 0,    -- Open Food Facts: Anzahl Scans
  suchwoerter text,                          -- Synonyme, z. B. Karotte zu Möhre
  suchtext text GENERATED ALWAYS AS (public.suchnorm(name || ' ' || coalesce(marke, '') || ' ' || coalesce(suchwoerter, ''))) STORED,
  aktualisiert_am timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lebensmittel_barcode_idx ON public.lebensmittel (barcode) WHERE barcode IS NOT NULL;

ALTER TABLE public.lebensmittel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lebensmittel lesen" ON public.lebensmittel FOR SELECT TO authenticated USING (true);

-- Suche: alle Wörter müssen vorkommen; genaue Treffer und Wortanfänge zuerst,
-- dann Grundnahrungsmittel (BLS), dann bekannte Produkte (viele Scans), kurze Namen vor langen
CREATE OR REPLACE FUNCTION public.suche_lebensmittel(q text, anzahl integer DEFAULT 25)
RETURNS SETOF public.lebensmittel
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH s AS (
    SELECT t, regexp_replace(t, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') AS rx,
           array_remove(regexp_split_to_array(t, '\s+'), '') AS woerter
    FROM (SELECT suchnorm(trim(q)) AS t) x
  )
  SELECT l.*
  FROM public.lebensmittel l, s
  WHERE char_length(s.t) >= 2
    AND NOT EXISTS (SELECT 1 FROM unnest(s.woerter) w WHERE strpos(l.suchtext, w) = 0)
  ORDER BY
      (suchnorm(l.name) = s.t)::int * 100
    + (suchnorm(l.name) ~ ('^' || s.rx || '([^a-z]|$)'))::int * 60
    + (suchnorm(l.name) LIKE s.t || '%')::int * 25
    + (suchnorm(l.name) ~ ('(^|[^a-z])' || s.rx))::int * 15
    + (l.quelle = 'bls')::int * 10
    + ln(1 + l.beliebtheit) * 3
    - char_length(l.name) * 0.2
    DESC
  LIMIT least(greatest(anzahl, 1), 50)
$$;

REVOKE ALL ON FUNCTION public.suche_lebensmittel(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suche_lebensmittel(text, integer) TO authenticated;
