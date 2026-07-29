-- Client controls whether coach can see body photos (default: no)
ALTER TABLE client_settings ADD COLUMN IF NOT EXISTS coach_foto_freigabe boolean DEFAULT false;
