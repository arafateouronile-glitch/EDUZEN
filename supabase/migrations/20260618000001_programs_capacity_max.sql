-- Ajouter capacity_max au niveau du programme (en complément de capacity_min)
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS capacity_max INTEGER;

COMMENT ON COLUMN programs.capacity_max IS 'Nombre maximum de stagiaires par session';
