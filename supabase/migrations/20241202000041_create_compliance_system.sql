-- Migration pour le système de conformité et sécurité (ISO 27001, SOC 2)

-- 1. Table pour les politiques de sécurité
CREATE TABLE IF NOT EXISTS public.security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- Code unique de la politique (ex: "POL-001")
  category TEXT NOT NULL, -- 'access_control', 'data_protection', 'incident_response', 'business_continuity', etc.
  -- Contenu
  description TEXT,
  content TEXT NOT NULL, -- Contenu complet de la politique
  version TEXT DEFAULT '1.0',
  -- Statut
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'archived'
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  -- Conformité
  iso27001_control TEXT, -- Référence au contrôle ISO 27001
  soc2_control TEXT, -- Référence au contrôle SOC 2
  -- Dates
  effective_date TIMESTAMPTZ,
  review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les contrôles de sécurité (ISO 27001, SOC 2)
CREATE TABLE IF NOT EXISTS public.security_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identification
  control_id TEXT NOT NULL, -- Ex: "A.9.2.1" (ISO 27001) ou "CC6.1" (SOC 2)
  framework TEXT NOT NULL, -- 'iso27001', 'soc2', 'gdpr', 'nist', 'custom'
  -- Informations
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'access_control', 'encryption', 'monitoring', etc.
  -- Statut
  implementation_status TEXT DEFAULT 'not_implemented', -- 'not_implemented', 'partial', 'implemented', 'verified'
  compliance_status TEXT DEFAULT 'non_compliant', -- 'non_compliant', 'partially_compliant', 'compliant'
  -- Évaluation
  risk_level TEXT, -- 'low', 'medium', 'high', 'critical'
  evidence_required BOOLEAN DEFAULT true,
  evidence_description TEXT,
  -- Dates
  last_assessed_at TIMESTAMPTZ,
  next_assessment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, control_id, framework)
);

-- 3. Table pour les preuves de conformité
CREATE TABLE IF NOT EXISTS public.compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID NOT NULL REFERENCES public.security_controls(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Preuve
  title TEXT NOT NULL,
  description TEXT,
  evidence_type TEXT NOT NULL, -- 'document', 'screenshot', 'log', 'test_result', 'certificate', 'audit_report'
  file_url TEXT, -- URL du fichier de preuve
  -- Métadonnées
  collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  -- Dates
  expires_at TIMESTAMPTZ, -- Date d'expiration de la preuve
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les évaluations de risques
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identification
  risk_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'security', 'operational', 'financial', 'compliance', 'reputation'
  -- Évaluation
  likelihood TEXT NOT NULL, -- 'rare', 'unlikely', 'possible', 'likely', 'almost_certain'
  impact TEXT NOT NULL, -- 'negligible', 'minor', 'moderate', 'major', 'catastrophic'
  risk_level TEXT NOT NULL, -- Calculé: 'low', 'medium', 'high', 'critical'
  -- Traitement
  treatment_status TEXT DEFAULT 'open', -- 'open', 'mitigated', 'accepted', 'transferred', 'avoided'
  treatment_plan TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Dates
  identified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_resolution_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, risk_id)
);

-- 5. Table pour les incidents de sécurité
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identification
  incident_id TEXT NOT NULL UNIQUE, -- Numéro d'incident unique
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'data_breach', 'malware', 'unauthorized_access', 'ddos', 'phishing', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  -- Statut
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'contained', 'resolved', 'closed'
  -- Détails
  detected_at TIMESTAMPTZ NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Impact
  affected_systems TEXT[],
  affected_users_count INTEGER,
  data_breach BOOLEAN DEFAULT false,
  personal_data_affected BOOLEAN DEFAULT false,
  -- Résolution
  root_cause TEXT,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  -- Conformité
  reported_to_authorities BOOLEAN DEFAULT false,
  reported_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, incident_id)
);

