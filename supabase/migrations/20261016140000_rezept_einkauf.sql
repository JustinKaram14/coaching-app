-- Einkaufsliste in „Entdecken“: pro Nutzer ein Eintrag je Rezept mit gewählter Portionszahl.
-- Die Zutaten werden in der App aus den Rezepten zusammengerechnet.
CREATE TABLE IF NOT EXISTS public.rezept_einkauf (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  rezept_id text NOT NULL,
  rezept_name text NOT NULL,
  portionen numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rezept_einkauf_id_length CHECK (char_length(rezept_id) BETWEEN 3 AND 80),
  CONSTRAINT rezept_einkauf_name_length CHECK (char_length(rezept_name) BETWEEN 1 AND 120),
  CONSTRAINT rezept_einkauf_portionen CHECK (portionen >= 0.5 AND portionen <= 24),
  CONSTRAINT rezept_einkauf_eindeutig UNIQUE (user_id, rezept_id)
);

ALTER TABLE public.rezept_einkauf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own rezept_einkauf" ON public.rezept_einkauf;
CREATE POLICY "Users manage own rezept_einkauf" ON public.rezept_einkauf
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
