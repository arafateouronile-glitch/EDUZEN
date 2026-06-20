-- Ajout des champs tarif journalier et jours d'intervention sur session_teachers
ALTER TABLE public.session_teachers
  ADD COLUMN IF NOT EXISTS intervention_days DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2);

COMMENT ON COLUMN public.session_teachers.intervention_days IS 'Nombre de jours d''intervention du formateur sur la session (peut être décimal pour demi-journées)';
COMMENT ON COLUMN public.session_teachers.daily_rate IS 'Tarif journalier HT du formateur en euros';
