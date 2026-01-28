-- =====================================================
-- EDUZEN Workflow en Cascade (Sequential Signing)
-- =====================================================
-- Convention = signature stagiaire puis directeur.
-- Relais automatique : après chaque signature, mail au suivant.
-- Date: 2026-01-25
-- =====================================================

-- 1. Table signing_processes
CREATE TABLE IF NOT EXISTS public.signing_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partially_signed', 'completed')),
  current_index int NOT NULL DEFAULT 0,

  -- PDF courant (original ou intermédiaire) pour le prochain signataire
  intermediate_pdf_path text,
  intermediate_pdf_url text,

  title text,
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  updated_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_signing_processes_org ON public.signing_processes(organization_id);
CREATE INDEX IF NOT EXISTS idx_signing_processes_document ON public.signing_processes(document_id);
CREATE INDEX IF NOT EXISTS idx_signing_processes_status ON public.signing_processes(status);

-- 2. Table signatories
CREATE TABLE IF NOT EXISTS public.signatories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.signing_processes(id) ON DELETE CASCADE,

  email text NOT NULL,
  name text NOT NULL,
  order_index int NOT NULL,

  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  signed_at timestamptz,
  signature_data text,
  mail_sent_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_signatories_process ON public.signatories(process_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_signatories_process_order ON public.signatories(process_id, order_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_signatories_token ON public.signatories(token);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_signing_processes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (now() AT TIME ZONE 'UTC');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signing_processes_updated_at ON public.signing_processes;
CREATE TRIGGER trg_signing_processes_updated_at
  BEFORE UPDATE ON public.signing_processes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_signing_processes_updated_at();

-- RLS
ALTER TABLE public.signing_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signing_processes_select_org" ON public.signing_processes;
CREATE POLICY "signing_processes_select_org"
  ON public.signing_processes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.organization_id = signing_processes.organization_id
        AND u.role IN ('admin', 'secretary', 'teacher', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "signing_processes_insert_org" ON public.signing_processes;
CREATE POLICY "signing_processes_insert_org"
  ON public.signing_processes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.organization_id = signing_processes.organization_id
        AND u.role IN ('admin', 'secretary', 'teacher')
    )
  );

DROP POLICY IF EXISTS "signing_processes_update_org" ON public.signing_processes;
CREATE POLICY "signing_processes_update_org"
  ON public.signing_processes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.organization_id = signing_processes.organization_id
        AND u.role IN ('admin', 'secretary', 'teacher')
    )
  );

DROP POLICY IF EXISTS "signatories_select_org" ON public.signatories;
CREATE POLICY "signatories_select_org"
  ON public.signatories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.signing_processes p
      JOIN public.users u ON u.organization_id = p.organization_id AND u.id = auth.uid()
      WHERE p.id = signatories.process_id
        AND u.role IN ('admin', 'secretary', 'teacher', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "signatories_insert_org" ON public.signatories;
CREATE POLICY "signatories_insert_org"
  ON public.signatories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.signing_processes p
      JOIN public.users u ON u.organization_id = p.organization_id AND u.id = auth.uid()
      WHERE p.id = signatories.process_id
        AND u.role IN ('admin', 'secretary', 'teacher')
    )
  );

DROP POLICY IF EXISTS "signatories_update_org" ON public.signatories;
CREATE POLICY "signatories_update_org"
  ON public.signatories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.signing_processes p
      JOIN public.users u ON u.organization_id = p.organization_id AND u.id = auth.uid()
      WHERE p.id = signatories.process_id
        AND u.role IN ('admin', 'secretary', 'teacher')
    )
  );

COMMENT ON TABLE public.signing_processes IS 'Processus de signature en cascade (stagiaire puis directeur).';
COMMENT ON TABLE public.signatories IS 'Signataires d''un processus, ordonnés par order_index.';
COMMENT ON COLUMN public.signatories.mail_sent_at IS 'Date d''envoi du mail avec lien de signature.';

-- Étendre digital_evidence pour request_type = 'process'
ALTER TABLE public.digital_evidence DROP CONSTRAINT IF EXISTS digital_evidence_request_type_check;
ALTER TABLE public.digital_evidence ADD CONSTRAINT digital_evidence_request_type_check
  CHECK (request_type IN ('signature', 'attendance', 'process'));
