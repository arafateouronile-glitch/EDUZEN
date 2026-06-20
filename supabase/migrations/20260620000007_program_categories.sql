-- Catégories de programmes/formations par organisation
-- Partagées entre programs et formations (même champ category TEXT)

CREATE TABLE IF NOT EXISTS public.program_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_program_categories_name_org
  ON public.program_categories (organization_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_program_categories_org_active
  ON public.program_categories (organization_id, is_active);

CREATE TRIGGER program_categories_updated_at
  BEFORE UPDATE ON public.program_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.program_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "program_categories_select" ON public.program_categories
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "program_categories_insert" ON public.program_categories
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "program_categories_update" ON public.program_categories
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "program_categories_delete" ON public.program_categories
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

COMMENT ON TABLE public.program_categories IS 'Catégories de programmes et formations, configurables par organisation';
