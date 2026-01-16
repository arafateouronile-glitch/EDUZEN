-- =====================================================
-- EDUZEN - Module Accessibilité Handicap
-- =====================================================
-- Description: Module complet de gestion de l'accessibilité et du handicap
--              conforme aux exigences Qualiopi (critère 8) et à la réglementation française
-- Date: 2026-01-02
-- Author: EDUZEN Team
-- =====================================================

-- =====================================================
-- 1. TABLE: accessibility_configurations
-- Configuration globale accessibilité par organisation
-- =====================================================

CREATE TABLE IF NOT EXISTS public.accessibility_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Référent handicap
  referent_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  referent_training_date DATE,
  referent_training_certificate TEXT,

  -- Politiques et registres
  accessibility_policy TEXT,
  physical_accessibility_statement TEXT,
  digital_accessibility_statement TEXT,

  -- Partenariats
  partner_agefiph BOOLEAN DEFAULT FALSE,
  partner_cap_emploi BOOLEAN DEFAULT FALSE,
  partner_fiphfp BOOLEAN DEFAULT FALSE,
  partner_other JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.accessibility_configurations IS 'Configuration globale de l''accessibilité par organisation';
COMMENT ON COLUMN public.accessibility_configurations.referent_user_id IS 'Référent handicap désigné (obligatoire Qualiopi)';
COMMENT ON COLUMN public.accessibility_configurations.partner_other IS 'Autres partenaires - format: [{name: string, contact: string}]';

-- =====================================================
-- 2. TABLE: accessibility_disability_types
-- Référentiel des types de handicap (prédéfini)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.accessibility_disability_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.accessibility_disability_types IS 'Référentiel des types de handicap (lecture seule)';

-- Insertion des types de handicap prédéfinis
INSERT INTO public.accessibility_disability_types (code, name_fr, name_en, description, icon, color) VALUES
  ('motor', 'Moteur', 'Motor', 'Handicap physique, mobilité réduite, troubles moteurs', 'Wheelchair', 'blue'),
  ('visual', 'Visuel', 'Visual', 'Déficience visuelle partielle ou totale, cécité', 'Eye', 'purple'),
  ('auditory', 'Auditif', 'Auditory', 'Déficience auditive partielle ou totale, surdité', 'Ear', 'green'),
  ('cognitive', 'Cognitif', 'Cognitive', 'Troubles dys (dyslexie, dyspraxie), déficience intellectuelle', 'Brain', 'orange'),
  ('psychic', 'Psychique', 'Psychic', 'Troubles psychologiques, psychiatriques, anxiété', 'HeartPulse', 'pink'),
  ('chronic_illness', 'Maladies invalidantes', 'Chronic Illness', 'Diabète, épilepsie, maladies chroniques', 'Activity', 'red')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 3. TABLE: accessibility_student_needs
-- Besoins spécifiques déclarés par les stagiaires
-- =====================================================

CREATE TABLE IF NOT EXISTS public.accessibility_student_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,

  -- Déclaration handicap
  has_disability BOOLEAN DEFAULT FALSE,
  disability_type_ids UUID[] DEFAULT '{}',
  disability_description TEXT,

  -- Reconnaissance MDPH
  has_mdph_recognition BOOLEAN DEFAULT FALSE,
  mdph_number VARCHAR(100),
  mdph_expiry_date DATE,

  -- Besoins détaillés
  needs_physical_accommodations BOOLEAN DEFAULT FALSE,
  physical_accommodations_detail TEXT,
  needs_pedagogical_accommodations BOOLEAN DEFAULT FALSE,
  pedagogical_accommodations_detail TEXT,
  needs_exam_accommodations BOOLEAN DEFAULT FALSE,
  exam_accommodations_detail TEXT,
  needs_technical_aids BOOLEAN DEFAULT FALSE,
  technical_aids_detail TEXT,

  -- Référent externe
  external_referent_name VARCHAR(200),
  external_referent_contact VARCHAR(200),

  -- Consentement et traitement
  consent_share_info BOOLEAN DEFAULT FALSE,
  declaration_date DATE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'implemented')),
  reviewed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.accessibility_student_needs IS 'Besoins spécifiques déclarés par les stagiaires (formulaire auto-déclaration)';
