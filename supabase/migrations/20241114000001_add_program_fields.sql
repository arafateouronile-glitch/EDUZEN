-- Migration pour ajouter les nouveaux champs au tableau programs
-- Support pour catalogue en ligne, CPF, objectifs pédagogiques, etc.

-- Ajouter les nouveaux champs
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS program_version TEXT,
  ADD COLUMN IF NOT EXISTS version_date DATE,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS duration_unit TEXT CHECK (duration_unit IN ('hours', 'days')),
  ADD COLUMN IF NOT EXISTS published_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS eligible_cpf BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cpf_code TEXT,
  ADD COLUMN IF NOT EXISTS modalities TEXT,
  ADD COLUMN IF NOT EXISTS training_action_type TEXT,
  ADD COLUMN IF NOT EXISTS pedagogical_objectives TEXT,
  ADD COLUMN IF NOT EXISTS learner_profile TEXT,
  ADD COLUMN IF NOT EXISTS training_content TEXT,
  ADD COLUMN IF NOT EXISTS execution_follow_up TEXT,
  ADD COLUMN IF NOT EXISTS certification_modalities TEXT,
  ADD COLUMN IF NOT EXISTS quality TEXT,
  ADD COLUMN IF NOT EXISTS accounting_product_config TEXT,
  ADD COLUMN IF NOT EXISTS edof_export_fields JSONB,
  ADD COLUMN IF NOT EXISTS competence_domains TEXT;

-- Commentaires pour documentation
COMMENT ON COLUMN public.programs.subtitle IS 'Sous-titre du programme';
COMMENT ON COLUMN public.programs.photo_url IS 'URL de la photo du programme';
COMMENT ON COLUMN public.programs.category IS 'Catégorie du programme';
COMMENT ON COLUMN public.programs.program_version IS 'Version du programme';
COMMENT ON COLUMN public.programs.version_date IS 'Date de la version';
COMMENT ON COLUMN public.programs.duration_days IS 'Durée en jours';
COMMENT ON COLUMN public.programs.duration_unit IS 'Unité de durée (hours ou days)';
COMMENT ON COLUMN public.programs.published_online IS 'Publier sur le catalogue en ligne';
COMMENT ON COLUMN public.programs.eligible_cpf IS 'Eligible CPF (Compte Personnel Formation)';
COMMENT ON COLUMN public.programs.cpf_code IS 'Code CPF';
COMMENT ON COLUMN public.programs.modalities IS 'Modalités';
COMMENT ON COLUMN public.programs.training_action_type IS 'Type d''action de formation';
COMMENT ON COLUMN public.programs.pedagogical_objectives IS 'Objectifs pédagogiques';
COMMENT ON COLUMN public.programs.learner_profile IS 'Profil des apprenants';
COMMENT ON COLUMN public.programs.training_content IS 'Contenu de la formation (progression pédagogique)';
COMMENT ON COLUMN public.programs.execution_follow_up IS 'Suivi de l''exécution';
COMMENT ON COLUMN public.programs.certification_modalities IS 'Modalités de certification';
COMMENT ON COLUMN public.programs.quality IS 'Qualité';
COMMENT ON COLUMN public.programs.accounting_product_config IS 'Configuration comptable du produit';
COMMENT ON COLUMN public.programs.edof_export_fields IS 'Champs pour l''export EDOF';
COMMENT ON COLUMN public.programs.competence_domains IS 'Domaines de compétences';

























