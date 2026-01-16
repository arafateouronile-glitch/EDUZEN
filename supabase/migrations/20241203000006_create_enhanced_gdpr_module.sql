-- Migration pour le module RGPD renforcé
-- Conformité RGPD complète pour les organismes de formation en France

-- 1. Table des consentements RGPD
CREATE TABLE IF NOT EXISTS public.gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'cookies', 'data_sharing', 'third_party', 'other')),
  purpose TEXT NOT NULL, -- Description de l'utilisation des données
  granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  consent_method VARCHAR(50) CHECK (consent_method IN ('web_form', 'email', 'paper', 'phone', 'api', 'other')),
  version VARCHAR(20), -- Version du formulaire de consentement
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, consent_type)
);

-- 2. Table du registre des traitements (Article 30 RGPD)
CREATE TABLE IF NOT EXISTS public.gdpr_processing_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  processing_name TEXT NOT NULL, -- Nom du traitement
  processing_purpose TEXT NOT NULL, -- Finalité du traitement
  legal_basis VARCHAR(50) NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  data_categories TEXT[] NOT NULL, -- Catégories de données traitées
  data_subjects TEXT[] NOT NULL, -- Catégories de personnes concernées
  recipients TEXT[], -- Destinataires des données
  transfers_outside_eu BOOLEAN DEFAULT false,
  transfers_countries TEXT[], -- Pays de transfert si applicable
  retention_period VARCHAR(100), -- Durée de conservation
  security_measures TEXT[], -- Mesures de sécurité
  data_protection_officer_id UUID REFERENCES public.users(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'deleted')),
  last_review_date DATE,
  next_review_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des demandes de droits RGPD
CREATE TABLE IF NOT EXISTS public.gdpr_data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection', 'withdraw_consent')),
  request_status VARCHAR(50) DEFAULT 'pending' CHECK (request_status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),
  request_date TIMESTAMPTZ DEFAULT NOW(),
  requested_by_name TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  requested_by_phone TEXT,
  identity_verification_method VARCHAR(50) CHECK (identity_verification_method IN ('email', 'id_card', 'phone', 'other')),
  identity_verified BOOLEAN DEFAULT false,
  identity_verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id),
  description TEXT, -- Description de la demande
  response_data JSONB, -- Données retournées (pour access/portability)
  response_file_url TEXT, -- Fichier ZIP avec les données (pour portability)
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des violations de données (Article 33-34 RGPD)
CREATE TABLE IF NOT EXISTS public.gdpr_data_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  breach_type VARCHAR(50) NOT NULL CHECK (breach_type IN ('confidentiality', 'integrity', 'availability')),
  breach_date TIMESTAMPTZ NOT NULL,
  discovery_date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  affected_data_categories TEXT[],
  affected_data_subjects_count INTEGER,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  notification_required BOOLEAN DEFAULT false,
  cnil_notified BOOLEAN DEFAULT false, -- Notification à la CNIL
  cnil_notification_date TIMESTAMPTZ,
  data_subjects_notified BOOLEAN DEFAULT false,
  data_subjects_notification_date TIMESTAMPTZ,
  measures_taken TEXT[], -- Mesures prises pour remédier
  preventive_measures TEXT[], -- Mesures préventives
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'remediated', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.users(id),
  reported_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des exports de données (portabilité)
CREATE TABLE IF NOT EXISTS public.gdpr_data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.gdpr_data_subject_requests(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  export_format VARCHAR(50) DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'xml', 'pdf', 'zip')),
  file_url TEXT NOT NULL,
  file_hash VARCHAR(64), -- Hash pour vérification d'intégrité
  file_size INTEGER,
  data_categories TEXT[] NOT NULL, -- Catégories de données exportées
  expiration_date TIMESTAMPTZ, -- Date d'expiration du lien de téléchargement
  downloaded BOOLEAN DEFAULT false,
  downloaded_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des suppressions de données (droit à l'oubli)
CREATE TABLE IF NOT EXISTS public.gdpr_data_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.gdpr_data_subject_requests(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deletion_type VARCHAR(50) NOT NULL CHECK (deletion_type IN ('full', 'partial', 'anonymization')),
  data_categories TEXT[] NOT NULL, -- Catégories de données supprimées
  deletion_reason TEXT,
  backup_created BOOLEAN DEFAULT false,
  backup_location TEXT,
  deleted_tables TEXT[], -- Tables concernées
  deleted_records_count INTEGER,
  deletion_status VARCHAR(50) DEFAULT 'pending' CHECK (deletion_status IN ('pending', 'in_progress', 'completed', 'failed', 'partially_completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  performed_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des logs d'accès aux données personnelles
CREATE TABLE IF NOT EXISTS public.gdpr_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  accessed_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Utilisateur dont les données ont été consultées
  access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('view', 'edit', 'export', 'delete', 'share')),
  data_category VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  access_reason TEXT,
  authorized_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table des politiques de confidentialité
CREATE TABLE IF NOT EXISTS public.gdpr_privacy_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  language VARCHAR(10) DEFAULT 'fr',
  is_active BOOLEAN DEFAULT true,
  acceptance_required BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, version, language)
);

-- 9. Table des acceptations de politiques de confidentialité
CREATE TABLE IF NOT EXISTS public.gdpr_policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.gdpr_privacy_policies(id) ON DELETE CASCADE,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, policy_id)
);

-- 10. Table des DPO (Data Protection Officers)
CREATE TABLE IF NOT EXISTS public.gdpr_dpo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_external BOOLEAN DEFAULT false, -- DPO externe
  external_company_name TEXT,
  external_contact_email TEXT,
  external_contact_phone TEXT,
  appointment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_org ON public.gdpr_consents(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user ON public.gdpr_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_type ON public.gdpr_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_processing_registry_org ON public.gdpr_processing_registry(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_subject_requests_org ON public.gdpr_data_subject_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_subject_requests_user ON public.gdpr_data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_subject_requests_status ON public.gdpr_data_subject_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_breaches_org ON public.gdpr_data_breaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_breaches_severity ON public.gdpr_data_breaches(severity);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_exports_user ON public.gdpr_data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_deletions_user ON public.gdpr_data_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_access_logs_org ON public.gdpr_access_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_access_logs_accessed_user ON public.gdpr_access_logs(accessed_user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_gdpr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_gdpr_consents_updated_at
  BEFORE UPDATE ON public.gdpr_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_processing_registry_updated_at
  BEFORE UPDATE ON public.gdpr_processing_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_data_subject_requests_updated_at
  BEFORE UPDATE ON public.gdpr_data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_data_breaches_updated_at
  BEFORE UPDATE ON public.gdpr_data_breaches
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_privacy_policies_updated_at
  BEFORE UPDATE ON public.gdpr_privacy_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_dpo_updated_at
  BEFORE UPDATE ON public.gdpr_dpo
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

-- Fonction pour vérifier si une violation nécessite une notification
CREATE OR REPLACE FUNCTION check_breach_notification_required()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la violation est de sévérité élevée ou critique, notification requise
  IF NEW.severity IN ('high', 'critical') THEN
    NEW.notification_required := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_breach_notification
  BEFORE INSERT OR UPDATE ON public.gdpr_data_breaches
  FOR EACH ROW
  EXECUTE FUNCTION check_breach_notification_required();

-- RLS Policies
ALTER TABLE public.gdpr_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_processing_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_privacy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_policy_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_dpo ENABLE ROW LEVEL SECURITY;

-- Policies pour gdpr_consents
CREATE POLICY "Users can view their own consents"
  ON public.gdpr_consents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all consents"
  ON public.gdpr_consents FOR SELECT
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

CREATE POLICY "Users can manage their own consents"
  ON public.gdpr_consents FOR ALL
  USING (user_id = auth.uid());

-- Policies similaires pour les autres tables
CREATE POLICY "Admins can manage processing registry"
  ON public.gdpr_processing_registry FOR ALL
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

CREATE POLICY "Users can view their own data requests"
  ON public.gdpr_data_subject_requests FOR SELECT
  USING (user_id = auth.uid() OR requested_by_email = (SELECT email FROM public.users WHERE id = auth.uid()));

-- Commentaires
COMMENT ON TABLE public.gdpr_consents IS 'Consentements RGPD des utilisateurs';
COMMENT ON TABLE public.gdpr_processing_registry IS 'Registre des traitements (Article 30 RGPD)';
COMMENT ON TABLE public.gdpr_data_subject_requests IS 'Demandes des personnes concernées (accès, rectification, effacement, portabilité)';
COMMENT ON TABLE public.gdpr_data_breaches IS 'Violations de données (Article 33-34 RGPD)';
COMMENT ON TABLE public.gdpr_data_exports IS 'Exports de données pour la portabilité';
COMMENT ON TABLE public.gdpr_data_deletions IS 'Suppressions de données (droit à l''oubli)';
COMMENT ON TABLE public.gdpr_access_logs IS 'Logs d''accès aux données personnelles';
COMMENT ON TABLE public.gdpr_privacy_policies IS 'Politiques de confidentialité';
COMMENT ON TABLE public.gdpr_policy_acceptances IS 'Acceptations des politiques de confidentialité';
COMMENT ON TABLE public.gdpr_dpo IS 'Délégués à la protection des données (DPO)';

-- Conformité RGPD complète pour les organismes de formation en France

-- 1. Table des consentements RGPD
CREATE TABLE IF NOT EXISTS public.gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'cookies', 'data_sharing', 'third_party', 'other')),
  purpose TEXT NOT NULL, -- Description de l'utilisation des données
  granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  consent_method VARCHAR(50) CHECK (consent_method IN ('web_form', 'email', 'paper', 'phone', 'api', 'other')),
  version VARCHAR(20), -- Version du formulaire de consentement
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, consent_type)
);

