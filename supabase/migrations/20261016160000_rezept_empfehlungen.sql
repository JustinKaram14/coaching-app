-- Coach-Empfehlungen in „Entdecken“: Der Coach empfiehlt einem eigenen Klienten ein Rezept aus der Startbibliothek.
-- Der Klient sieht seine Empfehlungen und darf sie nur als „gesehen“ markieren.
CREATE TABLE IF NOT EXISTS public.rezept_empfehlungen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rezept_id text NOT NULL,
  rezept_name text NOT NULL,
  notiz text,
  gesehen_am timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rezept_empfehlungen_id_length CHECK (char_length(rezept_id) BETWEEN 3 AND 80),
  CONSTRAINT rezept_empfehlungen_name_length CHECK (char_length(rezept_name) BETWEEN 1 AND 120),
  CONSTRAINT rezept_empfehlungen_notiz_length CHECK (notiz IS NULL OR char_length(notiz) <= 300),
  CONSTRAINT rezept_empfehlungen_eindeutig UNIQUE (coach_id, client_id, rezept_id)
);

CREATE INDEX IF NOT EXISTS rezept_empfehlungen_client_idx ON public.rezept_empfehlungen (client_id, created_at DESC);

ALTER TABLE public.rezept_empfehlungen ENABLE ROW LEVEL SECURITY;

-- Coach: verwaltet seine Empfehlungen, aber nur für Klienten, die ihm zugeordnet sind
DROP POLICY IF EXISTS "Coach manages own rezept_empfehlungen" ON public.rezept_empfehlungen;
CREATE POLICY "Coach manages own rezept_empfehlungen" ON public.rezept_empfehlungen
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = client_id AND p.coach_id = auth.uid())
  );

-- Klient: liest die eigenen Empfehlungen und markiert sie als gesehen
DROP POLICY IF EXISTS "Client reads own rezept_empfehlungen" ON public.rezept_empfehlungen;
CREATE POLICY "Client reads own rezept_empfehlungen" ON public.rezept_empfehlungen
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Client marks own rezept_empfehlungen seen" ON public.rezept_empfehlungen;
CREATE POLICY "Client marks own rezept_empfehlungen seen" ON public.rezept_empfehlungen
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Der Klient darf dabei nur gesehen_am ändern, nichts am Inhalt der Empfehlung
CREATE OR REPLACE FUNCTION public.rezept_empfehlungen_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.client_id AND auth.uid() <> OLD.coach_id THEN
    IF NEW.coach_id <> OLD.coach_id OR NEW.client_id <> OLD.client_id OR NEW.rezept_id <> OLD.rezept_id
       OR NEW.rezept_name <> OLD.rezept_name OR NEW.notiz IS DISTINCT FROM OLD.notiz OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Der Klient darf nur gesehen_am ändern';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rezept_empfehlungen_client_update ON public.rezept_empfehlungen;
CREATE TRIGGER rezept_empfehlungen_client_update
  BEFORE UPDATE ON public.rezept_empfehlungen
  FOR EACH ROW EXECUTE FUNCTION public.rezept_empfehlungen_client_update();
