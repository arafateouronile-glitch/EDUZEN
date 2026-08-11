-- Ajoute le statut (indépendant / salarié) et le SIRET aux formateurs
-- Le statut détermine quels documents de conformité sont exigés (voir
-- teacher_required_document_types). Défaut 'salarie' pour ne pas signaler à tort
-- les fiches existantes comme non conformes tant que l'admin n'a pas renseigné
-- le statut réel de chaque formateur.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'salarie'
    CHECK (statut IN ('independant', 'salarie'));

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS siret VARCHAR(14);

COMMENT ON COLUMN public.teachers.statut IS 'Statut du formateur : independant ou salarie, détermine les documents de conformité requis';
COMMENT ON COLUMN public.teachers.siret IS 'Numéro SIRET du formateur indépendant (14 chiffres)';
