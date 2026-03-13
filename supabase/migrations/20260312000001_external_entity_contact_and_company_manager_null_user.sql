-- Contact principal sur les entités (affiché en tête de l'espace entreprise)
-- et autorisation d'un company_manager sans user_id (contact affiché uniquement)

-- 1. Colonnes contact sur external_entities
ALTER TABLE public.external_entities
  ADD COLUMN IF NOT EXISTS contact_first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contact_job_title VARCHAR(100);

COMMENT ON COLUMN public.external_entities.contact_first_name IS 'Prénom du contact principal (affiché dans l''espace entreprise)';
COMMENT ON COLUMN public.external_entities.contact_last_name IS 'Nom du contact principal';
COMMENT ON COLUMN public.external_entities.contact_email IS 'Email du contact principal';
COMMENT ON COLUMN public.external_entities.contact_phone IS 'Téléphone du contact principal';
COMMENT ON COLUMN public.external_entities.contact_job_title IS 'Fonction / poste du contact principal';

-- 2. Rendre user_id nullable sur company_managers pour permettre un "contact" sans compte
-- (affiché en en-tête de l'espace entreprise jusqu'à création de compte / invitation)
ALTER TABLE public.company_managers
  ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.company_managers.user_id IS 'Utilisateur lié (NULL = contact affiché uniquement, sans connexion)';
