-- Übernahme der aufbereiteten Lebensmittel-Daten vom GitHub-Branch `lebensmittel-daten` per pg_net.
-- Nur für den Datenbank-Admin (SQL-Editor), nicht für App-Nutzer.

CREATE TABLE IF NOT EXISTS public.lebensmittel_import (
  teil integer PRIMARY KEY,
  anfrage bigint NOT NULL
);
ALTER TABLE public.lebensmittel_import ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.lebensmittel_import_anfordern(teile integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  FOR i IN 1..teile LOOP
    INSERT INTO lebensmittel_import (teil, anfrage)
    VALUES (i, net.http_get(
      format('https://raw.githubusercontent.com/YoungShindy/coaching-app/lebensmittel-daten/teil-%s.json', lpad(i::text, 2, '0')),
      timeout_milliseconds := 120000))
    ON CONFLICT (teil) DO UPDATE SET anfrage = excluded.anfrage;
  END LOOP;
  RETURN teile;
END $$;

CREATE OR REPLACE FUNCTION public.lebensmittel_import_uebernehmen(teile integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  zeilen integer;
  gesamt integer := 0;
  offen integer := 0;
  fehler text := '';
BEGIN
  FOR r IN
    SELECT i.teil, h.status_code, h.content
    FROM lebensmittel_import i LEFT JOIN net._http_response h ON h.id = i.anfrage
    WHERE i.teil <= teile ORDER BY i.teil
  LOOP
    IF r.status_code IS NULL THEN
      offen := offen + 1;
    ELSIF r.status_code <> 200 THEN
      fehler := fehler || format(' Teil %s: HTTP %s.', r.teil, r.status_code);
    ELSE
      INSERT INTO lebensmittel (id, quelle, name, marke, kategorie, barcode, kcal, protein, kh, zucker, fett, gesaettigt,
                                ballast, salz, ml, portion_g, menge, nutriscore, nova, zusatzstoffe, bio, beliebtheit, suchwoerter)
      SELECT id, quelle, name, marke, kategorie, barcode, kcal, protein, kh, zucker, fett, gesaettigt,
             ballast, salz, ml, portion_g, menge, nutriscore, nova, zusatzstoffe, bio, beliebtheit, suchwoerter
      FROM jsonb_populate_recordset(NULL::lebensmittel, r.content::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        quelle = excluded.quelle, name = excluded.name, marke = excluded.marke, kategorie = excluded.kategorie,
        barcode = excluded.barcode, kcal = excluded.kcal, protein = excluded.protein, kh = excluded.kh,
        zucker = excluded.zucker, fett = excluded.fett, gesaettigt = excluded.gesaettigt, ballast = excluded.ballast,
        salz = excluded.salz, ml = excluded.ml, portion_g = excluded.portion_g, menge = excluded.menge,
        nutriscore = excluded.nutriscore, nova = excluded.nova, zusatzstoffe = excluded.zusatzstoffe, bio = excluded.bio,
        beliebtheit = excluded.beliebtheit, suchwoerter = excluded.suchwoerter, aktualisiert_am = now();
      GET DIAGNOSTICS zeilen = ROW_COUNT;
      gesamt := gesamt + zeilen;
    END IF;
  END LOOP;
  RETURN format('%s Einträge übernommen, %s Teile noch nicht geladen.%s', gesamt, offen, fehler);
END $$;

REVOKE ALL ON FUNCTION public.lebensmittel_import_anfordern(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lebensmittel_import_uebernehmen(integer) FROM PUBLIC, anon, authenticated;