-- 6. Table pour les audits de sécurité
CREATE TABLE IF NOT EXISTS public.security_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  audit_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  audit_type TEXT NOT NULL, -- 'internal', 'external', 'self_assessment'
  framework TEXT, -- 'iso27001', 'soc2', 'gdpr', 'custom'
  -- Exécution
  auditor_name TEXT,
  auditor_organization TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  -- Résultats
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  overall_score DECIMAL(5, 2), -- Score global (0-100)
  compliance_percentage DECIMAL(5, 2), -- Pourcentage de conformité
  -- Rapport
  report_url TEXT,
  findings_count INTEGER DEFAULT 0,
  critical_findings_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les constatations d'audit
CREATE TABLE IF NOT EXISTS public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.security_audits(id) ON DELETE CASCADE,
  control_id UUID REFERENCES public.security_controls(id) ON DELETE SET NULL,
  -- Constatation
  finding_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  -- Statut
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  -- Traitement
  remediation_plan TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_resolution_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(audit_id, finding_id)
);

-- 8. Table pour les formations de sécurité
CREATE TABLE IF NOT EXISTS public.security_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Formation
  title TEXT NOT NULL,
  description TEXT,
  training_type TEXT, -- 'awareness', 'technical', 'compliance', 'incident_response'
  -- Exécution
  required_for_all BOOLEAN DEFAULT false,
  required_roles TEXT[], -- Rôles qui doivent suivre cette formation
  duration_minutes INTEGER,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table pour les enregistrements de formation
CREATE TABLE IF NOT EXISTS public.security_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.security_training(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Enregistrement
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'expired'
  completion_percentage DECIMAL(5, 2) DEFAULT 0,
  score DECIMAL(5, 2), -- Score à l'évaluation (si applicable)
  -- Dates
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Date d'expiration de la certification
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(training_id, user_id)
);

