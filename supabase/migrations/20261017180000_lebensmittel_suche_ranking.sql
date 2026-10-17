-- Suche: Grundnahrungsmittel (BLS, besonders roh/frisch) vor beliebten Markenprodukten mit ähnlichem Namen;
-- Beliebtheit (bis 100.000) schwächer gewichten
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
    + (l.quelle = 'bls')::int * 20
    + (l.quelle = 'bls' AND suchnorm(l.name) ~ '(^|[^a-z])(roh|frisch)([^a-z]|$)')::int * 10
    + ln(1 + l.beliebtheit) * 1.5
    - char_length(l.name) * 0.2
    DESC
  LIMIT least(greatest(anzahl, 1), 50)
$$;
