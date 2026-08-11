-- Catalogue des documents de conformité requis pour les formateurs, par organisation.
-- Même forme que diploma_types (20260308000001_compliance_diplomas.sql) : un
-- référentiel éditable par organisme plutôt qu'une liste figée dans le code, pour
-- pouvoir plus tard ajuster les exigences (ex: un organisme qui n'exige pas la RC Pro
-- pour des formateurs occasionnels).

CREATE TABLE IF NOT EXISTS public.teacher_required_document_types (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code             TEXT NOT NULL,
  label            TEXT NOT NULL,
  required_for     TEXT NOT NULL CHECK (required_for IN ('independant', 'salarie', 'both')),
  document_type    TEXT NOT NULL CHECK (document_type IN ('diploma', 'administrative', 'certification', 'identity', 'other')),
  renewal_months   INTEGER,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

COMMENT ON TABLE public.teacher_required_document_types IS 'Référentiel des documents de conformité requis pour les formateurs, par organisation et par statut (indépendant/salarié)';
COMMENT ON COLUMN public.teacher_required_document_types.renewal_months IS 'Périodicité de renouvellement en mois (ex: 3 pour un Kbis), NULL si pas de renouvellement périodique';

CREATE INDEX IF NOT EXISTS idx_teacher_required_document_types_org
  ON public.teacher_required_document_types(organization_id);

CREATE OR REPLACE FUNCTION update_teacher_required_document_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teacher_required_document_types_timestamp ON public.teacher_required_document_types;
CREATE TRIGGER update_teacher_required_document_types_timestamp
  BEFORE UPDATE ON public.teacher_required_document_types
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_required_document_types_updated_at();

ALTER TABLE public.teacher_required_document_types ENABLE ROW LEVEL SECURITY;

-- Lecture large : tout membre de l'organisation (y compris le formateur lui-même,
-- qui doit savoir ce qu'on lui demande) peut lire le catalogue.
DROP POLICY IF EXISTS "Org members can view required document types" ON public.teacher_required_document_types;
CREATE POLICY "Org members can view required document types"
  ON public.teacher_required_document_types FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Écriture réservée aux admins/secrétaires/super_admin.
DROP POLICY IF EXISTS "Admins can manage required document types" ON public.teacher_required_document_types;
CREATE POLICY "Admins can manage required document types"
  ON public.teacher_required_document_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'secretary')
      AND organization_id = teacher_required_document_types.organization_id
    )
  );

DROP POLICY IF EXISTS "Admins can update required document types" ON public.teacher_required_document_types;
CREATE POLICY "Admins can update required document types"
  ON public.teacher_required_document_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'secretary')
      AND organization_id = teacher_required_document_types.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'secretary')
      AND organization_id = teacher_required_document_types.organization_id
    )
  );

DROP POLICY IF EXISTS "Admins can delete required document types" ON public.teacher_required_document_types;
CREATE POLICY "Admins can delete required document types"
  ON public.teacher_required_document_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'secretary')
      AND organization_id = teacher_required_document_types.organization_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_required_document_types TO authenticated;

-- Rattache un document déposé à un type de document requis du catalogue
-- (nullable — n'affecte pas les documents existants ni le document_type générique
-- déjà utilisé par les pages actuelles).
ALTER TABLE public.teacher_documents
  ADD COLUMN IF NOT EXISTS required_document_type_id UUID
    REFERENCES public.teacher_required_document_types(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.teacher_documents.required_document_type_id IS 'Type de document requis (catalogue de conformité) que ce document couvre, le cas échéant';

CREATE INDEX IF NOT EXISTS idx_teacher_documents_required_type
  ON public.teacher_documents(required_document_type_id);

-- Seed des documents de conformité standards français pour un organisme donné.
-- Appelée à la demande (lazy) lors de la première visite du dashboard Formateurs.
CREATE OR REPLACE FUNCTION seed_default_teacher_document_types(org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO teacher_required_document_types
    (organization_id, code, label, required_for, document_type, renewal_months, sort_order)
  VALUES
    (org_id, 'kbis_urssaf',      'Kbis ou inscription URSSAF/RCS',              'independant', 'administrative', 3,   10),
    (org_id, 'urssaf_vigilance', 'Attestation de vigilance URSSAF',             'independant', 'administrative', 12,  20),
    (org_id, 'rc_pro',           'Assurance responsabilité civile professionnelle', 'independant', 'administrative', 12,  30),
    (org_id, 'rib',              'RIB',                                          'both',        'administrative', NULL, 40),
    (org_id, 'identity',         'Pièce d''identité (CNI/passeport)',            'both',        'identity',       NULL, 50),
    (org_id, 'diploma',          'Diplôme / certification métier',              'both',        'diploma',        NULL, 60),
    (org_id, 'contrat_travail',  'Contrat de travail',                          'salarie',     'administrative', NULL, 70),
    (org_id, 'visite_medicale',  'Visite médicale / habilitation',              'salarie',     'certification',  24,   80)
  ON CONFLICT (organization_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION seed_default_teacher_document_types IS 'Insère le catalogue standard français des documents de conformité formateurs pour une organisation (idempotent)';
