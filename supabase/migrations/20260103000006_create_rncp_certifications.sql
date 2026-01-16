-- =====================================================
-- EDUZEN - Gestion Certifications RNCP/RS
-- =====================================================
-- Description: Tables pour la gestion des certifications RNCP/RS, jurys, PV et attestations
-- Date: 2026-01-03
-- =====================================================

-- Fonction pour mettre à jour automatiquement updated_at (si elle n'existe pas déjà)
CREATE OR REPLACE FUNCTION update_cpf_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Table des certifications RNCP/RS
CREATE TABLE IF NOT EXISTS public.rncp_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  
  -- Identification de la certification
  certification_type VARCHAR(50) NOT NULL CHECK (certification_type IN ('RNCP', 'RS', 'other')),
  rncp_code VARCHAR(50), -- Code RNCP (ex: RNCP12345)
  rs_code VARCHAR(50), -- Code RS si applicable
  title TEXT NOT NULL,
  level VARCHAR(50), -- Niveau de certification (ex: Niveau 3, 4, 5, 6, 7)
  
  -- Dates
  registration_date DATE, -- Date d'enregistrement
  validity_start_date DATE, -- Date de début de validité
  validity_end_date DATE, -- Date de fin de validité
  
  -- Informations supplémentaires
  description TEXT,
  skills_accredited TEXT, -- Compétences certifiées
  sector VARCHAR(255), -- Secteur d'activité
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.rncp_certifications IS 'Certifications RNCP/RS des formations';
COMMENT ON COLUMN public.rncp_certifications.certification_type IS 'Type: RNCP (Répertoire National), RS (Répertoire Spécifique), other';

-- 2. Table des jurys de certification
CREATE TABLE IF NOT EXISTS public.certification_juries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES public.rncp_certifications(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  
  -- Informations du jury
  jury_name VARCHAR(255) NOT NULL,
  jury_date DATE NOT NULL,
  jury_time TIME,
  location TEXT,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  
  -- Composition du jury
  president_id UUID REFERENCES public.users(id), -- Président du jury
  members UUID[], -- IDs des membres du jury (users)
  external_members TEXT[], -- Membres externes (noms et fonctions)
  
  -- Statut
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.certification_juries IS 'Jurys de certification RNCP/RS';

-- 3. Table des candidats au jury (étudiants évalués)
CREATE TABLE IF NOT EXISTS public.jury_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_id UUID NOT NULL REFERENCES public.certification_juries(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  
  -- Résultat du jury
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'admitted', 'rejected', 'deferred')),
  decision_date DATE,
  decision_notes TEXT, -- Notes de décision
  
  -- Notes et évaluations
  final_score DECIMAL(5, 2), -- Note finale
  evaluation_details JSONB DEFAULT '{}'::jsonb, -- Détails de l'évaluation
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.jury_candidates IS 'Candidats évalués par un jury de certification';

-- 4. Table des procès-verbaux (PV) de jury
CREATE TABLE IF NOT EXISTS public.jury_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_id UUID NOT NULL REFERENCES public.certification_juries(id) ON DELETE CASCADE,
  
  -- Contenu du PV
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL, -- Contenu détaillé du PV
  decisions JSONB DEFAULT '[]'::jsonb, -- Décisions prises (format structuré)
  
  -- Fichier
  file_url TEXT, -- URL du fichier PDF du PV
  file_hash VARCHAR(64), -- Hash pour vérification
  
  -- Signatures
  signed_by UUID REFERENCES public.users(id), -- Signé par
  signed_at TIMESTAMPTZ, -- Date de signature
  
  -- Statut
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.jury_minutes IS 'Procès-verbaux (PV) des jurys de certification';

-- 5. Table des attestations de certification
CREATE TABLE IF NOT EXISTS public.certification_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES public.rncp_certifications(id) ON DELETE CASCADE,
  jury_id UUID REFERENCES public.certification_juries(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  
  -- Informations de l'attestation
  certificate_number VARCHAR(100) UNIQUE, -- Numéro d'attestation
  issue_date DATE NOT NULL,
  certification_level VARCHAR(50), -- Niveau certifié
  rncp_code VARCHAR(50), -- Code RNCP associé
  
  -- Fichier
  file_url TEXT, -- URL du fichier PDF de l'attestation
  file_hash VARCHAR(64), -- Hash pour vérification
  
  -- Statut
  status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'delivered', 'archived', 'revoked')),
  delivered_at TIMESTAMPTZ, -- Date de remise
  delivered_to VARCHAR(255), -- Personne qui a reçu l'attestation
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  issued_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.certification_certificates IS 'Attestations de certification RNCP/RS délivrées aux étudiants';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_rncp_certifications_org ON public.rncp_certifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_rncp_certifications_code ON public.rncp_certifications(rncp_code);
CREATE INDEX IF NOT EXISTS idx_rncp_certifications_program ON public.rncp_certifications(program_id);
CREATE INDEX IF NOT EXISTS idx_rncp_certifications_active ON public.rncp_certifications(is_active);

