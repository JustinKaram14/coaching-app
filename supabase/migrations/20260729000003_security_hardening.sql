-- ============================================================
-- SECURITY HARDENING — Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. FIX CRITICAL: Prevent role escalation attack ──────────
-- Without WITH CHECK, any user can UPDATE their own role to 'coach'
-- and gain access to all client data. Fixed here.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Role can never be changed by the user themselves
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
  );

-- ── 2. Allow users to delete their own profile (GDPR Art. 17) ─
-- Deleting the profile cascades to all health data (ON DELETE CASCADE)
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- ── 3. Body photos storage RLS (body-photos bucket) ──────────
-- Users can only access their own folder (userId/...)
-- This makes the bucket private and properly enforces access control
DROP POLICY IF EXISTS "Users manage own body photos" ON storage.objects;
CREATE POLICY "Users manage own body photos" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'body-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'body-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Coach can view body photos only if client has granted access (coach_foto_freigabe)
DROP POLICY IF EXISTS "Coach reads client body photos" ON storage.objects;
CREATE POLICY "Coach reads client body photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'body-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.client_settings cs ON cs.user_id = p.id
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.coach_id = auth.uid()
        AND cs.coach_foto_freigabe = true
    )
  );

-- ── 4. Fix invite codes: restrict public read ─────────────────
-- Previously: anyone could list ALL invite codes (security risk)
-- Now: only coaches see their own codes; validation uses an RPC below
DROP POLICY IF EXISTS "Anyone can read unused codes (for registration)" ON public.invite_codes;
CREATE POLICY "Coaches can read own invite codes" ON public.invite_codes
  FOR SELECT USING (auth.uid() = coach_id);

-- Secure invite code validation function (SECURITY DEFINER = runs with DB owner rights)
-- This lets the registration flow validate a code without exposing all codes
CREATE OR REPLACE FUNCTION public.validate_and_use_invite_code(
  p_code text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code invite_codes%ROWTYPE;
BEGIN
  -- Find valid unused code
  SELECT * INTO v_code
  FROM invite_codes
  WHERE code = upper(trim(p_code))
    AND used_by IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_code.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Ungültiger oder bereits verwendeter Einladungscode.');
  END IF;

  -- Mark code as used
  UPDATE invite_codes SET used_by = p_user_id WHERE id = v_code.id;

  -- Set coach_id on the profile
  UPDATE profiles SET coach_id = v_code.coach_id WHERE id = p_user_id;

  RETURN jsonb_build_object('coach_id', v_code.coach_id, 'ok', true);
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.validate_and_use_invite_code(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_and_use_invite_code(text, uuid) TO authenticated;

-- ── 5. Consent tracking columns ──────────────────────────────
-- Required by DSGVO Art. 7(1): must be able to prove consent was given
ALTER TABLE public.client_settings
  ADD COLUMN IF NOT EXISTS consent_dsgvo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_ai boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz;

-- ── 6. Text field length constraints ─────────────────────────
-- Prevent abuse via oversized payloads
DO $$
BEGIN
  ALTER TABLE public.training
    ADD CONSTRAINT trainingstyp_length CHECK (char_length(trainingstyp) <= 100),
    ADD CONSTRAINT notizen_length_training CHECK (char_length(notizen) <= 2000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.uebungen
    ADD CONSTRAINT uebungsname_length CHECK (char_length(uebungsname) <= 200),
    ADD CONSTRAINT notizen_length_uebungen CHECK (char_length(notizen) <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.schlaf
    ADD CONSTRAINT notizen_length_schlaf CHECK (char_length(notizen) <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.gewicht
    ADD CONSTRAINT notizen_length_gewicht CHECK (char_length(notizen) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT name_length CHECK (char_length(name) <= 100),
    ADD CONSTRAINT email_length CHECK (char_length(email) <= 254);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
