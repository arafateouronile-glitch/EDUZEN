-- Migration pour ajouter le type d'organisation (OF, École, ou les deux)
-- Permet d'adapter le vocabulaire et les fonctionnalités selon le type

-- 1. Ajouter la colonne organization_type
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'school' 
CHECK (organization_type IN ('training_organization', 'school', 'both'));

-- 2. Mettre à jour les organisations existantes (par défaut: school)
UPDATE public.organizations 
SET organization_type = 'school' 
WHERE organization_type IS NULL;

-- 3. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_organizations_type 
ON public.organizations(organization_type);

-- 4. Commentaire sur la colonne
COMMENT ON COLUMN public.organizations.organization_type IS 
'Type d''organisation: training_organization (Organisme de Formation), school (Établissement scolaire), both (Les deux)';