-- Contrainte unique partielle pour rncp_code (uniquement si rncp_code n'est pas NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rncp_certifications_org_code_unique 
  ON public.rncp_certifications(organization_id, rncp_code) 
  WHERE rncp_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_certification_juries_org ON public.certification_juries(organization_id);
CREATE INDEX IF NOT EXISTS idx_certification_juries_cert ON public.certification_juries(certification_id);
CREATE INDEX IF NOT EXISTS idx_certification_juries_date ON public.certification_juries(jury_date);
CREATE INDEX IF NOT EXISTS idx_certification_juries_status ON public.certification_juries(status);

CREATE INDEX IF NOT EXISTS idx_jury_candidates_jury ON public.jury_candidates(jury_id);
CREATE INDEX IF NOT EXISTS idx_jury_candidates_student ON public.jury_candidates(student_id);
CREATE INDEX IF NOT EXISTS idx_jury_candidates_status ON public.jury_candidates(status);

CREATE INDEX IF NOT EXISTS idx_jury_minutes_jury ON public.jury_minutes(jury_id);
CREATE INDEX IF NOT EXISTS idx_jury_minutes_status ON public.jury_minutes(status);

CREATE INDEX IF NOT EXISTS idx_certification_certificates_org ON public.certification_certificates(organization_id);
CREATE INDEX IF NOT EXISTS idx_certification_certificates_cert ON public.certification_certificates(certification_id);
CREATE INDEX IF NOT EXISTS idx_certification_certificates_student ON public.certification_certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certification_certificates_number ON public.certification_certificates(certificate_number);

-- Triggers pour updated_at
CREATE TRIGGER update_rncp_certifications_updated_at
  BEFORE UPDATE ON public.rncp_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_certification_juries_updated_at
  BEFORE UPDATE ON public.certification_juries
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_jury_candidates_updated_at
  BEFORE UPDATE ON public.jury_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_jury_minutes_updated_at
  BEFORE UPDATE ON public.jury_minutes
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_certification_certificates_updated_at
  BEFORE UPDATE ON public.certification_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

-- RLS Policies
ALTER TABLE public.rncp_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_juries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_certificates ENABLE ROW LEVEL SECURITY;

-- Policies pour rncp_certifications
CREATE POLICY "Users can view certifications of their organization"
  ON public.rncp_certifications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage certifications"
  ON public.rncp_certifications FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policies pour certification_juries
CREATE POLICY "Users can view juries of their organization"
  ON public.certification_juries FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage juries"
  ON public.certification_juries FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'formateur')
    )
  );

-- Policies pour jury_candidates
CREATE POLICY "Users can view jury candidates of their organization"
  ON public.jury_candidates FOR SELECT
  USING (
    jury_id IN (
      SELECT id FROM public.certification_juries
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage jury candidates"
  ON public.jury_candidates FOR ALL
  USING (
    jury_id IN (
      SELECT id FROM public.certification_juries
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'formateur')
    )
  );

-- Policies pour jury_minutes
CREATE POLICY "Users can view minutes of their organization"
  ON public.jury_minutes FOR SELECT
  USING (
    jury_id IN (
      SELECT id FROM public.certification_juries
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage minutes"
  ON public.jury_minutes FOR ALL
  USING (
    jury_id IN (
      SELECT id FROM public.certification_juries
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policies pour certification_certificates
CREATE POLICY "Users can view certificates of their organization"
  ON public.certification_certificates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own certificates"
  ON public.certification_certificates FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students
      WHERE id IN (
        SELECT id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage certificates"
  ON public.certification_certificates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'secretary')
    )
  );

