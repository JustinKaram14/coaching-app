-- Favoriten in „Entdecken“: pro Nutzer eine Zeile je Rezept (Startrezept-ID oder ID eines KI-Rezepts)
CREATE TABLE IF NOT EXISTS public.rezept_favoriten (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  rezept_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rezept_favoriten_id_length CHECK (char_length(rezept_id) BETWEEN 3 AND 80),
  CONSTRAINT rezept_favoriten_eindeutig UNIQUE (user_id, rezept_id)
);

ALTER TABLE public.rezept_favoriten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own rezept_favoriten" ON public.rezept_favoriten;
CREATE POLICY "Users manage own rezept_favoriten" ON public.rezept_favoriten
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