-- 10. Table pour les accès et permissions (audit trail)
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Accès
  action TEXT NOT NULL, -- 'login', 'logout', 'view', 'create', 'update', 'delete', 'export', 'download'
  resource_type TEXT, -- 'student', 'payment', 'document', 'settings', etc.
  resource_id UUID,
  -- Métadonnées
  ip_address INET,
  user_agent TEXT,
  location TEXT, -- Géolocalisation (si disponible)
  -- Résultat
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_security_policies_org ON public.security_policies(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_security_policies_code ON public.security_policies(code);
CREATE INDEX IF NOT EXISTS idx_security_controls_org ON public.security_controls(organization_id, framework);
CREATE INDEX IF NOT EXISTS idx_security_controls_status ON public.security_controls(implementation_status, compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_control ON public.compliance_evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_org ON public.risk_assessments(organization_id, treatment_status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_level ON public.risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_security_incidents_org ON public.security_incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audits_org ON public.security_audits(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON public.audit_findings(audit_id, status);
CREATE INDEX IF NOT EXISTS idx_security_training_org ON public.security_training(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_security_training_records_user ON public.security_training_records(user_id, status);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_org ON public.access_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON public.access_logs(action, created_at DESC);

-- 12. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 13. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_security_policies_timestamp ON public.security_policies;
CREATE TRIGGER update_security_policies_timestamp
  BEFORE UPDATE ON public.security_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_controls_timestamp ON public.security_controls;
CREATE TRIGGER update_security_controls_timestamp
  BEFORE UPDATE ON public.security_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_risk_assessments_timestamp ON public.risk_assessments;
CREATE TRIGGER update_risk_assessments_timestamp
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_incidents_timestamp ON public.security_incidents;
CREATE TRIGGER update_security_incidents_timestamp
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_audits_timestamp ON public.security_audits;
CREATE TRIGGER update_security_audits_timestamp
  BEFORE UPDATE ON public.security_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_audit_findings_timestamp ON public.audit_findings;
CREATE TRIGGER update_audit_findings_timestamp
  BEFORE UPDATE ON public.audit_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_training_timestamp ON public.security_training;
CREATE TRIGGER update_security_training_timestamp
  BEFORE UPDATE ON public.security_training
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_training_records_timestamp ON public.security_training_records;
CREATE TRIGGER update_security_training_records_timestamp
  BEFORE UPDATE ON public.security_training_records
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

-- 14. Fonction pour calculer le niveau de risque
CREATE OR REPLACE FUNCTION calculate_risk_level(likelihood_val TEXT, impact_val TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  risk_matrix TEXT[5][5] := ARRAY[
    ARRAY['low', 'low', 'medium', 'medium', 'high'],
    ARRAY['low', 'medium', 'medium', 'high', 'high'],
    ARRAY['medium', 'medium', 'high', 'high', 'critical'],
    ARRAY['medium', 'high', 'high', 'critical', 'critical'],
    ARRAY['high', 'high', 'critical', 'critical', 'critical']
  ];
  likelihood_idx INTEGER;
  impact_idx INTEGER;
BEGIN
  -- Convertir likelihood en index
  CASE likelihood_val
    WHEN 'rare' THEN likelihood_idx := 0;
    WHEN 'unlikely' THEN likelihood_idx := 1;
    WHEN 'possible' THEN likelihood_idx := 2;
    WHEN 'likely' THEN likelihood_idx := 3;
    WHEN 'almost_certain' THEN likelihood_idx := 4;
    ELSE likelihood_idx := 2;
  END CASE;

  -- Convertir impact en index
  CASE impact_val
    WHEN 'negligible' THEN impact_idx := 0;
    WHEN 'minor' THEN impact_idx := 1;
    WHEN 'moderate' THEN impact_idx := 2;
    WHEN 'major' THEN impact_idx := 3;
    WHEN 'catastrophic' THEN impact_idx := 4;
    ELSE impact_idx := 2;
  END CASE;

  RETURN risk_matrix[likelihood_idx + 1][impact_idx + 1];
END;
$$;

-- 15. Trigger pour calculer automatiquement le niveau de risque
CREATE OR REPLACE FUNCTION auto_calculate_risk_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.risk_level := calculate_risk_level(NEW.likelihood, NEW.impact);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calculate_risk_level ON public.risk_assessments;
CREATE TRIGGER trigger_calculate_risk_level
  BEFORE INSERT OR UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_risk_level();

-- 16. RLS Policies
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour toutes les tables (accès basé sur organization_id)
DROP POLICY IF EXISTS "Users can view their organization's compliance data" ON public.security_policies;
CREATE POLICY "Users can view their organization's compliance data"
  ON public.security_policies
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR organization_id IS NULL
  );

-- Répéter pour les autres tables...
-- (Pour simplifier, on peut créer une fonction générique ou répéter le pattern)

-- 17. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_controls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_evidence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_audits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_training TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_training_records TO authenticated;
GRANT SELECT ON public.access_logs TO authenticated;



-- 1. Table pour les politiques de sécurité
CREATE TABLE IF NOT EXISTS public.security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- Code unique de la politique (ex: "POL-001")
  category TEXT NOT NULL, -- 'access_control', 'data_protection', 'incident_response', 'business_continuity', etc.
  -- Contenu
  description TEXT,
  content TEXT NOT NULL, -- Contenu complet de la politique
  version TEXT DEFAULT '1.0',
  -- Statut
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'archived'
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  -- Conformité
  iso27001_control TEXT, -- Référence au contrôle ISO 27001
  soc2_control TEXT, -- Référence au contrôle SOC 2
  -- Dates
  effective_date TIMESTAMPTZ,
  review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les contrôles de sécurité (ISO 27001, SOC 2)
CREATE TABLE IF NOT EXISTS public.security_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identification
  control_id TEXT NOT NULL, -- Ex: "A.9.2.1" (ISO 27001) ou "CC6.1" (SOC 2)
  framework TEXT NOT NULL, -- 'iso27001', 'soc2', 'gdpr', 'nist', 'custom'
  -- Informations
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'access_control', 'encryption', 'monitoring', etc.
  -- Statut
  implementation_status TEXT DEFAULT 'not_implemented', -- 'not_implemented', 'partial', 'implemented', 'verified'
  compliance_status TEXT DEFAULT 'non_compliant', -- 'non_compliant', 'partially_compliant', 'compliant'
  -- Évaluation
  risk_level TEXT, -- 'low', 'medium', 'high', 'critical'
  evidence_required BOOLEAN DEFAULT true,
  evidence_description TEXT,
  -- Dates
  last_assessed_at TIMESTAMPTZ,
  next_assessment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, control_id, framework)
);

-- 3. Table pour les preuves de conformité
CREATE TABLE IF NOT EXISTS public.compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID NOT NULL REFERENCES public.security_controls(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Preuve
  title TEXT NOT NULL,
  description TEXT,
  evidence_type TEXT NOT NULL, -- 'document', 'screenshot', 'log', 'test_result', 'certificate', 'audit_report'
  file_url TEXT, -- URL du fichier de preuve
  -- Métadonnées
  collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  -- Dates
  expires_at TIMESTAMPTZ, -- Date d'expiration de la preuve
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les évaluations de risques
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identification
  risk_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'security', 'operational', 'financial', 'compliance', 'reputation'
  -- Évaluation
  likelihood TEXT NOT NULL, -- 'rare', 'unlikely', 'possible', 'likely', 'almost_certain'
  impact TEXT NOT NULL, -- 'negligible', 'minor', 'moderate', 'major', 'catastrophic'
  risk_level TEXT NOT NULL, -- Calculé: 'low', 'medium', 'high', 'critical'
  -- Traitement
  treatment_status TEXT DEFAULT 'open', -- 'open', 'mitigated', 'accepted', 'transferred', 'avoided'
  treatment_plan TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Dates
  identified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_resolution_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, risk_id)
);

-- 5. Table pour les incidents de sécurité
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identification
  incident_id TEXT NOT NULL UNIQUE, -- Numéro d'incident unique
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'data_breach', 'malware', 'unauthorized_access', 'ddos', 'phishing', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  -- Statut
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'contained', 'resolved', 'closed'
  -- Détails
  detected_at TIMESTAMPTZ NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Impact
  affected_systems TEXT[],
  affected_users_count INTEGER,
  data_breach BOOLEAN DEFAULT false,
  personal_data_affected BOOLEAN DEFAULT false,
  -- Résolution
  root_cause TEXT,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  -- Conformité
  reported_to_authorities BOOLEAN DEFAULT false,
  reported_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, incident_id)
);

