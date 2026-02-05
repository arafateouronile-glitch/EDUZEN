-- Migration de secours : créer qualiopi_evidence si elle n'existe pas
-- (certains projets n'ont pas exécuté 20241203000003_create_qualiopi_module.sql)

CREATE TABLE IF NOT EXISTS public.qualiopi_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.qualiopi_indicators(id) ON DELETE CASCADE,
  evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN ('document', 'photo', 'video', 'testimony', 'data', 'report', 'certificate', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type VARCHAR(50),
  file_size INTEGER,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.users(id),
  validity_start_date DATE,
  validity_end_date DATE,
  is_valid BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewer_id UUID REFERENCES public.users(id),
  review_date TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qualiopi_evidence_indicator ON public.qualiopi_evidence(indicator_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_evidence_status ON public.qualiopi_evidence(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_evidence_org ON public.qualiopi_evidence(organization_id);

ALTER TABLE public.qualiopi_evidence ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (éviter erreur si déjà présentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'qualiopi_evidence' AND policyname = 'Users can view evidence of their organization'
  ) THEN
    CREATE POLICY "Users can view evidence of their organization"
      ON public.qualiopi_evidence FOR SELECT
      USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'qualiopi_evidence' AND policyname = 'Users can insert evidence of their organization'
  ) THEN
    CREATE POLICY "Users can insert evidence of their organization"
      ON public.qualiopi_evidence FOR INSERT
      WITH CHECK (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'qualiopi_evidence' AND policyname = 'Users can update evidence of their organization'
  ) THEN
    CREATE POLICY "Users can update evidence of their organization"
      ON public.qualiopi_evidence FOR UPDATE
      USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'qualiopi_evidence' AND policyname = 'Admins can manage evidence'
  ) THEN
    CREATE POLICY "Admins can manage evidence"
      ON public.qualiopi_evidence FOR ALL
      USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          WHERE ur.user_id = auth.uid() AND r.name IN ('super_admin', 'admin')
        )
      );
  END IF;
END $$;

-- Trigger updated_at si la fonction existe
CREATE OR REPLACE FUNCTION update_qualiopi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_qualiopi_evidence_updated_at ON public.qualiopi_evidence;
CREATE TRIGGER update_qualiopi_evidence_updated_at
  BEFORE UPDATE ON public.qualiopi_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

COMMENT ON TABLE public.qualiopi_evidence IS 'Preuves et documents justificatifs pour les indicateurs Qualiopi';