COMMENT ON COLUMN public.accessibility_student_needs.disability_type_ids IS 'Array des IDs de types de handicap (référence accessibility_disability_types)';
COMMENT ON COLUMN public.accessibility_student_needs.consent_share_info IS 'Consentement pour partager les informations avec les formateurs';

-- =====================================================
-- 4. TABLE: accessibility_accommodations
-- Aménagements mis en place pour les stagiaires
-- =====================================================

CREATE TABLE IF NOT EXISTS public.accessibility_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_need_id UUID REFERENCES public.accessibility_student_needs(id) ON DELETE SET NULL,

  -- Type et catégorie
  accommodation_type VARCHAR(100) NOT NULL CHECK (accommodation_type IN ('physical', 'pedagogical', 'exam', 'technical', 'schedule')),
  category VARCHAR(100),

  -- Détails
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Période
  start_date DATE,
  end_date DATE,

  -- Statut et suivi
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completion_rate INTEGER DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),

  -- Métadonnées flexibles
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.accessibility_accommodations IS 'Aménagements mis en place pour les stagiaires en situation de handicap';
COMMENT ON COLUMN public.accessibility_accommodations.accommodation_type IS 'Type: physical (physique), pedagogical (pédagogique), exam (examen), technical (aide technique), schedule (emploi du temps)';
COMMENT ON COLUMN public.accessibility_accommodations.completion_rate IS 'Taux de réalisation de l''aménagement (0-100%)';

-- =====================================================
-- 5. TABLE: accessibility_equipment
-- Inventaire des équipements adaptés
-- =====================================================

CREATE TABLE IF NOT EXISTS public.accessibility_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Identification
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) CHECK (category IN ('mobility', 'visual', 'auditory', 'ergonomic', 'software', 'other')),
  description TEXT,

  -- Localisation
  location VARCHAR(200),
  site_id UUID, -- Pour multi-sites (FK future)

  -- Disponibilité
  quantity_total INTEGER NOT NULL DEFAULT 1 CHECK (quantity_total >= 0),
  quantity_available INTEGER NOT NULL DEFAULT 1 CHECK (quantity_available >= 0),
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),

  -- Gestion
  purchase_date DATE,
  warranty_expiry_date DATE,
  maintenance_schedule VARCHAR(100) CHECK (maintenance_schedule IN ('none', 'monthly', 'quarterly', 'biannual', 'annual')),
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  responsible_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Notes et métadonnées
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte: disponible ne peut pas dépasser total
  CONSTRAINT check_quantity CHECK (quantity_available <= quantity_total)
);

COMMENT ON TABLE public.accessibility_equipment IS 'Inventaire des équipements adaptés disponibles pour les stagiaires';
COMMENT ON COLUMN public.accessibility_equipment.category IS 'Catégorie: mobility (mobilité), visual (visuel), auditory (auditif), ergonomic (ergonomique), software (logiciel)';
COMMENT ON COLUMN public.accessibility_equipment.metadata IS 'Caractéristiques techniques flexibles (JSON)';

-- =====================================================
-- 6. TABLE: accessibility_equipment_assignments
-- Attributions d'équipements aux stagiaires
-- =====================================================

CREATE TABLE IF NOT EXISTS public.accessibility_equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.accessibility_equipment(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  accommodation_id UUID REFERENCES public.accessibility_accommodations(id) ON DELETE SET NULL,

  -- Dates
  assigned_date DATE NOT NULL DEFAULT NOW(),
  return_date DATE,
  actual_return_date DATE,

  -- Statut
  status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'returned', 'lost', 'damaged')),

  -- État de l'équipement
  condition_on_assignment VARCHAR(50) CHECK (condition_on_assignment IN ('excellent', 'good', 'fair', 'poor')),
  condition_on_return VARCHAR(50) CHECK (condition_on_return IN ('excellent', 'good', 'fair', 'poor', 'damaged', 'lost')),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.accessibility_equipment_assignments IS 'Attribution des équipements aux stagiaires';