-- 6. Table pour les audits de sécurité
CREATE TABLE IF NOT EXISTS public.security_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  audit_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  audit_type TEXT NOT NULL, -- 'internal', 'external', 'self_assessment'
  framework TEXT, -- 'iso27001', 'soc2', 'gdpr', 'custom'
  -- Exécution
  auditor_name TEXT,
  auditor_organization TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  -- Résultats
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  overall_score DECIMAL(5, 2), -- Score global (0-100)
  compliance_percentage DECIMAL(5, 2), -- Pourcentage de conformité
  -- Rapport
  report_url TEXT,
  findings_count INTEGER DEFAULT 0,
  critical_findings_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les constatations d'audit
CREATE TABLE IF NOT EXISTS public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.security_audits(id) ON DELETE CASCADE,
  control_id UUID REFERENCES public.security_controls(id) ON DELETE SET NULL,
  -- Constatation
  finding_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  -- Statut
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  -- Traitement
  remediation_plan TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_resolution_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(audit_id, finding_id)
);

-- 8. Table pour les formations de sécurité
CREATE TABLE IF NOT EXISTS public.security_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Formation
  title TEXT NOT NULL,
  description TEXT,
  training_type TEXT, -- 'awareness', 'technical', 'compliance', 'incident_response'
  -- Exécution
  required_for_all BOOLEAN DEFAULT false,
  required_roles TEXT[], -- Rôles qui doivent suivre cette formation
  duration_minutes INTEGER,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table pour les enregistrements de formation
