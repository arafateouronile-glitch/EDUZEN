-- Migration: Modules de session (nom + prix) pour devis et facturation
-- Date: 2026-01-21

CREATE TABLE IF NOT EXISTS public.session_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_modules_session ON public.session_modules(session_id);

COMMENT ON TABLE public.session_modules IS 'Modules (lignes) de la session pour devis: nom, prix, ordre';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_session_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_session_modules_updated_at ON public.session_modules;
CREATE TRIGGER update_session_modules_updated_at
  BEFORE UPDATE ON public.session_modules
  FOR EACH ROW EXECUTE FUNCTION update_session_modules_updated_at();

-- RLS
ALTER TABLE public.session_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_modules_select_org" ON public.session_modules;
CREATE POLICY "session_modules_select_org" ON public.session_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      INNER JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_modules.session_id
      AND f.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_modules_insert_org" ON public.session_modules;
CREATE POLICY "session_modules_insert_org" ON public.session_modules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      INNER JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_modules.session_id
      AND f.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_modules_update_org" ON public.session_modules;
CREATE POLICY "session_modules_update_org" ON public.session_modules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      INNER JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_modules.session_id
      AND f.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_modules_delete_org" ON public.session_modules;
CREATE POLICY "session_modules_delete_org" ON public.session_modules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      INNER JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_modules.session_id
      AND f.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );
