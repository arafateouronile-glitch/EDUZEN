-- Migration pour le Portail Auditeur EDUZEN
-- Permet aux auditeurs externes d'accéder aux données Qualiopi via un lien temporaire sécurisé

-- ============================================================================
-- 0. Créer les tables Qualiopi si elles n'existent pas (pour compatibilité)
-- ============================================================================

-- Table qualiopi_indicators
CREATE TABLE IF NOT EXISTS public.qualiopi_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_code VARCHAR(50) NOT NULL,
  indicator_name TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
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

-- Table qualiopi_audits
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

-- Fonction pour mettre à jour updated_at (si elle n'existe pas)
CREATE OR REPLACE FUNCTION update_qualiopi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. Table des liens d'accès auditeur (Liens temporaires sécurisés)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.auditor_access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Token sécurisé pour l'accès (hash SHA-256 stocké)
  token_hash VARCHAR(64) NOT NULL UNIQUE,

  -- Informations sur l'audit
  audit_id UUID REFERENCES public.qualiopi_audits(id) ON DELETE SET NULL,
  auditor_name TEXT NOT NULL,
  auditor_email TEXT,
  auditor_organization TEXT,

  -- Validité du lien
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Traçabilité des accès
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,

  -- Configuration des permissions
  permissions JSONB DEFAULT '{
    "view_indicators": true,
    "view_evidence": true,
    "view_corrective_actions": true,
    "export_pdf": true,
    "sampling_mode": false
  }'::jsonb,

  -- Notes
  notes TEXT
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_auditor_links_org ON public.auditor_access_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_auditor_links_token ON public.auditor_access_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_auditor_links_expires ON public.auditor_access_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_auditor_links_active ON public.auditor_access_links(is_active);