CREATE TABLE IF NOT EXISTS public.security_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.security_training(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Enregistrement
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'expired'
  completion_percentage DECIMAL(5, 2) DEFAULT 0,
  score DECIMAL(5, 2), -- Score à l'évaluation (si applicable)
  -- Dates
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Date d'expiration de la certification
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(training_id, user_id)
);

-- 10. Table pour les accès et permissions (audit trail)
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Accès
  action TEXT NOT NULL, -- 'login', 'logout', 'view', 'create', 'update', 'delete', 'export', 'download'
  resource_type TEXT, -- 'student', 'payment', 'document', 'settings', etc.
  resource_id UUID,
  -- Métadonnées
  ip_address INET,
  user_agent TEXT,
  location TEXT, -- Géolocalisation (si disponible)
  -- Résultat
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_security_policies_org ON public.security_policies(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_security_policies_code ON public.security_policies(code);
CREATE INDEX IF NOT EXISTS idx_security_controls_org ON public.security_controls(organization_id, framework);
CREATE INDEX IF NOT EXISTS idx_security_controls_status ON public.security_controls(implementation_status, compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_control ON public.compliance_evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_org ON public.risk_assessments(organization_id, treatment_status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_level ON public.risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_security_incidents_org ON public.security_incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audits_org ON public.security_audits(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON public.audit_findings(audit_id, status);
CREATE INDEX IF NOT EXISTS idx_security_training_org ON public.security_training(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_security_training_records_user ON public.security_training_records(user_id, status);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_org ON public.access_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON public.access_logs(action, created_at DESC);

-- 12. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 13. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_security_policies_timestamp ON public.security_policies;
CREATE TRIGGER update_security_policies_timestamp
  BEFORE UPDATE ON public.security_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_controls_timestamp ON public.security_controls;
CREATE TRIGGER update_security_controls_timestamp
  BEFORE UPDATE ON public.security_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_risk_assessments_timestamp ON public.risk_assessments;
CREATE TRIGGER update_risk_assessments_timestamp
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_incidents_timestamp ON public.security_incidents;
CREATE TRIGGER update_security_incidents_timestamp
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_audits_timestamp ON public.security_audits;
CREATE TRIGGER update_security_audits_timestamp
  BEFORE UPDATE ON public.security_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_audit_findings_timestamp ON public.audit_findings;
CREATE TRIGGER update_audit_findings_timestamp
  BEFORE UPDATE ON public.audit_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_training_timestamp ON public.security_training;
CREATE TRIGGER update_security_training_timestamp
  BEFORE UPDATE ON public.security_training
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_training_records_timestamp ON public.security_training_records;
CREATE TRIGGER update_security_training_records_timestamp
  BEFORE UPDATE ON public.security_training_records
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

-- 14. Fonction pour calculer le niveau de risque
CREATE OR REPLACE FUNCTION calculate_risk_level(likelihood_val TEXT, impact_val TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  risk_matrix TEXT[5][5] := ARRAY[
    ARRAY['low', 'low', 'medium', 'medium', 'high'],
    ARRAY['low', 'medium', 'medium', 'high', 'high'],
    ARRAY['medium', 'medium', 'high', 'high', 'critical'],
    ARRAY['medium', 'high', 'high', 'critical', 'critical'],
    ARRAY['high', 'high', 'critical', 'critical', 'critical']
  ];
  likelihood_idx INTEGER;
  impact_idx INTEGER;
BEGIN
  -- Convertir likelihood en index
  CASE likelihood_val
    WHEN 'rare' THEN likelihood_idx := 0;
    WHEN 'unlikely' THEN likelihood_idx := 1;
    WHEN 'possible' THEN likelihood_idx := 2;
    WHEN 'likely' THEN likelihood_idx := 3;
    WHEN 'almost_certain' THEN likelihood_idx := 4;
    ELSE likelihood_idx := 2;
  END CASE;

  -- Convertir impact en index
  CASE impact_val
    WHEN 'negligible' THEN impact_idx := 0;
    WHEN 'minor' THEN impact_idx := 1;
    WHEN 'moderate' THEN impact_idx := 2;
    WHEN 'major' THEN impact_idx := 3;
    WHEN 'catastrophic' THEN impact_idx := 4;
    ELSE impact_idx := 2;
  END CASE;

  RETURN risk_matrix[likelihood_idx + 1][impact_idx + 1];
END;
$$;

-- 15. Trigger pour calculer automatiquement le niveau de risque
CREATE OR REPLACE FUNCTION auto_calculate_risk_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.risk_level := calculate_risk_level(NEW.likelihood, NEW.impact);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calculate_risk_level ON public.risk_assessments;
CREATE TRIGGER trigger_calculate_risk_level
  BEFORE INSERT OR UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_risk_level();

-- 16. RLS Policies
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour toutes les tables (accès basé sur organization_id)
DROP POLICY IF EXISTS "Users can view their organization's compliance data" ON public.security_policies;
CREATE POLICY "Users can view their organization's compliance data"
  ON public.security_policies
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR organization_id IS NULL
  );

-- Répéter pour les autres tables...
-- (Pour simplifier, on peut créer une fonction générique ou répéter le pattern)

-- 17. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_controls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_evidence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_audits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_training TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_training_records TO authenticated;
GRANT SELECT ON public.access_logs TO authenticated;



-- 1. Table pour les politiques de sécurité
CREATE TABLE IF NOT EXISTS public.security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- Code unique de la politique (ex: "POL-001")
  category TEXT NOT NULL, -- 'access_control', 'data_protection', 'incident_response', 'business_continuity', etc.
  -- Contenu
  description TEXT,
  content TEXT NOT NULL, -- Contenu complet de la politique
  version TEXT DEFAULT '1.0',
  -- Statut
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'archived'
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  -- Conformité
  iso27001_control TEXT, -- Référence au contrôle ISO 27001
  soc2_control TEXT, -- Référence au contrôle SOC 2
  -- Dates
  effective_date TIMESTAMPTZ,
  review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les contrôles de sécurité (ISO 27001, SOC 2)
CREATE TABLE IF NOT EXISTS public.security_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identification
  control_id TEXT NOT NULL, -- Ex: "A.9.2.1" (ISO 27001) ou "CC6.1" (SOC 2)
  framework TEXT NOT NULL, -- 'iso27001', 'soc2', 'gdpr', 'nist', 'custom'
  -- Informations
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'access_control', 'encryption', 'monitoring', etc.
  -- Statut
  implementation_status TEXT DEFAULT 'not_implemented', -- 'not_implemented', 'partial', 'implemented', 'verified'
  compliance_status TEXT DEFAULT 'non_compliant', -- 'non_compliant', 'partially_compliant', 'compliant'
  -- Évaluation
  risk_level TEXT, -- 'low', 'medium', 'high', 'critical'
  evidence_required BOOLEAN DEFAULT true,
  evidence_description TEXT,
  -- Dates
  last_assessed_at TIMESTAMPTZ,
  next_assessment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, control_id, framework)
);

-- 3. Table pour les preuves de conformité
CREATE TABLE IF NOT EXISTS public.compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID NOT NULL REFERENCES public.security_controls(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Preuve
  title TEXT NOT NULL,
  description TEXT,
  evidence_type TEXT NOT NULL, -- 'document', 'screenshot', 'log', 'test_result', 'certificate', 'audit_report'
  file_url TEXT, -- URL du fichier de preuve
  -- Métadonnées
  collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  -- Dates
  expires_at TIMESTAMPTZ, -- Date d'expiration de la preuve
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les évaluations de risques
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identification
  risk_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'security', 'operational', 'financial', 'compliance', 'reputation'
  -- Évaluation
  likelihood TEXT NOT NULL, -- 'rare', 'unlikely', 'possible', 'likely', 'almost_certain'
  impact TEXT NOT NULL, -- 'negligible', 'minor', 'moderate', 'major', 'catastrophic'
  risk_level TEXT NOT NULL, -- Calculé: 'low', 'medium', 'high', 'critical'
  -- Traitement
  treatment_status TEXT DEFAULT 'open', -- 'open', 'mitigated', 'accepted', 'transferred', 'avoided'
  treatment_plan TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Dates
  identified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_resolution_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, risk_id)
);

-- 5. Table pour les incidents de sécurité
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identification
  incident_id TEXT NOT NULL UNIQUE, -- Numéro d'incident unique
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'data_breach', 'malware', 'unauthorized_access', 'ddos', 'phishing', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  -- Statut
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'contained', 'resolved', 'closed'
  -- Détails
  detected_at TIMESTAMPTZ NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Impact
  affected_systems TEXT[],
  affected_users_count INTEGER,
  data_breach BOOLEAN DEFAULT false,
  personal_data_affected BOOLEAN DEFAULT false,
  -- Résolution
  root_cause TEXT,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  -- Conformité
  reported_to_authorities BOOLEAN DEFAULT false,
  reported_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, incident_id)
);

