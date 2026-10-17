-- Produkt-Check: Kategorien für Alternativen, Obst-/Gemüseanteil und Produktbild
ALTER TABLE public.lebensmittel
  ADD COLUMN IF NOT EXISTS kategorien text[],
  ADD COLUMN IF NOT EXISTS obst_gemuese numeric,
  ADD COLUMN IF NOT EXISTS bild text;

CREATE INDEX IF NOT EXISTS lebensmittel_kategorien_idx ON public.lebensmittel USING gin (kategorien);

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
                                ballast, salz, ml, portion_g, menge, nutriscore, nova, zusatzstoffe, bio, beliebtheit, suchwoerter,
                                kategorien, obst_gemuese, bild)
      SELECT id, quelle, name, marke, kategorie, barcode, kcal, protein, kh, zucker, fett, gesaettigt,
             ballast, salz, ml, portion_g, menge, nutriscore, nova, zusatzstoffe, bio, beliebtheit, suchwoerter,
             kategorien, obst_gemuese, bild
      FROM jsonb_populate_recordset(NULL::lebensmittel, r.content::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        quelle = excluded.quelle, name = excluded.name, marke = excluded.marke, kategorie = excluded.kategorie,
        barcode = excluded.barcode, kcal = excluded.kcal, protein = excluded.protein, kh = excluded.kh,
        zucker = excluded.zucker, fett = excluded.fett, gesaettigt = excluded.gesaettigt, ballast = excluded.ballast,
        salz = excluded.salz, ml = excluded.ml, portion_g = excluded.portion_g, menge = excluded.menge,
        nutriscore = excluded.nutriscore, nova = excluded.nova, zusatzstoffe = excluded.zusatzstoffe, bio = excluded.bio,
        beliebtheit = excluded.beliebtheit, suchwoerter = excluded.suchwoerter, kategorien = excluded.kategorien,
        obst_gemuese = excluded.obst_gemuese, bild = excluded.bild, aktualisiert_am = now();
      GET DIAGNOSTICS zeilen = ROW_COUNT;
      gesamt := gesamt + zeilen;
    END IF;
  END LOOP;
  RETURN format('%s Einträge übernommen, %s Teile noch nicht geladen.%s', gesamt, offen, fehler);
END $$;

REVOKE ALL ON FUNCTION public.lebensmittel_import_uebernehmen(integer) FROM PUBLIC, anon, authenticated;
