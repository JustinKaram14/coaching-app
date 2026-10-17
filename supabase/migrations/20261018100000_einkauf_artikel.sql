-- Eigene Artikel auf der Einkaufsliste (z. B. „Klopapier“, „2 l Milch“)

CREATE TABLE IF NOT EXISTS public.einkauf_artikel (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT einkauf_artikel_text_laenge CHECK (char_length(btrim(text)) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS einkauf_artikel_user_idx ON public.einkauf_artikel (user_id, created_at);

ALTER TABLE public.einkauf_artikel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own einkauf_artikel" ON public.einkauf_artikel;
CREATE POLICY "Users manage own einkauf_artikel" ON public.einkauf_artikel
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Höchstens 200 eigene Artikel pro Person
CREATE OR REPLACE FUNCTION public.einkauf_artikel_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF (SELECT count(*) FROM public.einkauf_artikel WHERE user_id = NEW.user_id) >= 200 THEN
    RAISE EXCEPTION 'Zu viele Artikel auf der Einkaufsliste';
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS einkauf_artikel_limit ON public.einkauf_artikel;
CREATE TRIGGER einkauf_artikel_limit BEFORE INSERT ON public.einkauf_artikel
  FOR EACH ROW EXECUTE FUNCTION public.einkauf_artikel_limit();

REVOKE ALL ON FUNCTION public.einkauf_artikel_limit() FROM PUBLIC, anon, authenticated;
