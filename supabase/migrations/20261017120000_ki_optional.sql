-- KI ist optional: Einwilligung nur durch den Client selbst änderbar, Zeitpunkt der Änderung wird protokolliert (DSGVO Art. 7)
ALTER TABLE public.client_settings
  ADD COLUMN IF NOT EXISTS consent_ai_changed_at timestamptz;

CREATE OR REPLACE FUNCTION public.client_settings_ki_einwilligung()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.consent_ai IS DISTINCT FROM OLD.consent_ai THEN
    IF auth.uid() IS NOT NULL AND auth.uid() <> NEW.user_id THEN
      -- Der Coach darf die KI-Einwilligung seines Clients nicht ändern
      NEW.consent_ai := OLD.consent_ai;
    ELSE
      NEW.consent_ai_changed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS client_settings_ki_einwilligung ON public.client_settings;
CREATE TRIGGER client_settings_ki_einwilligung
  BEFORE UPDATE ON public.client_settings
  FOR EACH ROW EXECUTE FUNCTION public.client_settings_ki_einwilligung();

-- Serverseitige Prüfung für Edge Functions: Coach oder Client mit KI-Einwilligung
CREATE OR REPLACE FUNCTION public.ki_erlaubt()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce((SELECT role = 'coach' FROM profiles WHERE id = auth.uid()), false)
      OR coalesce((SELECT consent_ai FROM client_settings WHERE user_id = auth.uid()), false)
$$;

REVOKE ALL ON FUNCTION public.ki_erlaubt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ki_erlaubt() TO authenticated;