-- 6. Table pour les audits de sécurité
CREATE TABLE IF NOT EXISTS public.security_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  audit_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  audit_type TEXT NOT NULL, -- 'internal', 'external', 'self_assessment'
  framework TEXT, -- 'iso27001', 'soc2', 'gdpr', 'custom'
  -- Exécution
  auditor_name TEXT,
  auditor_organization TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  -- Résultats
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  overall_score DECIMAL(5, 2), -- Score global (0-100)
  compliance_percentage DECIMAL(5, 2), -- Pourcentage de conformité
  -- Rapport
  report_url TEXT,
  findings_count INTEGER DEFAULT 0,
  critical_findings_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les constatations d'audit
CREATE TABLE IF NOT EXISTS public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.security_audits(id) ON DELETE CASCADE,
  control_id UUID REFERENCES public.security_controls(id) ON DELETE SET NULL,
  -- Constatation
  finding_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  -- Statut
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  -- Traitement
  remediation_plan TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_resolution_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(audit_id, finding_id)
);

-- 8. Table pour les formations de sécurité
CREATE TABLE IF NOT EXISTS public.security_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Formation
  title TEXT NOT NULL,
  description TEXT,
  training_type TEXT, -- 'awareness', 'technical', 'compliance', 'incident_response'
  -- Exécution
  required_for_all BOOLEAN DEFAULT false,
  required_roles TEXT[], -- Rôles qui doivent suivre cette formation
  duration_minutes INTEGER,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table pour les enregistrements de formation