-- 2. Table du registre des traitements (Article 30 RGPD)
CREATE TABLE IF NOT EXISTS public.gdpr_processing_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  processing_name TEXT NOT NULL, -- Nom du traitement
  processing_purpose TEXT NOT NULL, -- Finalité du traitement
  legal_basis VARCHAR(50) NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  data_categories TEXT[] NOT NULL, -- Catégories de données traitées
  data_subjects TEXT[] NOT NULL, -- Catégories de personnes concernées
  recipients TEXT[], -- Destinataires des données
  transfers_outside_eu BOOLEAN DEFAULT false,
  transfers_countries TEXT[], -- Pays de transfert si applicable
  retention_period VARCHAR(100), -- Durée de conservation
  security_measures TEXT[], -- Mesures de sécurité
  data_protection_officer_id UUID REFERENCES public.users(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'deleted')),
  last_review_date DATE,
  next_review_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des demandes de droits RGPD
CREATE TABLE IF NOT EXISTS public.gdpr_data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection', 'withdraw_consent')),
  request_status VARCHAR(50) DEFAULT 'pending' CHECK (request_status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),
  request_date TIMESTAMPTZ DEFAULT NOW(),
  requested_by_name TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  requested_by_phone TEXT,
  identity_verification_method VARCHAR(50) CHECK (identity_verification_method IN ('email', 'id_card', 'phone', 'other')),
  identity_verified BOOLEAN DEFAULT false,
  identity_verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id),
  description TEXT, -- Description de la demande
  response_data JSONB, -- Données retournées (pour access/portability)
  response_file_url TEXT, -- Fichier ZIP avec les données (pour portability)
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des violations de données (Article 33-34 RGPD)
CREATE TABLE IF NOT EXISTS public.gdpr_data_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  breach_type VARCHAR(50) NOT NULL CHECK (breach_type IN ('confidentiality', 'integrity', 'availability')),
  breach_date TIMESTAMPTZ NOT NULL,
  discovery_date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  affected_data_categories TEXT[],
  affected_data_subjects_count INTEGER,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  notification_required BOOLEAN DEFAULT false,
  cnil_notified BOOLEAN DEFAULT false, -- Notification à la CNIL
  cnil_notification_date TIMESTAMPTZ,
  data_subjects_notified BOOLEAN DEFAULT false,
  data_subjects_notification_date TIMESTAMPTZ,
  measures_taken TEXT[], -- Mesures prises pour remédier
  preventive_measures TEXT[], -- Mesures préventives
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'remediated', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.users(id),
  reported_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des exports de données (portabilité)
