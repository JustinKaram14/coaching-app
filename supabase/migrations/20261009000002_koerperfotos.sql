-- Körperfotos mit eigener Beschriftung (mehrere Fotos pro Tag). Die Bilddateien liegen im privaten Bucket "body-photos".

CREATE TABLE IF NOT EXISTS public.koerperfotos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  datum date NOT NULL,
  pfad text NOT NULL,
  label text NOT NULL DEFAULT 'Foto',
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Der Pfad muss im eigenen Ordner liegen (userId/datei.jpg)
  CONSTRAINT koerperfotos_pfad_eigener_ordner CHECK (pfad LIKE user_id::text || '/%'),
  CONSTRAINT koerperfotos_label_length CHECK (char_length(label) <= 60)
);

CREATE INDEX IF NOT EXISTS koerperfotos_user_datum_idx ON public.koerperfotos (user_id, datum DESC);

ALTER TABLE public.koerperfotos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own koerperfotos" ON public.koerperfotos;
CREATE POLICY "Users manage own koerperfotos" ON public.koerperfotos
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Coach sieht Fotos nur, wenn der Klient sie freigegeben hat (wie bei den Bilddateien im Bucket)
DROP POLICY IF EXISTS "Coach reads released koerperfotos" ON public.koerperfotos;
CREATE POLICY "Coach reads released koerperfotos" ON public.koerperfotos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.client_settings cs ON cs.user_id = p.id
      WHERE p.id = koerperfotos.user_id
        AND p.coach_id = auth.uid()
        AND cs.coach_foto_freigabe = true
    )
  );
