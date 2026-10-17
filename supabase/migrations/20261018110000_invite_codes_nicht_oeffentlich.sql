-- Einladungscodes waren für alle (auch ohne Anmeldung) lesbar: Policy „Validate invite code during registration“
-- mit USING (used_by IS NULL). Die Registrierung prüft Codes über validate_and_use_invite_code (SECURITY DEFINER)
-- und braucht die Policy nicht. Sie gibt jetzt nichts mehr frei (kann im Dashboard auch ganz gelöscht werden).
ALTER POLICY "Validate invite code during registration" ON public.invite_codes USING (false);

-- suchnorm: fester search_path (Supabase-Hinweis function_search_path_mutable)
ALTER FUNCTION public.suchnorm(text) SET search_path = pg_catalog;

-- Speicher: nur Bilder bis 20 MB für Körperfotos und Challenge-Nachweise, nur PDF für Masterpläne
UPDATE storage.buckets SET file_size_limit = 20971520, allowed_mime_types = ARRAY['image/*'] WHERE id IN ('body-photos', 'challenge-proofs');
UPDATE storage.buckets SET allowed_mime_types = ARRAY['application/pdf'] WHERE id = 'masterplans' AND allowed_mime_types IS NULL;