CREATE TABLE IF NOT EXISTS public.gdpr_data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.gdpr_data_subject_requests(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  export_format VARCHAR(50) DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'xml', 'pdf', 'zip')),
  file_url TEXT NOT NULL,
  file_hash VARCHAR(64), -- Hash pour vérification d'intégrité
  file_size INTEGER,
  data_categories TEXT[] NOT NULL, -- Catégories de données exportées
  expiration_date TIMESTAMPTZ, -- Date d'expiration du lien de téléchargement
  downloaded BOOLEAN DEFAULT false,
  downloaded_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des suppressions de données (droit à l'oubli)
CREATE TABLE IF NOT EXISTS public.gdpr_data_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.gdpr_data_subject_requests(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deletion_type VARCHAR(50) NOT NULL CHECK (deletion_type IN ('full', 'partial', 'anonymization')),
  data_categories TEXT[] NOT NULL, -- Catégories de données supprimées
  deletion_reason TEXT,
  backup_created BOOLEAN DEFAULT false,
  backup_location TEXT,
  deleted_tables TEXT[], -- Tables concernées
  deleted_records_count INTEGER,
  deletion_status VARCHAR(50) DEFAULT 'pending' CHECK (deletion_status IN ('pending', 'in_progress', 'completed', 'failed', 'partially_completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  performed_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des logs d'accès aux données personnelles
CREATE TABLE IF NOT EXISTS public.gdpr_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  accessed_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Utilisateur dont les données ont été consultées
  access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('view', 'edit', 'export', 'delete', 'share')),
  data_category VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  access_reason TEXT,
  authorized_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table des politiques de confidentialité
CREATE TABLE IF NOT EXISTS public.gdpr_privacy_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  language VARCHAR(10) DEFAULT 'fr',
  is_active BOOLEAN DEFAULT true,
  acceptance_required BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, version, language)
);

-- 9. Table des acceptations de politiques de confidentialité
CREATE TABLE IF NOT EXISTS public.gdpr_policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.gdpr_privacy_policies(id) ON DELETE CASCADE,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, policy_id)
);