COMMENT ON COLUMN public.accessibility_equipment_assignments.condition_on_assignment IS 'État de l''équipement lors de l''attribution';
COMMENT ON COLUMN public.accessibility_equipment_assignments.condition_on_return IS 'État de l''équipement lors du retour';

-- =====================================================
-- 7. TABLE: accessibility_documents
-- Documents justificatifs handicap
-- =====================================================

CREATE TABLE IF NOT EXISTS public.accessibility_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_need_id UUID REFERENCES public.accessibility_student_needs(id) ON DELETE SET NULL,

  -- Type et métadonnées du document
  document_type VARCHAR(100) CHECK (document_type IN ('mdph_certificate', 'medical_certificate', 'rqth', 'disability_card', 'other')),
  title VARCHAR(200) NOT NULL,

  -- Fichier (Supabase Storage)
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),

  -- Informations document
  issue_date DATE,
  expiry_date DATE,
  issuer VARCHAR(200),
  reference_number VARCHAR(100),

  -- Sécurité et validation
  is_confidential BOOLEAN DEFAULT TRUE,
  uploaded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.accessibility_documents IS 'Documents justificatifs handicap (certificats MDPH, RQTH, etc.)';
COMMENT ON COLUMN public.accessibility_documents.document_type IS 'Type: mdph_certificate, medical_certificate, rqth (reconnaissance travailleur handicapé), disability_card';
COMMENT ON COLUMN public.accessibility_documents.is_confidential IS 'Document confidentiel (accès restreint)';

-- =====================================================
-- 8. TABLE: accessibility_compliance_reports
-- Rapports de conformité accessibilité
-- =====================================================

CREATE TABLE IF NOT EXISTS public.accessibility_compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Identification
  report_type VARCHAR(100) CHECK (report_type IN ('annual', 'audit', 'qualiopi', 'internal')),
  title VARCHAR(200) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Statistiques
  total_students INTEGER DEFAULT 0,
  students_with_disabilities INTEGER DEFAULT 0,
  accommodations_requested INTEGER DEFAULT 0,
  accommodations_implemented INTEGER DEFAULT 0,
  equipment_used INTEGER DEFAULT 0,

  -- Conformité
  referent_training_up_to_date BOOLEAN DEFAULT FALSE,
  physical_accessibility_compliant BOOLEAN DEFAULT FALSE,
  digital_accessibility_compliant BOOLEAN DEFAULT FALSE,
  partner_collaborations INTEGER DEFAULT 0,
  compliance_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (compliance_rate >= 0 AND compliance_rate <= 100),

  -- Constats et recommandations
  findings JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,

  -- Génération
  generated_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.accessibility_compliance_reports IS 'Rapports de conformité accessibilité (annuels, audits Qualiopi, etc.)';
COMMENT ON COLUMN public.accessibility_compliance_reports.findings IS 'Constats détaillés - format: [{category: string, description: string, severity: string}]';
COMMENT ON COLUMN public.accessibility_compliance_reports.recommendations IS 'Recommandations - format: [{title: string, description: string, priority: string}]';

-- =====================================================
-- FONCTIONS SQL
-- =====================================================