CREATE TABLE IF NOT EXISTS public.security_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.security_training(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Enregistrement
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'expired'
  completion_percentage DECIMAL(5, 2) DEFAULT 0,
  score DECIMAL(5, 2), -- Score à l'évaluation (si applicable)
  -- Dates
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Date d'expiration de la certification
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(training_id, user_id)
);

-- 10. Table pour les accès et permissions (audit trail)
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Accès
  action TEXT NOT NULL, -- 'login', 'logout', 'view', 'create', 'update', 'delete', 'export', 'download'
  resource_type TEXT, -- 'student', 'payment', 'document', 'settings', etc.
  resource_id UUID,
  -- Métadonnées
  ip_address INET,
  user_agent TEXT,
  location TEXT, -- Géolocalisation (si disponible)
  -- Résultat
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_security_policies_org ON public.security_policies(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_security_policies_code ON public.security_policies(code);
CREATE INDEX IF NOT EXISTS idx_security_controls_org ON public.security_controls(organization_id, framework);
CREATE INDEX IF NOT EXISTS idx_security_controls_status ON public.security_controls(implementation_status, compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_control ON public.compliance_evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_org ON public.risk_assessments(organization_id, treatment_status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_level ON public.risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_security_incidents_org ON public.security_incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audits_org ON public.security_audits(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON public.audit_findings(audit_id, status);
CREATE INDEX IF NOT EXISTS idx_security_training_org ON public.security_training(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_security_training_records_user ON public.security_training_records(user_id, status);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_org ON public.access_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON public.access_logs(action, created_at DESC);

-- 12. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 13. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_security_policies_timestamp ON public.security_policies;
CREATE TRIGGER update_security_policies_timestamp
  BEFORE UPDATE ON public.security_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_controls_timestamp ON public.security_controls;
CREATE TRIGGER update_security_controls_timestamp
  BEFORE UPDATE ON public.security_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_risk_assessments_timestamp ON public.risk_assessments;
CREATE TRIGGER update_risk_assessments_timestamp
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_incidents_timestamp ON public.security_incidents;
CREATE TRIGGER update_security_incidents_timestamp
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_audits_timestamp ON public.security_audits;
CREATE TRIGGER update_security_audits_timestamp
  BEFORE UPDATE ON public.security_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_audit_findings_timestamp ON public.audit_findings;
CREATE TRIGGER update_audit_findings_timestamp
  BEFORE UPDATE ON public.audit_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_training_timestamp ON public.security_training;
CREATE TRIGGER update_security_training_timestamp
  BEFORE UPDATE ON public.security_training
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_security_training_records_timestamp ON public.security_training_records;
CREATE TRIGGER update_security_training_records_timestamp
  BEFORE UPDATE ON public.security_training_records
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

-- 14. Fonction pour calculer le niveau de risque
CREATE OR REPLACE FUNCTION calculate_risk_level(likelihood_val TEXT, impact_val TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  risk_matrix TEXT[5][5] := ARRAY[
    ARRAY['low', 'low', 'medium', 'medium', 'high'],
    ARRAY['low', 'medium', 'medium', 'high', 'high'],
    ARRAY['medium', 'medium', 'high', 'high', 'critical'],
    ARRAY['medium', 'high', 'high', 'critical', 'critical'],
    ARRAY['high', 'high', 'critical', 'critical', 'critical']
  ];
  likelihood_idx INTEGER;
  impact_idx INTEGER;
BEGIN
  -- Convertir likelihood en index
  CASE likelihood_val
    WHEN 'rare' THEN likelihood_idx := 0;
    WHEN 'unlikely' THEN likelihood_idx := 1;
    WHEN 'possible' THEN likelihood_idx := 2;
    WHEN 'likely' THEN likelihood_idx := 3;
    WHEN 'almost_certain' THEN likelihood_idx := 4;
    ELSE likelihood_idx := 2;
  END CASE;

  -- Convertir impact en index
  CASE impact_val
    WHEN 'negligible' THEN impact_idx := 0;
    WHEN 'minor' THEN impact_idx := 1;
    WHEN 'moderate' THEN impact_idx := 2;
    WHEN 'major' THEN impact_idx := 3;
    WHEN 'catastrophic' THEN impact_idx := 4;
    ELSE impact_idx := 2;
  END CASE;

  RETURN risk_matrix[likelihood_idx + 1][impact_idx + 1];
END;
$$;

-- 15. Trigger pour calculer automatiquement le niveau de risque
CREATE OR REPLACE FUNCTION auto_calculate_risk_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.risk_level := calculate_risk_level(NEW.likelihood, NEW.impact);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calculate_risk_level ON public.risk_assessments;
CREATE TRIGGER trigger_calculate_risk_level
  BEFORE INSERT OR UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_risk_level();

-- 16. RLS Policies
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour toutes les tables (accès basé sur organization_id)
DROP POLICY IF EXISTS "Users can view their organization's compliance data" ON public.security_policies;
CREATE POLICY "Users can view their organization's compliance data"
  ON public.security_policies
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR organization_id IS NULL
  );

-- Répéter pour les autres tables...
-- (Pour simplifier, on peut créer une fonction générique ou répéter le pattern)

-- 17. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_controls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_evidence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_audits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_training TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_training_records TO authenticated;
GRANT SELECT ON public.access_logs TO authenticated;