-- 10. Table des DPO (Data Protection Officers)
CREATE TABLE IF NOT EXISTS public.gdpr_dpo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_external BOOLEAN DEFAULT false, -- DPO externe
  external_company_name TEXT,
  external_contact_email TEXT,
  external_contact_phone TEXT,
  appointment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_org ON public.gdpr_consents(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user ON public.gdpr_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_type ON public.gdpr_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_processing_registry_org ON public.gdpr_processing_registry(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_subject_requests_org ON public.gdpr_data_subject_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_subject_requests_user ON public.gdpr_data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_subject_requests_status ON public.gdpr_data_subject_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_breaches_org ON public.gdpr_data_breaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_breaches_severity ON public.gdpr_data_breaches(severity);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_exports_user ON public.gdpr_data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_deletions_user ON public.gdpr_data_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_access_logs_org ON public.gdpr_access_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_access_logs_accessed_user ON public.gdpr_access_logs(accessed_user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_gdpr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_gdpr_consents_updated_at
  BEFORE UPDATE ON public.gdpr_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_processing_registry_updated_at
  BEFORE UPDATE ON public.gdpr_processing_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_data_subject_requests_updated_at
  BEFORE UPDATE ON public.gdpr_data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_data_breaches_updated_at
  BEFORE UPDATE ON public.gdpr_data_breaches
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_privacy_policies_updated_at
  BEFORE UPDATE ON public.gdpr_privacy_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_dpo_updated_at
  BEFORE UPDATE ON public.gdpr_dpo
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

-- Fonction pour vérifier si une violation nécessite une notification
CREATE OR REPLACE FUNCTION check_breach_notification_required()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la violation est de sévérité élevée ou critique, notification requise
  IF NEW.severity IN ('high', 'critical') THEN
    NEW.notification_required := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_breach_notification
  BEFORE INSERT OR UPDATE ON public.gdpr_data_breaches
  FOR EACH ROW
  EXECUTE FUNCTION check_breach_notification_required();

-- RLS Policies
ALTER TABLE public.gdpr_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_processing_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_privacy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_policy_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_dpo ENABLE ROW LEVEL SECURITY;

-- Policies pour gdpr_consents
CREATE POLICY "Users can view their own consents"
  ON public.gdpr_consents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all consents"
  ON public.gdpr_consents FOR SELECT
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

CREATE POLICY "Users can manage their own consents"
  ON public.gdpr_consents FOR ALL
  USING (user_id = auth.uid());

-- Policies similaires pour les autres tables
CREATE POLICY "Admins can manage processing registry"
  ON public.gdpr_processing_registry FOR ALL
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

CREATE POLICY "Users can view their own data requests"
  ON public.gdpr_data_subject_requests FOR SELECT
  USING (user_id = auth.uid() OR requested_by_email = (SELECT email FROM public.users WHERE id = auth.uid()));

-- Commentaires
COMMENT ON TABLE public.gdpr_consents IS 'Consentements RGPD des utilisateurs';
COMMENT ON TABLE public.gdpr_processing_registry IS 'Registre des traitements (Article 30 RGPD)';
COMMENT ON TABLE public.gdpr_data_subject_requests IS 'Demandes des personnes concernées (accès, rectification, effacement, portabilité)';
COMMENT ON TABLE public.gdpr_data_breaches IS 'Violations de données (Article 33-34 RGPD)';
COMMENT ON TABLE public.gdpr_data_exports IS 'Exports de données pour la portabilité';
COMMENT ON TABLE public.gdpr_data_deletions IS 'Suppressions de données (droit à l''oubli)';
COMMENT ON TABLE public.gdpr_access_logs IS 'Logs d''accès aux données personnelles';
COMMENT ON TABLE public.gdpr_privacy_policies IS 'Politiques de confidentialité';
COMMENT ON TABLE public.gdpr_policy_acceptances IS 'Acceptations des politiques de confidentialité';
COMMENT ON TABLE public.gdpr_dpo IS 'Délégués à la protection des données (DPO)';

-- Conformité RGPD complète pour les organismes de formation en France

-- 1. Table des consentements RGPD
CREATE TABLE IF NOT EXISTS public.gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'cookies', 'data_sharing', 'third_party', 'other')),
  purpose TEXT NOT NULL, -- Description de l'utilisation des données
  granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  consent_method VARCHAR(50) CHECK (consent_method IN ('web_form', 'email', 'paper', 'phone', 'api', 'other')),
  version VARCHAR(20), -- Version du formulaire de consentement
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, consent_type)
);

-- 2. Table du registre des traitements (Article 30 RGPD)
CREATE TABLE IF NOT EXISTS public.gdpr_processing_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  processing_name TEXT NOT NULL, -- Nom du traitement
  processing_purpose TEXT NOT NULL, -- Finalité du traitement
  legal_basis VARCHAR(50) NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  data_categories TEXT[] NOT NULL, -- Catégories de données traitées
  data_subjects TEXT[] NOT NULL, -- Catégories de personnes concernées
  recipients TEXT[], -- Destinataires des données
  transfers_outside_eu BOOLEAN DEFAULT false,
  transfers_countries TEXT[], -- Pays de transfert si applicable
  retention_period VARCHAR(100), -- Durée de conservation
  security_measures TEXT[], -- Mesures de sécurité
  data_protection_officer_id UUID REFERENCES public.users(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'deleted')),
  last_review_date DATE,
  next_review_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des demandes de droits RGPD