-- =====================================================
-- Fonction: calculate_accessibility_compliance_rate
-- Calcule le taux de conformité accessibilité global
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_accessibility_compliance_rate(org_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
  compliance_score DECIMAL(5,2) := 0;
  total_criteria INTEGER := 7;
  met_criteria INTEGER := 0;
  config RECORD;
  stats RECORD;
BEGIN
  -- Récupérer la configuration
  SELECT * INTO config
  FROM public.accessibility_configurations
  WHERE organization_id = org_id;

  -- Si pas de config, retourner 0
  IF config IS NULL THEN
    RETURN 0;
  END IF;

  -- Critère 1: Référent handicap désigné
  IF config.referent_user_id IS NOT NULL THEN
    met_criteria := met_criteria + 1;
  END IF;

  -- Critère 2: Politique d'accessibilité définie
  IF config.accessibility_policy IS NOT NULL AND LENGTH(config.accessibility_policy) > 50 THEN
    met_criteria := met_criteria + 1;
  END IF;

  -- Critère 3: Au moins un partenariat actif
  IF config.partner_agefiph = TRUE OR config.partner_cap_emploi = TRUE OR config.partner_fiphfp = TRUE THEN
    met_criteria := met_criteria + 1;
  END IF;

  -- Critère 4: Registre accessibilité physique
  IF config.physical_accessibility_statement IS NOT NULL AND LENGTH(config.physical_accessibility_statement) > 50 THEN
    met_criteria := met_criteria + 1;
  END IF;

  -- Critère 5: Registre accessibilité numérique
  IF config.digital_accessibility_statement IS NOT NULL AND LENGTH(config.digital_accessibility_statement) > 50 THEN
    met_criteria := met_criteria + 1;
  END IF;

  -- Critère 6: Taux de satisfaction aménagements (>80% des aménagements actifs)
  SELECT
    COUNT(*) FILTER (WHERE status = 'active') as total_active,
    COUNT(*) FILTER (WHERE status = 'active' AND completion_rate >= 80) as satisfactory
  INTO stats
  FROM public.accessibility_accommodations
  WHERE organization_id = org_id;

  IF stats.total_active > 0 AND (stats.satisfactory::DECIMAL / stats.total_active) >= 0.8 THEN
    met_criteria := met_criteria + 1;
  ELSIF stats.total_active = 0 THEN
    -- Si pas d'aménagements, critère neutre (compté comme satisfait)
    met_criteria := met_criteria + 1;
  END IF;

  -- Critère 7: Équipements disponibles et maintenus
  SELECT COUNT(*) INTO stats
  FROM public.accessibility_equipment
  WHERE organization_id = org_id
    AND status IN ('available', 'in_use');

  IF stats.count > 0 THEN
    met_criteria := met_criteria + 1;
  END IF;

  -- Calculer le taux de conformité
  compliance_score := (met_criteria::DECIMAL / total_criteria) * 100;

  RETURN ROUND(compliance_score, 2);
END;
$$;

COMMENT ON FUNCTION calculate_accessibility_compliance_rate IS 'Calcule le taux de conformité accessibilité (0-100%) basé sur 7 critères Qualiopi';

-- =====================================================
-- Fonction: get_student_active_accommodations
-- Retourne les aménagements actifs d'un étudiant
-- =====================================================

CREATE OR REPLACE FUNCTION get_student_active_accommodations(student_id_param UUID)
RETURNS TABLE (
  accommodation_id UUID,
  title VARCHAR(200),
  accommodation_type VARCHAR(100),
  category VARCHAR(100),
  status VARCHAR(50),
  start_date DATE,
  end_date DATE,
  completion_rate INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    title,
    accommodation_type,
    category,
    status,
    start_date,
    end_date,
    completion_rate
  FROM public.accessibility_accommodations
  WHERE student_id = student_id_param
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_student_active_accommodations IS 'Retourne les aménagements actifs et non expirés d''un étudiant';

-- =====================================================
-- Fonction: update_accessibility_updated_at
-- Trigger pour mise à jour automatique de updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_accessibility_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_accessibility_updated_at IS 'Fonction trigger pour mettre à jour automatiquement le champ updated_at';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour accessibility_configurations
CREATE TRIGGER update_accessibility_configurations_updated_at
  BEFORE UPDATE ON public.accessibility_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_accessibility_updated_at();

-- Trigger pour accessibility_student_needs
CREATE TRIGGER update_accessibility_student_needs_updated_at
  BEFORE UPDATE ON public.accessibility_student_needs
  FOR EACH ROW
  EXECUTE FUNCTION update_accessibility_updated_at();

-- Trigger pour accessibility_accommodations
CREATE TRIGGER update_accessibility_accommodations_updated_at
  BEFORE UPDATE ON public.accessibility_accommodations
  FOR EACH ROW
  EXECUTE FUNCTION update_accessibility_updated_at();

-- Trigger pour accessibility_equipment
CREATE TRIGGER update_accessibility_equipment_updated_at
  BEFORE UPDATE ON public.accessibility_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_accessibility_updated_at();

-- Trigger pour accessibility_equipment_assignments
CREATE TRIGGER update_accessibility_equipment_assignments_updated_at
  BEFORE UPDATE ON public.accessibility_equipment_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_accessibility_updated_at();

-- Trigger pour accessibility_documents
CREATE TRIGGER update_accessibility_documents_updated_at
  BEFORE UPDATE ON public.accessibility_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_accessibility_updated_at();

-- =====================================================
-- INDEX DE PERFORMANCE
-- =====================================================

-- Index pour accessibility_configurations
CREATE INDEX IF NOT EXISTS idx_accessibility_configurations_org
  ON public.accessibility_configurations(organization_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_configurations_referent
  ON public.accessibility_configurations(referent_user_id);

-- Index pour accessibility_student_needs
CREATE INDEX IF NOT EXISTS idx_accessibility_needs_student
  ON public.accessibility_student_needs(student_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_needs_org
  ON public.accessibility_student_needs(organization_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_needs_status
  ON public.accessibility_student_needs(status);

-- Index pour accessibility_accommodations
CREATE INDEX IF NOT EXISTS idx_accessibility_accommodations_student
  ON public.accessibility_accommodations(student_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_accommodations_org
  ON public.accessibility_accommodations(organization_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_accommodations_status
  ON public.accessibility_accommodations(status);

CREATE INDEX IF NOT EXISTS idx_accessibility_accommodations_type
  ON public.accessibility_accommodations(accommodation_type);

-- Index pour accessibility_equipment
CREATE INDEX IF NOT EXISTS idx_accessibility_equipment_org
  ON public.accessibility_equipment(organization_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_equipment_status
  ON public.accessibility_equipment(status);

CREATE INDEX IF NOT EXISTS idx_accessibility_equipment_category
  ON public.accessibility_equipment(category);

-- Index pour accessibility_equipment_assignments
CREATE INDEX IF NOT EXISTS idx_accessibility_assignments_equipment
  ON public.accessibility_equipment_assignments(equipment_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_assignments_student
  ON public.accessibility_equipment_assignments(student_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_assignments_org
  ON public.accessibility_equipment_assignments(organization_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_assignments_status
  ON public.accessibility_equipment_assignments(status);

-- Index pour accessibility_documents
CREATE INDEX IF NOT EXISTS idx_accessibility_documents_student
  ON public.accessibility_documents(student_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_documents_org
  ON public.accessibility_documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_documents_type
  ON public.accessibility_documents(document_type);

-- Index pour accessibility_compliance_reports
CREATE INDEX IF NOT EXISTS idx_accessibility_reports_org
  ON public.accessibility_compliance_reports(organization_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_reports_type
  ON public.accessibility_compliance_reports(report_type);

CREATE INDEX IF NOT EXISTS idx_accessibility_reports_period
  ON public.accessibility_compliance_reports(period_start, period_end);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.accessibility_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_disability_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_student_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_compliance_reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies pour accessibility_configurations
-- =====================================================

CREATE POLICY "Users can view configuration of their organization"
  ON public.accessibility_configurations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and referent can manage configuration"
  ON public.accessibility_configurations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND (
      -- Admins
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'admin')
      )
      -- Ou référent handicap
      OR referent_user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS Policies pour accessibility_disability_types
-- =====================================================

-- Lecture seule pour tous (table de référence)
CREATE POLICY "Anyone can view disability types"
  ON public.accessibility_disability_types FOR SELECT
  USING (true);

-- =====================================================
-- RLS Policies pour accessibility_student_needs
-- =====================================================

CREATE POLICY "Users can view student needs of their organization"
  ON public.accessibility_student_needs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Students can view and update their own needs"
  ON public.accessibility_student_needs FOR ALL
  USING (
    student_id = ((current_setting('request.headers', true)::json->>'x-learner-student-id')::uuid)
  );

CREATE POLICY "Admins and referent can manage student needs"
  ON public.accessibility_student_needs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.accessibility_configurations
        WHERE organization_id = accessibility_student_needs.organization_id
        AND referent_user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- RLS Policies pour accessibility_accommodations
-- =====================================================

CREATE POLICY "Users can view accommodations of their organization"
  ON public.accessibility_accommodations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and referent can manage accommodations"
  ON public.accessibility_accommodations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.accessibility_configurations
        WHERE organization_id = accessibility_accommodations.organization_id
        AND referent_user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- RLS Policies pour accessibility_equipment
-- =====================================================

CREATE POLICY "Users can view equipment of their organization"
  ON public.accessibility_equipment FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and referent can manage equipment"
  ON public.accessibility_equipment FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.accessibility_configurations
        WHERE organization_id = accessibility_equipment.organization_id
        AND referent_user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- RLS Policies pour accessibility_equipment_assignments
-- =====================================================

CREATE POLICY "Users can view assignments of their organization"
  ON public.accessibility_equipment_assignments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and referent can manage assignments"
  ON public.accessibility_equipment_assignments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.accessibility_configurations
        WHERE organization_id = accessibility_equipment_assignments.organization_id
        AND referent_user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- RLS Policies pour accessibility_documents
-- =====================================================

-- Documents confidentiels: accès restreint
CREATE POLICY "Admins and referent can view all documents"
  ON public.accessibility_documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND (
      is_confidential = FALSE
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.accessibility_configurations
        WHERE organization_id = accessibility_documents.organization_id
        AND referent_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Students can view their own documents"
  ON public.accessibility_documents FOR SELECT
  USING (
    student_id = ((current_setting('request.headers', true)::json->>'x-learner-student-id')::uuid)
  );

CREATE POLICY "Admins and referent can manage documents"
  ON public.accessibility_documents FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.accessibility_configurations
        WHERE organization_id = accessibility_documents.organization_id
        AND referent_user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- RLS Policies pour accessibility_compliance_reports
-- =====================================================

CREATE POLICY "Users can view reports of their organization"
  ON public.accessibility_compliance_reports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage reports"
  ON public.accessibility_compliance_reports FOR ALL
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

-- =====================================================
-- GRANTS
-- =====================================================

-- Grants pour utilisateurs authentifiés
GRANT SELECT ON public.accessibility_configurations TO authenticated;
GRANT SELECT ON public.accessibility_disability_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.accessibility_student_needs TO authenticated;
GRANT SELECT ON public.accessibility_accommodations TO authenticated;
GRANT SELECT ON public.accessibility_equipment TO authenticated;
GRANT SELECT ON public.accessibility_equipment_assignments TO authenticated;
GRANT SELECT ON public.accessibility_documents TO authenticated;
GRANT SELECT ON public.accessibility_compliance_reports TO authenticated;

-- Grants pour fonctions
GRANT EXECUTE ON FUNCTION calculate_accessibility_compliance_rate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_active_accommodations(UUID) TO authenticated;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Module Accessibilité Handicap créé avec succès !';
  RAISE NOTICE '8 tables créées: configurations, disability_types, student_needs, accommodations, equipment, equipment_assignments, documents, compliance_reports';
  RAISE NOTICE '3 fonctions SQL créées: calculate_accessibility_compliance_rate, get_student_active_accommodations, update_accessibility_updated_at';
  RAISE NOTICE '6 types de handicap insérés';
  RAISE NOTICE 'RLS activé sur toutes les tables avec policies appropriées';
END $$;
