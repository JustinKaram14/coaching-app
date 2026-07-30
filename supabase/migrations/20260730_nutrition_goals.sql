-- Nutrition goal calculator fields
ALTER TABLE client_settings
  ADD COLUMN IF NOT EXISTS aktivitaetsniveau text DEFAULT 'maessig_aktiv',
  ADD COLUMN IF NOT EXISTS sport_ziel        text DEFAULT 'halten',
  ADD COLUMN IF NOT EXISTS ernaehrungs_typ   text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS intervall_fasten  text DEFAULT 'kein';
