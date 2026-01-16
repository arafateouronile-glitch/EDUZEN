-- Migration pour le module Qualiopi
-- Certification qualité pour les organismes de formation en France

-- 1. Table des indicateurs Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_code VARCHAR(50) NOT NULL, -- Ex: 1.1, 2.3, etc.
  indicator_name TEXT NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'conditions_reception', 'identification_objectifs', 'adaptation_parcours', 'adéquation_ressources', 'compétences_formateurs', 'inscription', 'evaluation', 'accessibilite', 'information_public', 'gouvernance'
  description TEXT,
  status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'compliant', 'non_compliant', 'needs_improvement')),
  compliance_rate DECIMAL(5, 2) DEFAULT 0 CHECK (compliance_rate >= 0 AND compliance_rate <= 100),
  last_evaluation_date TIMESTAMPTZ,
  next_evaluation_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, indicator_code)
);

-- 2. Table des preuves Qualiopi
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

-- 3. Table des actions correctives
CREATE TABLE IF NOT EXISTS public.qualiopi_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES public.qualiopi_indicators(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES public.users(id),
  due_date DATE,
  completion_date DATE,
  completion_notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des audits Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  audit_type VARCHAR(50) NOT NULL CHECK (audit_type IN ('internal', 'external', 'certification', 'surveillance')),
  audit_date DATE NOT NULL,
  auditor_name TEXT,
  auditor_organization TEXT,
  overall_score DECIMAL(5, 2) CHECK (overall_score >= 0 AND overall_score <= 100),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  report_url TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  certification_valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des résultats d'audit par indicateur
CREATE TABLE IF NOT EXISTS public.qualiopi_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.qualiopi_audits(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.qualiopi_indicators(id) ON DELETE CASCADE,
  score DECIMAL(5, 2) CHECK (score >= 0 AND score <= 100),
  status VARCHAR(50) CHECK (status IN ('compliant', 'non_compliant', 'needs_improvement')),
  findings TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des formations certifiées Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_certified_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  certification_number VARCHAR(100),
  certification_date DATE,
  validity_start_date DATE,
  validity_end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des rapports Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('compliance', 'audit', 'indicator', 'corrective_actions', 'annual')),
  period_start DATE,
  period_end DATE,
  overall_compliance_rate DECIMAL(5, 2) CHECK (overall_compliance_rate >= 0 AND overall_compliance_rate <= 100),
  indicators_summary JSONB DEFAULT '{}'::jsonb,
  corrective_actions_summary JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  generated_by UUID REFERENCES public.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_org ON public.qualiopi_indicators(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_code ON public.qualiopi_indicators(indicator_code);
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_status ON public.qualiopi_indicators(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_evidence_indicator ON public.qualiopi_evidence(indicator_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_evidence_status ON public.qualiopi_evidence(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_corrective_actions_org ON public.qualiopi_corrective_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_corrective_actions_status ON public.qualiopi_corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_audits_org ON public.qualiopi_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_audits_type ON public.qualiopi_audits(audit_type);
CREATE INDEX IF NOT EXISTS idx_qualiopi_reports_org ON public.qualiopi_reports(organization_id);

-- Fonction pour calculer le taux de conformité global
CREATE OR REPLACE FUNCTION calculate_qualiopi_compliance_rate(org_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
  total_indicators INTEGER;
  compliant_indicators INTEGER;
  rate DECIMAL(5, 2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'compliant')
  INTO total_indicators, compliant_indicators
  FROM public.qualiopi_indicators
  WHERE organization_id = org_id;

  IF total_indicators = 0 THEN
    RETURN 0;
  END IF;

  rate := (compliant_indicators::DECIMAL / total_indicators::DECIMAL) * 100;
  RETURN ROUND(rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_qualiopi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_qualiopi_indicators_updated_at
  BEFORE UPDATE ON public.qualiopi_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

CREATE TRIGGER update_qualiopi_evidence_updated_at
  BEFORE UPDATE ON public.qualiopi_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

CREATE TRIGGER update_qualiopi_corrective_actions_updated_at
  BEFORE UPDATE ON public.qualiopi_corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

CREATE TRIGGER update_qualiopi_audits_updated_at
  BEFORE UPDATE ON public.qualiopi_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

-- RLS Policies
ALTER TABLE public.qualiopi_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_certified_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_reports ENABLE ROW LEVEL SECURITY;

-- Policies pour qualiopi_indicators
CREATE POLICY "Users can view indicators of their organization"
  ON public.qualiopi_indicators FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage indicators"
  ON public.qualiopi_indicators FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Policies similaires pour les autres tables
CREATE POLICY "Users can view evidence of their organization"
  ON public.qualiopi_evidence FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage evidence"
  ON public.qualiopi_evidence FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Commentaires
COMMENT ON TABLE public.qualiopi_indicators IS 'Indicateurs Qualiopi pour la certification qualité';
COMMENT ON TABLE public.qualiopi_evidence IS 'Preuves et documents justificatifs pour les indicateurs Qualiopi';
COMMENT ON TABLE public.qualiopi_corrective_actions IS 'Actions correctives suite aux audits Qualiopi';
COMMENT ON TABLE public.qualiopi_audits IS 'Audits Qualiopi (internes, externes, certification)';
COMMENT ON TABLE public.qualiopi_audit_results IS 'Résultats détaillés par indicateur pour chaque audit';
COMMENT ON TABLE public.qualiopi_certified_trainings IS 'Formations certifiées Qualiopi';
COMMENT ON TABLE public.qualiopi_reports IS 'Rapports Qualiopi générés automatiquement';


-- Certification qualité pour les organismes de formation en France

-- 1. Table des indicateurs Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_code VARCHAR(50) NOT NULL, -- Ex: 1.1, 2.3, etc.
  indicator_name TEXT NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'conditions_reception', 'identification_objectifs', 'adaptation_parcours', 'adéquation_ressources', 'compétences_formateurs', 'inscription', 'evaluation', 'accessibilite', 'information_public', 'gouvernance'
  description TEXT,
  status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'compliant', 'non_compliant', 'needs_improvement')),
  compliance_rate DECIMAL(5, 2) DEFAULT 0 CHECK (compliance_rate >= 0 AND compliance_rate <= 100),
  last_evaluation_date TIMESTAMPTZ,
  next_evaluation_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, indicator_code)
);

-- 2. Table des preuves Qualiopi
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

-- 3. Table des actions correctives
CREATE TABLE IF NOT EXISTS public.qualiopi_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES public.qualiopi_indicators(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES public.users(id),
  due_date DATE,
  completion_date DATE,
  completion_notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des audits Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  audit_type VARCHAR(50) NOT NULL CHECK (audit_type IN ('internal', 'external', 'certification', 'surveillance')),
  audit_date DATE NOT NULL,
  auditor_name TEXT,
  auditor_organization TEXT,
  overall_score DECIMAL(5, 2) CHECK (overall_score >= 0 AND overall_score <= 100),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  report_url TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  certification_valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des résultats d'audit par indicateur
CREATE TABLE IF NOT EXISTS public.qualiopi_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.qualiopi_audits(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.qualiopi_indicators(id) ON DELETE CASCADE,
  score DECIMAL(5, 2) CHECK (score >= 0 AND score <= 100),
  status VARCHAR(50) CHECK (status IN ('compliant', 'non_compliant', 'needs_improvement')),
  findings TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des formations certifiées Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_certified_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  certification_number VARCHAR(100),
  certification_date DATE,
  validity_start_date DATE,
  validity_end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des rapports Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('compliance', 'audit', 'indicator', 'corrective_actions', 'annual')),
  period_start DATE,
  period_end DATE,
  overall_compliance_rate DECIMAL(5, 2) CHECK (overall_compliance_rate >= 0 AND overall_compliance_rate <= 100),
  indicators_summary JSONB DEFAULT '{}'::jsonb,
  corrective_actions_summary JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  generated_by UUID REFERENCES public.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_org ON public.qualiopi_indicators(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_code ON public.qualiopi_indicators(indicator_code);
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_status ON public.qualiopi_indicators(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_evidence_indicator ON public.qualiopi_evidence(indicator_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_evidence_status ON public.qualiopi_evidence(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_corrective_actions_org ON public.qualiopi_corrective_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_corrective_actions_status ON public.qualiopi_corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_audits_org ON public.qualiopi_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_audits_type ON public.qualiopi_audits(audit_type);
CREATE INDEX IF NOT EXISTS idx_qualiopi_reports_org ON public.qualiopi_reports(organization_id);

-- Fonction pour calculer le taux de conformité global
CREATE OR REPLACE FUNCTION calculate_qualiopi_compliance_rate(org_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
  total_indicators INTEGER;
  compliant_indicators INTEGER;
  rate DECIMAL(5, 2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'compliant')
  INTO total_indicators, compliant_indicators
  FROM public.qualiopi_indicators
  WHERE organization_id = org_id;

  IF total_indicators = 0 THEN
    RETURN 0;
  END IF;

  rate := (compliant_indicators::DECIMAL / total_indicators::DECIMAL) * 100;
  RETURN ROUND(rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_qualiopi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_qualiopi_indicators_updated_at
  BEFORE UPDATE ON public.qualiopi_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

CREATE TRIGGER update_qualiopi_evidence_updated_at
  BEFORE UPDATE ON public.qualiopi_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

CREATE TRIGGER update_qualiopi_corrective_actions_updated_at
  BEFORE UPDATE ON public.qualiopi_corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

CREATE TRIGGER update_qualiopi_audits_updated_at
  BEFORE UPDATE ON public.qualiopi_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

-- RLS Policies
ALTER TABLE public.qualiopi_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_certified_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_reports ENABLE ROW LEVEL SECURITY;

-- Policies pour qualiopi_indicators
CREATE POLICY "Users can view indicators of their organization"
  ON public.qualiopi_indicators FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage indicators"
  ON public.qualiopi_indicators FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Policies similaires pour les autres tables
CREATE POLICY "Users can view evidence of their organization"
  ON public.qualiopi_evidence FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage evidence"
  ON public.qualiopi_evidence FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Commentaires
COMMENT ON TABLE public.qualiopi_indicators IS 'Indicateurs Qualiopi pour la certification qualité';
COMMENT ON TABLE public.qualiopi_evidence IS 'Preuves et documents justificatifs pour les indicateurs Qualiopi';
COMMENT ON TABLE public.qualiopi_corrective_actions IS 'Actions correctives suite aux audits Qualiopi';
COMMENT ON TABLE public.qualiopi_audits IS 'Audits Qualiopi (internes, externes, certification)';
COMMENT ON TABLE public.qualiopi_audit_results IS 'Résultats détaillés par indicateur pour chaque audit';
COMMENT ON TABLE public.qualiopi_certified_trainings IS 'Formations certifiées Qualiopi';
COMMENT ON TABLE public.qualiopi_reports IS 'Rapports Qualiopi générés automatiquement';


-- Certification qualité pour les organismes de formation en France

-- 1. Table des indicateurs Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_code VARCHAR(50) NOT NULL, -- Ex: 1.1, 2.3, etc.
  indicator_name TEXT NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'conditions_reception', 'identification_objectifs', 'adaptation_parcours', 'adéquation_ressources', 'compétences_formateurs', 'inscription', 'evaluation', 'accessibilite', 'information_public', 'gouvernance'
  description TEXT,
  status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'compliant', 'non_compliant', 'needs_improvement')),
  compliance_rate DECIMAL(5, 2) DEFAULT 0 CHECK (compliance_rate >= 0 AND compliance_rate <= 100),
  last_evaluation_date TIMESTAMPTZ,
  next_evaluation_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, indicator_code)
);

-- 2. Table des preuves Qualiopi
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

-- 3. Table des actions correctives
CREATE TABLE IF NOT EXISTS public.qualiopi_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES public.qualiopi_indicators(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES public.users(id),
  due_date DATE,
  completion_date DATE,
  completion_notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des audits Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  audit_type VARCHAR(50) NOT NULL CHECK (audit_type IN ('internal', 'external', 'certification', 'surveillance')),
  audit_date DATE NOT NULL,
  auditor_name TEXT,
  auditor_organization TEXT,
  overall_score DECIMAL(5, 2) CHECK (overall_score >= 0 AND overall_score <= 100),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  report_url TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  certification_valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des résultats d'audit par indicateur
CREATE TABLE IF NOT EXISTS public.qualiopi_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.qualiopi_audits(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.qualiopi_indicators(id) ON DELETE CASCADE,
  score DECIMAL(5, 2) CHECK (score >= 0 AND score <= 100),
  status VARCHAR(50) CHECK (status IN ('compliant', 'non_compliant', 'needs_improvement')),
  findings TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des formations certifiées Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_certified_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  certification_number VARCHAR(100),
  certification_date DATE,
  validity_start_date DATE,
  validity_end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des rapports Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('compliance', 'audit', 'indicator', 'corrective_actions', 'annual')),
  period_start DATE,
  period_end DATE,
  overall_compliance_rate DECIMAL(5, 2) CHECK (overall_compliance_rate >= 0 AND overall_compliance_rate <= 100),
  indicators_summary JSONB DEFAULT '{}'::jsonb,
  corrective_actions_summary JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  generated_by UUID REFERENCES public.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_org ON public.qualiopi_indicators(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_code ON public.qualiopi_indicators(indicator_code);
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_status ON public.qualiopi_indicators(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_evidence_indicator ON public.qualiopi_evidence(indicator_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_evidence_status ON public.qualiopi_evidence(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_corrective_actions_org ON public.qualiopi_corrective_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_corrective_actions_status ON public.qualiopi_corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_audits_org ON public.qualiopi_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_audits_type ON public.qualiopi_audits(audit_type);
CREATE INDEX IF NOT EXISTS idx_qualiopi_reports_org ON public.qualiopi_reports(organization_id);

-- Fonction pour calculer le taux de conformité global
CREATE OR REPLACE FUNCTION calculate_qualiopi_compliance_rate(org_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
  total_indicators INTEGER;
  compliant_indicators INTEGER;
  rate DECIMAL(5, 2);
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'compliant')
  INTO total_indicators, compliant_indicators
  FROM public.qualiopi_indicators
  WHERE organization_id = org_id;

  IF total_indicators = 0 THEN
    RETURN 0;
  END IF;

  rate := (compliant_indicators::DECIMAL / total_indicators::DECIMAL) * 100;
  RETURN ROUND(rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_qualiopi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_qualiopi_indicators_updated_at
  BEFORE UPDATE ON public.qualiopi_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

CREATE TRIGGER update_qualiopi_evidence_updated_at
  BEFORE UPDATE ON public.qualiopi_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

CREATE TRIGGER update_qualiopi_corrective_actions_updated_at
  BEFORE UPDATE ON public.qualiopi_corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

CREATE TRIGGER update_qualiopi_audits_updated_at
  BEFORE UPDATE ON public.qualiopi_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

-- RLS Policies
ALTER TABLE public.qualiopi_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_certified_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_reports ENABLE ROW LEVEL SECURITY;

-- Policies pour qualiopi_indicators
CREATE POLICY "Users can view indicators of their organization"
  ON public.qualiopi_indicators FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage indicators"
  ON public.qualiopi_indicators FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Policies similaires pour les autres tables
CREATE POLICY "Users can view evidence of their organization"
  ON public.qualiopi_evidence FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage evidence"
  ON public.qualiopi_evidence FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Commentaires
COMMENT ON TABLE public.qualiopi_indicators IS 'Indicateurs Qualiopi pour la certification qualité';
COMMENT ON TABLE public.qualiopi_evidence IS 'Preuves et documents justificatifs pour les indicateurs Qualiopi';
COMMENT ON TABLE public.qualiopi_corrective_actions IS 'Actions correctives suite aux audits Qualiopi';
COMMENT ON TABLE public.qualiopi_audits IS 'Audits Qualiopi (internes, externes, certification)';
COMMENT ON TABLE public.qualiopi_audit_results IS 'Résultats détaillés par indicateur pour chaque audit';
COMMENT ON TABLE public.qualiopi_certified_trainings IS 'Formations certifiées Qualiopi';
COMMENT ON TABLE public.qualiopi_reports IS 'Rapports Qualiopi générés automatiquement';