CREATE TABLE IF NOT EXISTS public.gdpr_data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection', 'withdraw_consent')),
  request_status VARCHAR(50) DEFAULT 'pending' CHECK (request_status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),
  request_date TIMESTAMPTZ DEFAULT NOW(),
  requested_by_name TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  requested_by_phone TEXT,
  identity_verification_method VARCHAR(50) CHECK (identity_verification_method IN ('email', 'id_card', 'phone', 'other')),
  identity_verified BOOLEAN DEFAULT false,
  identity_verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id),
  description TEXT, -- Description de la demande
  response_data JSONB, -- Données retournées (pour access/portability)
  response_file_url TEXT, -- Fichier ZIP avec les données (pour portability)
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des violations de données (Article 33-34 RGPD)
CREATE TABLE IF NOT EXISTS public.gdpr_data_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  breach_type VARCHAR(50) NOT NULL CHECK (breach_type IN ('confidentiality', 'integrity', 'availability')),
  breach_date TIMESTAMPTZ NOT NULL,
  discovery_date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  affected_data_categories TEXT[],
  affected_data_subjects_count INTEGER,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  notification_required BOOLEAN DEFAULT false,
  cnil_notified BOOLEAN DEFAULT false, -- Notification à la CNIL
  cnil_notification_date TIMESTAMPTZ,
  data_subjects_notified BOOLEAN DEFAULT false,
  data_subjects_notification_date TIMESTAMPTZ,
  measures_taken TEXT[], -- Mesures prises pour remédier
  preventive_measures TEXT[], -- Mesures préventives
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'remediated', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.users(id),
  reported_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des exports de données (portabilité)
CREATE TABLE IF NOT EXISTS public.gdpr_data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.gdpr_data_subject_requests(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  export_format VARCHAR(50) DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'xml', 'pdf', 'zip')),
  file_url TEXT NOT NULL,
  file_hash VARCHAR(64), -- Hash pour vérification d'intégrité
  file_size INTEGER,
  data_categories TEXT[] NOT NULL, -- Catégories de données exportées
  expiration_date TIMESTAMPTZ, -- Date d'expiration du lien de téléchargement
  downloaded BOOLEAN DEFAULT false,
  downloaded_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des suppressions de données (droit à l'oubli)
CREATE TABLE IF NOT EXISTS public.gdpr_data_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.gdpr_data_subject_requests(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deletion_type VARCHAR(50) NOT NULL CHECK (deletion_type IN ('full', 'partial', 'anonymization')),
  data_categories TEXT[] NOT NULL, -- Catégories de données supprimées
  deletion_reason TEXT,
  backup_created BOOLEAN DEFAULT false,
  backup_location TEXT,
  deleted_tables TEXT[], -- Tables concernées
  deleted_records_count INTEGER,
  deletion_status VARCHAR(50) DEFAULT 'pending' CHECK (deletion_status IN ('pending', 'in_progress', 'completed', 'failed', 'partially_completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  performed_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des logs d'accès aux données personnelles
CREATE TABLE IF NOT EXISTS public.gdpr_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  accessed_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Utilisateur dont les données ont été consultées
  access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('view', 'edit', 'export', 'delete', 'share')),
  data_category VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  access_reason TEXT,
  authorized_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table des politiques de confidentialité
CREATE TABLE IF NOT EXISTS public.gdpr_privacy_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  language VARCHAR(10) DEFAULT 'fr',
  is_active BOOLEAN DEFAULT true,
  acceptance_required BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, version, language)
);

-- 9. Table des acceptations de politiques de confidentialité
CREATE TABLE IF NOT EXISTS public.gdpr_policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.gdpr_privacy_policies(id) ON DELETE CASCADE,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, policy_id)
);