-- ============================================================================
-- 2. Table des preuves automatisées (Compliance Engine)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_evidence_automated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Liaison avec l'indicateur Qualiopi
  indicator_number INTEGER NOT NULL CHECK (indicator_number >= 1 AND indicator_number <= 32),
  indicator_id UUID REFERENCES public.qualiopi_indicators(id) ON DELETE SET NULL,

  -- Type de preuve
  evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN (
    'document', 'event', 'data_point', 'signature', 'attendance',
    'evaluation', 'feedback', 'contract', 'certificate', 'system_generated'
  )),

  -- Source de la preuve
  source VARCHAR(50) NOT NULL CHECK (source IN (
    'system', 'manual_upload', 'integration', 'automated_detection'
  )),

  -- Entité liée (pour l'échantillonnage)
  entity_type VARCHAR(50) CHECK (entity_type IN (
    'session', 'student', 'program', 'teacher', 'document', 'evaluation', 'contract'
  )),
  entity_id UUID,
  entity_name TEXT, -- Nom lisible pour l'affichage (ex: "Session React Avancé")

  -- Détails de la preuve
  title TEXT NOT NULL,
  description TEXT,

  -- Fichier associé (si applicable)
  file_url TEXT,
  file_type VARCHAR(50),

  -- Métadonnées (stocke les détails spécifiques à chaque type de preuve)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Statut et validation
  status VARCHAR(50) DEFAULT 'valid' CHECK (status IN ('valid', 'pending', 'expired', 'invalid')),
  confidence_score INTEGER DEFAULT 100 CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Immuabilité - hash de l'action pour prouver l'intégrité
  action_hash VARCHAR(64),

  -- Timestamps
  event_date TIMESTAMPTZ DEFAULT NOW(), -- Date de l'événement original
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches et l'échantillonnage
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_org ON public.compliance_evidence_automated(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_indicator ON public.compliance_evidence_automated(indicator_number);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_entity ON public.compliance_evidence_automated(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_source ON public.compliance_evidence_automated(source);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_status ON public.compliance_evidence_automated(status);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_date ON public.compliance_evidence_automated(event_date);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_entity_name ON public.compliance_evidence_automated USING gin(to_tsvector('french', entity_name));

-- ============================================================================
-- 3. Table de mapping Action → Indicateur (Configuration du Compliance Engine)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_action_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action dans le système
  action_type VARCHAR(100) NOT NULL UNIQUE,
  action_description TEXT NOT NULL,

  -- Indicateur Qualiopi associé
  indicator_number INTEGER NOT NULL CHECK (indicator_number >= 1 AND indicator_number <= 32),
  indicator_description TEXT,

  -- Type de preuve générée
  evidence_type VARCHAR(50) NOT NULL,
  evidence_title_template TEXT NOT NULL, -- Ex: "Émargement - {session_name} - {date}"

  -- Configuration
  is_active BOOLEAN DEFAULT true,
  auto_detect BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les mappings standard Qualiopi
INSERT INTO public.compliance_action_mapping (action_type, action_description, indicator_number, indicator_description, evidence_type, evidence_title_template) VALUES
  -- Critère 1 : Conditions d'information du public
  ('program_published', 'Publication d''un programme de formation', 1, 'Diffusion publique des prérequis, objectifs et tarifs', 'document', 'Publication programme - {program_name}'),
  ('catalog_updated', 'Mise à jour du catalogue de formations', 1, 'Mise à jour des informations publiques', 'event', 'Mise à jour catalogue - {date}'),

  -- Critère 2 : Identification précise des objectifs
  ('student_needs_analysis', 'Analyse des besoins du stagiaire', 4, 'Analyse du besoin initial avant formation', 'data_point', 'Analyse besoins - {student_name}'),
  ('prerequisites_verified', 'Vérification des prérequis', 5, 'Positionnement à l''entrée en formation', 'evaluation', 'Vérification prérequis - {student_name} - {session_name}'),

  -- Critère 3 : Adaptation aux publics bénéficiaires
  ('personalized_pathway', 'Création d''un parcours personnalisé', 6, 'Adaptation du parcours aux besoins', 'document', 'Parcours personnalisé - {student_name}'),
  ('accessibility_arrangement', 'Aménagement accessibilité mis en place', 7, 'Prise en compte des situations de handicap', 'event', 'Aménagement accessibilité - {student_name}'),

  -- Critère 4 : Adéquation des moyens pédagogiques
  ('convention_signed', 'Signature de la convention de formation', 10, 'Contrat formalisant les modalités', 'contract', 'Convention - {session_name} - {date}'),
  ('attendance_signed', 'Émargement numérique (QR Code)', 11, 'Suivi de l''assiduité et de l''exécution', 'attendance', 'Émargement - {session_name} - {date}'),
  ('convocation_sent', 'Convocation envoyée aux stagiaires', 10, 'Information des stagiaires', 'document', 'Convocation - {session_name}'),

  -- Critère 5 : Qualification des personnels
  ('teacher_assigned', 'Affectation d''un formateur', 17, 'Adéquation des ressources humaines', 'document', 'Affectation formateur - {teacher_name} - {session_name}'),
  ('teacher_cv_uploaded', 'CV/Diplôme du formateur téléversé', 17, 'Qualification du formateur', 'certificate', 'CV/Diplôme - {teacher_name}'),
  ('teacher_training_completed', 'Formation continue du formateur', 19, 'Développement des compétences', 'certificate', 'Formation - {teacher_name} - {training_name}'),

  -- Critère 6 : Inscription dans l'environnement professionnel
  ('partnership_created', 'Partenariat avec une entreprise', 20, 'Inscription environnement professionnel', 'contract', 'Partenariat - {company_name}'),
  ('internship_convention', 'Convention de stage signée', 21, 'Mobilisation des acteurs économiques', 'contract', 'Convention stage - {student_name} - {company_name}'),

  -- Critère 7 : Recueil et prise en compte des appréciations
  ('quiz_completed', 'Quiz de fin de formation', 11, 'Évaluation de l''atteinte des objectifs', 'evaluation', 'Évaluation - {student_name} - {session_name}'),
  ('satisfaction_survey', 'Questionnaire de satisfaction', 30, 'Recueil des appréciations stagiaires', 'feedback', 'Satisfaction - {student_name} - {session_name}'),
  ('improvement_action', 'Action d''amélioration mise en place', 32, 'Mesures d''amélioration', 'event', 'Amélioration - {action_title}')
ON CONFLICT (action_type) DO NOTHING;

-- ============================================================================
-- 4. Table des journaux d'audit (Audit Trail pour les auditeurs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.auditor_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.auditor_access_links(id) ON DELETE CASCADE,

  -- Détails de l'accès
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'page_view', 'indicator_view', 'evidence_view', 'document_download',
    'pdf_export', 'sampling_search', 'session_start', 'session_end'
  )),

  -- Contexte
  indicator_number INTEGER,
  entity_type VARCHAR(50),
  entity_id UUID,
  search_query TEXT,

  -- Métadonnées techniques
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditor_logs_link ON public.auditor_access_logs(link_id);
CREATE INDEX IF NOT EXISTS idx_auditor_logs_action ON public.auditor_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_auditor_logs_date ON public.auditor_access_logs(created_at);

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================
ALTER TABLE public.auditor_access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence_automated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_action_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor_access_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour auditor_access_links
CREATE POLICY "Admins can manage auditor links"
  ON public.auditor_access_links FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policies pour compliance_evidence_automated
CREATE POLICY "Users can view compliance evidence of their organization"
  ON public.compliance_evidence_automated FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert compliance evidence"
  ON public.compliance_evidence_automated FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policies pour compliance_action_mapping (lecture seule pour tous)
CREATE POLICY "Everyone can view action mappings"
  ON public.compliance_action_mapping FOR SELECT
  USING (true);

-- Policies pour auditor_access_logs
CREATE POLICY "Admins can view auditor logs"
  ON public.auditor_access_logs FOR SELECT
  USING (
    link_id IN (
      SELECT al.id FROM public.auditor_access_links al
      WHERE al.organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 6. Fonctions utilitaires
-- ============================================================================

-- Fonction pour compter les preuves par indicateur
CREATE OR REPLACE FUNCTION get_evidence_count_by_indicator(org_id UUID)
RETURNS TABLE(indicator_number INTEGER, evidence_count BIGINT, auto_count BIGINT, manual_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cea.indicator_number,
    COUNT(*) as evidence_count,
    COUNT(*) FILTER (WHERE cea.source = 'system' OR cea.source = 'automated_detection') as auto_count,
    COUNT(*) FILTER (WHERE cea.source = 'manual_upload') as manual_count
  FROM public.compliance_evidence_automated cea
  WHERE cea.organization_id = org_id AND cea.status = 'valid'
  GROUP BY cea.indicator_number
  ORDER BY cea.indicator_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rechercher des preuves par entité (mode échantillonnage)
CREATE OR REPLACE FUNCTION search_evidence_by_sample(
  org_id UUID,
  search_term TEXT
)
RETURNS TABLE(
  id UUID,
  indicator_number INTEGER,
  title TEXT,
  entity_type VARCHAR(50),
  entity_name TEXT,
  evidence_type VARCHAR(50),
  source VARCHAR(50),
  event_date TIMESTAMPTZ,
  file_url TEXT,
  confidence_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cea.id,
    cea.indicator_number,
    cea.title,
    cea.entity_type,
    cea.entity_name,
    cea.evidence_type,
    cea.source,
    cea.event_date,
    cea.file_url,
    cea.confidence_score
  FROM public.compliance_evidence_automated cea
  WHERE cea.organization_id = org_id
    AND cea.status = 'valid'
    AND (
      cea.entity_name ILIKE '%' || search_term || '%'
      OR cea.title ILIKE '%' || search_term || '%'
      OR cea.description ILIKE '%' || search_term || '%'
    )
  ORDER BY cea.event_date DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour updated_at
CREATE TRIGGER update_compliance_evidence_updated_at
  BEFORE UPDATE ON public.compliance_evidence_automated
  FOR EACH ROW
  EXECUTE FUNCTION update_qualiopi_updated_at();

-- ============================================================================
-- 7. Commentaires
-- ============================================================================
COMMENT ON TABLE public.auditor_access_links IS 'Liens temporaires sécurisés pour l''accès auditeur externe';
COMMENT ON TABLE public.compliance_evidence_automated IS 'Preuves de conformité collectées automatiquement par le Compliance Engine';
COMMENT ON TABLE public.compliance_action_mapping IS 'Configuration du mapping Action → Indicateur Qualiopi';
COMMENT ON TABLE public.auditor_access_logs IS 'Journal des accès auditeur pour traçabilité';

COMMENT ON COLUMN public.auditor_access_links.token_hash IS 'Hash SHA-256 du token - le token clair n''est jamais stocké';
COMMENT ON COLUMN public.compliance_evidence_automated.source IS 'system = généré automatiquement, manual_upload = téléversé manuellement';
COMMENT ON COLUMN public.compliance_evidence_automated.confidence_score IS 'Score de confiance: 100 = système EDUZEN, <100 = upload manuel';
COMMENT ON COLUMN public.compliance_evidence_automated.action_hash IS 'Hash de l''action pour garantir l''immuabilité de la preuve';
