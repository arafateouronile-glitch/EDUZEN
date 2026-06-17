-- Ajouter les champs détaillés de modalité aux programmes
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS lieu              TEXT,
  ADD COLUMN IF NOT EXISTS access_delay_days INTEGER,
  ADD COLUMN IF NOT EXISTS accessibility_info TEXT,
  ADD COLUMN IF NOT EXISTS edof_hours        INTEGER,
  ADD COLUMN IF NOT EXISTS capacity_min      INTEGER;

COMMENT ON COLUMN programs.lieu               IS 'Lieu de formation (ex: INSSI FORMATION)';
COMMENT ON COLUMN programs.access_delay_days  IS 'Délai d''accès à la formation en jours';
COMMENT ON COLUMN programs.accessibility_info IS 'Informations accessibilité / référent handicap';
COMMENT ON COLUMN programs.edof_hours         IS 'Nombre d''heures déclarées sur EDOF (max 250)';
COMMENT ON COLUMN programs.capacity_min       IS 'Nombre minimum de stagiaires requis';