-- 10. Table des DPO (Data Protection Officers)
CREATE TABLE IF NOT EXISTS public.gdpr_dpo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_external BOOLEAN DEFAULT false, -- DPO externe
  external_company_name TEXT,
  external_contact_email TEXT,
  external_contact_phone TEXT,
  appointment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_org ON public.gdpr_consents(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user ON public.gdpr_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_type ON public.gdpr_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_processing_registry_org ON public.gdpr_processing_registry(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_subject_requests_org ON public.gdpr_data_subject_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_subject_requests_user ON public.gdpr_data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_subject_requests_status ON public.gdpr_data_subject_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_breaches_org ON public.gdpr_data_breaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_breaches_severity ON public.gdpr_data_breaches(severity);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_exports_user ON public.gdpr_data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_data_deletions_user ON public.gdpr_data_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_access_logs_org ON public.gdpr_access_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_access_logs_accessed_user ON public.gdpr_access_logs(accessed_user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_gdpr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_gdpr_consents_updated_at
  BEFORE UPDATE ON public.gdpr_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_processing_registry_updated_at
  BEFORE UPDATE ON public.gdpr_processing_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_data_subject_requests_updated_at
  BEFORE UPDATE ON public.gdpr_data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_data_breaches_updated_at
  BEFORE UPDATE ON public.gdpr_data_breaches
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_privacy_policies_updated_at
  BEFORE UPDATE ON public.gdpr_privacy_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER update_gdpr_dpo_updated_at
  BEFORE UPDATE ON public.gdpr_dpo
  FOR EACH ROW
  EXECUTE FUNCTION update_gdpr_updated_at();

-- Fonction pour vérifier si une violation nécessite une notification
CREATE OR REPLACE FUNCTION check_breach_notification_required()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la violation est de sévérité élevée ou critique, notification requise
  IF NEW.severity IN ('high', 'critical') THEN
    NEW.notification_required := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_breach_notification
  BEFORE INSERT OR UPDATE ON public.gdpr_data_breaches
  FOR EACH ROW
  EXECUTE FUNCTION check_breach_notification_required();

-- RLS Policies
ALTER TABLE public.gdpr_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_processing_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_privacy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_policy_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_dpo ENABLE ROW LEVEL SECURITY;

-- Policies pour gdpr_consents
CREATE POLICY "Users can view their own consents"
  ON public.gdpr_consents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all consents"
  ON public.gdpr_consents FOR SELECT
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

CREATE POLICY "Users can manage their own consents"
  ON public.gdpr_consents FOR ALL
  USING (user_id = auth.uid());

-- Policies similaires pour les autres tables
CREATE POLICY "Admins can manage processing registry"
  ON public.gdpr_processing_registry FOR ALL
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

CREATE POLICY "Users can view their own data requests"
  ON public.gdpr_data_subject_requests FOR SELECT
  USING (user_id = auth.uid() OR requested_by_email = (SELECT email FROM public.users WHERE id = auth.uid()));

-- Commentaires
COMMENT ON TABLE public.gdpr_consents IS 'Consentements RGPD des utilisateurs';
COMMENT ON TABLE public.gdpr_processing_registry IS 'Registre des traitements (Article 30 RGPD)';
COMMENT ON TABLE public.gdpr_data_subject_requests IS 'Demandes des personnes concernées (accès, rectification, effacement, portabilité)';
COMMENT ON TABLE public.gdpr_data_breaches IS 'Violations de données (Article 33-34 RGPD)';
COMMENT ON TABLE public.gdpr_data_exports IS 'Exports de données pour la portabilité';
COMMENT ON TABLE public.gdpr_data_deletions IS 'Suppressions de données (droit à l''oubli)';
COMMENT ON TABLE public.gdpr_access_logs IS 'Logs d''accès aux données personnelles';
COMMENT ON TABLE public.gdpr_privacy_policies IS 'Politiques de confidentialité';
COMMENT ON TABLE public.gdpr_policy_acceptances IS 'Acceptations des politiques de confidentialité';
COMMENT ON TABLE public.gdpr_dpo IS 'Délégués à la protection des données (DPO)';

