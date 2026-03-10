-- Lier les companies (portail entreprise) aux external_entities (dashboard entités)
-- pour permettre d'ouvrir le portail dans le contexte d'une entité précise.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_entity_id UUID REFERENCES public.external_entities(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_external_entity_id
  ON public.companies(external_entity_id) WHERE external_entity_id IS NOT NULL;

COMMENT ON COLUMN public.companies.external_entity_id IS 'Entité dashboard (external_entities) correspondante pour accès portail par lien depuis la page entité';
