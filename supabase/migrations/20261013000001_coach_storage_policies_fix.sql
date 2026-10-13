-- Coach-Zugriff auf Dateien von Klienten reparieren.
-- In den alten Policies stand in der Unterabfrage unqualifiziert "name". Dort gibt es auch profiles.name,
-- darum wurde der Dateiname nie mit der Klienten-ID verglichen und der Coach sah die Dateien nie.
-- Jetzt ausdrücklich objects.name.

DROP POLICY IF EXISTS "Coach reads client body photos" ON storage.objects;
CREATE POLICY "Coach reads client body photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'body-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.client_settings cs ON cs.user_id = p.id
      WHERE p.id::text = (storage.foldername(objects.name))[1]
        AND p.coach_id = auth.uid()
        AND cs.coach_foto_freigabe = true
    )
  );

DROP POLICY IF EXISTS "Coach manages masterplan files" ON storage.objects;
CREATE POLICY "Coach manages masterplan files" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'masterplans'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = (storage.foldername(objects.name))[1]
        AND p.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'masterplans'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = (storage.foldername(objects.name))[1]
        AND p.coach_id = auth.uid()
    )
  );
