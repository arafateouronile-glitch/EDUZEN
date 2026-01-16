-- Migration: Création du modèle de livret d'apprentissage par défaut
-- Date: 2024-12-22
-- Description: Insère un modèle complet de livret d'apprentissage basé sur les standards français

-- Créer la table learning_portfolio_templates si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.learning_portfolio_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  header_logo_url TEXT,
  primary_color TEXT DEFAULT '#335ACF',
  secondary_color TEXT DEFAULT '#34B9EE',
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table learning_portfolios si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.learning_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.learning_portfolio_templates(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  content JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'validated')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_visible_to_student BOOLEAN DEFAULT false,
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  teacher_notes TEXT,
  student_comments TEXT,
  last_modified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table learning_portfolio_entries si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.learning_portfolio_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.learning_portfolios(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  value JSONB,
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  grade TEXT,
  teacher_comment TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  evaluated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(portfolio_id, section_id, field_id)
);

-- Créer la table learning_portfolio_signatures si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.learning_portfolio_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.learning_portfolios(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('student', 'teacher', 'tutor', 'company_tutor', 'admin')),
  signer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  signer_name TEXT NOT NULL,
  signer_role TEXT,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_portfolio_templates_org ON public.learning_portfolio_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_org ON public.learning_portfolios(organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_student ON public.learning_portfolios(student_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_session ON public.learning_portfolios(session_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_template ON public.learning_portfolios(template_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_portfolio ON public.learning_portfolio_entries(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_signatures_portfolio ON public.learning_portfolio_signatures(portfolio_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_portfolio_templates_updated_at ON public.learning_portfolio_templates;
CREATE TRIGGER update_portfolio_templates_updated_at
  BEFORE UPDATE ON public.learning_portfolio_templates
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

DROP TRIGGER IF EXISTS update_portfolios_updated_at ON public.learning_portfolios;
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.learning_portfolios
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

DROP TRIGGER IF EXISTS update_portfolio_entries_updated_at ON public.learning_portfolio_entries;
CREATE TRIGGER update_portfolio_entries_updated_at
  BEFORE UPDATE ON public.learning_portfolio_entries
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

-- RLS Policies
ALTER TABLE public.learning_portfolio_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_portfolio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_portfolio_signatures ENABLE ROW LEVEL SECURITY;

-- Policies pour learning_portfolio_templates
DROP POLICY IF EXISTS "Templates lisibles par l'organisation" ON public.learning_portfolio_templates;
CREATE POLICY "Templates lisibles par l'organisation" ON public.learning_portfolio_templates
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR organization_id IS NULL -- Templates système
  );

DROP POLICY IF EXISTS "Templates modifiables par admin/teacher" ON public.learning_portfolio_templates;
CREATE POLICY "Templates modifiables par admin/teacher" ON public.learning_portfolio_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Policies pour learning_portfolios
DROP POLICY IF EXISTS "Portfolios lisibles par l'organisation" ON public.learning_portfolios;
CREATE POLICY "Portfolios lisibles par l'organisation" ON public.learning_portfolios
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Portfolios modifiables par admin/teacher" ON public.learning_portfolios;
CREATE POLICY "Portfolios modifiables par admin/teacher" ON public.learning_portfolios
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Policies pour learning_portfolio_entries
DROP POLICY IF EXISTS "Entries lisibles via portfolio" ON public.learning_portfolio_entries;
CREATE POLICY "Entries lisibles via portfolio" ON public.learning_portfolio_entries
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM public.learning_portfolios 
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      OR student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Entries modifiables via portfolio" ON public.learning_portfolio_entries;
CREATE POLICY "Entries modifiables via portfolio" ON public.learning_portfolio_entries
  FOR ALL USING (
    portfolio_id IN (
      SELECT id FROM public.learning_portfolios 
      WHERE organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'teacher')
      )
    )
  );

-- Policies pour learning_portfolio_signatures
DROP POLICY IF EXISTS "Signatures lisibles via portfolio" ON public.learning_portfolio_signatures;
CREATE POLICY "Signatures lisibles via portfolio" ON public.learning_portfolio_signatures
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM public.learning_portfolios 
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      OR student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Signatures ajoutables par utilisateur authentifié" ON public.learning_portfolio_signatures;
CREATE POLICY "Signatures ajoutables par utilisateur authentifié" ON public.learning_portfolio_signatures
  FOR INSERT WITH CHECK (
    portfolio_id IN (
      SELECT id FROM public.learning_portfolios 
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      OR student_id = auth.uid()
    )
  );

-- ===============================================
-- MODÈLE PAR DÉFAUT - LIVRET D'APPRENTISSAGE
-- ===============================================
-- Note: Ce modèle sera inséré sans organization_id pour être disponible comme modèle système
-- Chaque organisation peut le dupliquer et le personnaliser

-- Insérer le modèle par défaut seulement s'il n'existe pas déjà
DO $$
DECLARE
  default_template_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.learning_portfolio_templates 
    WHERE name = 'Livret d''apprentissage - Modèle standard' 
    AND organization_id IS NULL
  ) INTO default_template_exists;
  
  IF NOT default_template_exists THEN
    INSERT INTO public.learning_portfolio_templates (
      organization_id,
      name,
      description,
      is_default,
      is_active,
      primary_color,
      secondary_color,
      template_structure
    ) VALUES (
      NULL, -- Modèle système disponible pour toutes les organisations
      'Livret d''apprentissage - Modèle standard',
      'Modèle complet de livret d''apprentissage conforme aux exigences de la formation professionnelle en France. Inclut : identification de l''apprenant, suivi des périodes en entreprise, référentiel de compétences, bilans intermédiaires et final, signatures.',
      true,
      true,
      '#1E3A8A', -- Bleu professionnel
      '#3B82F6', -- Bleu clair
      '[
        {
          "id": "page_garde",
          "title": "Page de garde",
          "description": "Informations générales sur le livret",
          "icon": "file-text",
          "fields": [
            {"id": "formation_title", "label": "Intitulé de la formation", "type": "text", "required": true, "placeholder": "Ex: CAP Menuisier"},
            {"id": "formation_code", "label": "Code formation / RNCP", "type": "text", "required": false, "placeholder": "Ex: RNCP34567"},
            {"id": "formation_duration", "label": "Durée totale de la formation", "type": "text", "required": true, "placeholder": "Ex: 1200 heures"},
            {"id": "training_period_start", "label": "Date de début de formation", "type": "date", "required": true},
            {"id": "training_period_end", "label": "Date de fin de formation", "type": "date", "required": true}
          ]
        },
        {
          "id": "identification_apprenant",
          "title": "Identification de l''apprenant",
          "description": "Coordonnées et informations personnelles de l''apprenant",
          "icon": "user",
          "fields": [
            {"id": "learner_civility", "label": "Civilité", "type": "select", "required": true, "options": ["M.", "Mme", "Autre"]},
            {"id": "learner_last_name", "label": "Nom de famille", "type": "text", "required": true},
            {"id": "learner_first_name", "label": "Prénom", "type": "text", "required": true},
            {"id": "learner_birth_date", "label": "Date de naissance", "type": "date", "required": true},
            {"id": "learner_birth_place", "label": "Lieu de naissance", "type": "text", "required": false},
            {"id": "learner_address", "label": "Adresse", "type": "textarea", "required": false, "placeholder": "Adresse complète"},
            {"id": "learner_phone", "label": "Téléphone", "type": "text", "required": false},
            {"id": "learner_email", "label": "Email", "type": "text", "required": false},
            {"id": "learner_photo", "label": "Photo d''identité", "type": "file", "required": false}
          ]
        },
        {
          "id": "organisme_formation",
          "title": "Organisme de formation",
          "description": "Informations sur l''organisme de formation (CFA / OF)",
          "icon": "building",
          "fields": [
            {"id": "of_name", "label": "Nom de l''organisme", "type": "text", "required": true},
            {"id": "of_address", "label": "Adresse", "type": "textarea", "required": false},
            {"id": "of_phone", "label": "Téléphone", "type": "text", "required": false},
            {"id": "of_email", "label": "Email", "type": "text", "required": false},
            {"id": "of_siret", "label": "N° SIRET", "type": "text", "required": false},
            {"id": "of_nda", "label": "N° de déclaration d''activité", "type": "text", "required": false},
            {"id": "referent_pedagogique", "label": "Référent pédagogique", "type": "text", "required": true},
            {"id": "referent_phone", "label": "Téléphone du référent", "type": "text", "required": false},
            {"id": "referent_email", "label": "Email du référent", "type": "text", "required": false}
          ]
        },
        {
          "id": "entreprise_accueil",
          "title": "Entreprise d''accueil",
          "description": "Informations sur l''entreprise d''accueil pour l''alternance",
          "icon": "briefcase",
          "fields": [
            {"id": "company_name", "label": "Raison sociale", "type": "text", "required": true},
            {"id": "company_address", "label": "Adresse", "type": "textarea", "required": false},
            {"id": "company_phone", "label": "Téléphone", "type": "text", "required": false},
            {"id": "company_email", "label": "Email", "type": "text", "required": false},
            {"id": "company_siret", "label": "N° SIRET", "type": "text", "required": false},
            {"id": "company_activity", "label": "Activité principale", "type": "text", "required": false},
            {"id": "company_size", "label": "Effectif", "type": "select", "required": false, "options": ["1-10", "11-50", "51-250", "251-500", "500+"]},
            {"id": "tutor_name", "label": "Maître d''apprentissage / Tuteur", "type": "text", "required": true},
            {"id": "tutor_function", "label": "Fonction du tuteur", "type": "text", "required": false},
            {"id": "tutor_phone", "label": "Téléphone du tuteur", "type": "text", "required": false},
            {"id": "tutor_email", "label": "Email du tuteur", "type": "text", "required": false}
          ]
        },
        {
          "id": "calendrier_alternance",
          "title": "Calendrier de l''alternance",
          "description": "Planning des périodes en entreprise et en formation",
          "icon": "calendar",
          "fields": [
            {"id": "alternance_rhythm", "label": "Rythme de l''alternance", "type": "text", "required": true, "placeholder": "Ex: 2 semaines entreprise / 1 semaine CFA"},
            {"id": "total_hours_company", "label": "Heures totales en entreprise", "type": "number", "required": false, "min": 0},
            {"id": "total_hours_training", "label": "Heures totales en formation", "type": "number", "required": false, "min": 0},
            {"id": "calendar_notes", "label": "Remarques sur le calendrier", "type": "textarea", "required": false}
          ]
        },
        {
          "id": "objectifs_formation",
          "title": "Objectifs de la formation",
          "description": "Objectifs pédagogiques et professionnels visés",
          "icon": "target",
          "fields": [
            {"id": "main_objectives", "label": "Objectifs principaux de la formation", "type": "textarea", "required": true, "placeholder": "Décrire les objectifs généraux..."},
            {"id": "professional_profile", "label": "Profil professionnel visé", "type": "textarea", "required": false, "placeholder": "Métiers / fonctions visés..."},
            {"id": "specific_objectives", "label": "Objectifs spécifiques", "type": "textarea", "required": false}
          ]
        },
        {
          "id": "referentiel_competences",
          "title": "Référentiel de compétences",
          "description": "Blocs de compétences et capacités à acquérir",
          "icon": "book-open",
          "fields": [
            {"id": "bloc1_title", "label": "Bloc 1 - Intitulé", "type": "text", "required": true, "placeholder": "Ex: Préparation et organisation du chantier"},
            {"id": "bloc1_c1", "label": "Bloc 1 - Compétence 1", "type": "competency", "required": true, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc1_c2", "label": "Bloc 1 - Compétence 2", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc1_c3", "label": "Bloc 1 - Compétence 3", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc1_c4", "label": "Bloc 1 - Compétence 4", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc2_title", "label": "Bloc 2 - Intitulé", "type": "text", "required": false, "placeholder": "Ex: Réalisation des travaux"},
            {"id": "bloc2_c1", "label": "Bloc 2 - Compétence 1", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc2_c2", "label": "Bloc 2 - Compétence 2", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc2_c3", "label": "Bloc 2 - Compétence 3", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc2_c4", "label": "Bloc 2 - Compétence 4", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc3_title", "label": "Bloc 3 - Intitulé", "type": "text", "required": false, "placeholder": "Ex: Contrôle et suivi de la qualité"},
            {"id": "bloc3_c1", "label": "Bloc 3 - Compétence 1", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc3_c2", "label": "Bloc 3 - Compétence 2", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc3_c3", "label": "Bloc 3 - Compétence 3", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]},
            {"id": "bloc3_c4", "label": "Bloc 3 - Compétence 4", "type": "competency", "required": false, "competencyLevels": ["Non évalué", "Non acquis", "En cours", "Acquis", "Maîtrisé"]}
          ]
        },
        {
          "id": "suivi_periodes_entreprise",
          "title": "Suivi des périodes en entreprise",
          "description": "Bilans des périodes réalisées en entreprise",
          "icon": "clipboard-list",
          "fields": [
            {"id": "period1_dates", "label": "Période 1 - Dates", "type": "text", "required": false, "placeholder": "Du ... au ..."},
            {"id": "period1_tasks", "label": "Période 1 - Activités réalisées", "type": "textarea", "required": false},
            {"id": "period1_evaluation", "label": "Période 1 - Évaluation tuteur", "type": "rating", "required": false, "min": 1, "max": 5},
            {"id": "period1_comments", "label": "Période 1 - Observations", "type": "textarea", "required": false},
            {"id": "period2_dates", "label": "Période 2 - Dates", "type": "text", "required": false, "placeholder": "Du ... au ..."},
            {"id": "period2_tasks", "label": "Période 2 - Activités réalisées", "type": "textarea", "required": false},
            {"id": "period2_evaluation", "label": "Période 2 - Évaluation tuteur", "type": "rating", "required": false, "min": 1, "max": 5},
            {"id": "period2_comments", "label": "Période 2 - Observations", "type": "textarea", "required": false},
            {"id": "period3_dates", "label": "Période 3 - Dates", "type": "text", "required": false, "placeholder": "Du ... au ..."},
            {"id": "period3_tasks", "label": "Période 3 - Activités réalisées", "type": "textarea", "required": false},
            {"id": "period3_evaluation", "label": "Période 3 - Évaluation tuteur", "type": "rating", "required": false, "min": 1, "max": 5},
            {"id": "period3_comments", "label": "Période 3 - Observations", "type": "textarea", "required": false}
          ]
        },
        {
          "id": "bilans_intermediaires",
          "title": "Bilans intermédiaires",
          "description": "Points d''étape avec l''apprenant, le tuteur et le formateur",
          "icon": "users",
          "fields": [
            {"id": "bilan1_date", "label": "Bilan 1 - Date", "type": "date", "required": false},
            {"id": "bilan1_progress", "label": "Bilan 1 - Progression globale", "type": "rating", "required": false, "min": 1, "max": 5},
            {"id": "bilan1_strong_points", "label": "Bilan 1 - Points forts", "type": "textarea", "required": false},
            {"id": "bilan1_improvements", "label": "Bilan 1 - Axes d''amélioration", "type": "textarea", "required": false},
            {"id": "bilan1_objectives", "label": "Bilan 1 - Objectifs pour la prochaine période", "type": "textarea", "required": false},
            {"id": "bilan2_date", "label": "Bilan 2 - Date", "type": "date", "required": false},
            {"id": "bilan2_progress", "label": "Bilan 2 - Progression globale", "type": "rating", "required": false, "min": 1, "max": 5},
            {"id": "bilan2_strong_points", "label": "Bilan 2 - Points forts", "type": "textarea", "required": false},
            {"id": "bilan2_improvements", "label": "Bilan 2 - Axes d''amélioration", "type": "textarea", "required": false},
            {"id": "bilan2_objectives", "label": "Bilan 2 - Objectifs pour la prochaine période", "type": "textarea", "required": false},
            {"id": "bilan3_date", "label": "Bilan 3 - Date", "type": "date", "required": false},
            {"id": "bilan3_progress", "label": "Bilan 3 - Progression globale", "type": "rating", "required": false, "min": 1, "max": 5},
            {"id": "bilan3_strong_points", "label": "Bilan 3 - Points forts", "type": "textarea", "required": false},
            {"id": "bilan3_improvements", "label": "Bilan 3 - Axes d''amélioration", "type": "textarea", "required": false},
            {"id": "bilan3_objectives", "label": "Bilan 3 - Objectifs finaux", "type": "textarea", "required": false}
          ]
        },
        {
          "id": "competences_transversales",
          "title": "Compétences transversales",
          "description": "Savoir-être et compétences transférables",
          "icon": "star",
          "fields": [
            {"id": "punctuality", "label": "Ponctualité / Assiduité", "type": "competency", "required": false, "competencyLevels": ["Insuffisant", "À améliorer", "Satisfaisant", "Très bien", "Excellent"]},
            {"id": "autonomy", "label": "Autonomie", "type": "competency", "required": false, "competencyLevels": ["Insuffisant", "À améliorer", "Satisfaisant", "Très bien", "Excellent"]},
            {"id": "initiative", "label": "Prise d''initiative", "type": "competency", "required": false, "competencyLevels": ["Insuffisant", "À améliorer", "Satisfaisant", "Très bien", "Excellent"]},
            {"id": "teamwork", "label": "Travail en équipe", "type": "competency", "required": false, "competencyLevels": ["Insuffisant", "À améliorer", "Satisfaisant", "Très bien", "Excellent"]},
            {"id": "communication", "label": "Communication", "type": "competency", "required": false, "competencyLevels": ["Insuffisant", "À améliorer", "Satisfaisant", "Très bien", "Excellent"]},
            {"id": "adaptability", "label": "Adaptabilité", "type": "competency", "required": false, "competencyLevels": ["Insuffisant", "À améliorer", "Satisfaisant", "Très bien", "Excellent"]},
            {"id": "safety_rules", "label": "Respect des règles de sécurité", "type": "competency", "required": false, "competencyLevels": ["Insuffisant", "À améliorer", "Satisfaisant", "Très bien", "Excellent"]},
            {"id": "professionalism", "label": "Professionnalisme", "type": "competency", "required": false, "competencyLevels": ["Insuffisant", "À améliorer", "Satisfaisant", "Très bien", "Excellent"]}
          ]
        },
        {
          "id": "evaluations_centre",
          "title": "Évaluations en centre de formation",
          "description": "Résultats des évaluations réalisées au CFA / OF",
          "icon": "file-check",
          "fields": [
            {"id": "eval_general_knowledge", "label": "Enseignement général", "type": "rating", "required": false, "min": 0, "max": 20},
            {"id": "eval_professional", "label": "Enseignement professionnel", "type": "rating", "required": false, "min": 0, "max": 20},
            {"id": "eval_practical", "label": "Travaux pratiques", "type": "rating", "required": false, "min": 0, "max": 20},
            {"id": "eval_project", "label": "Projet / Chef-d''œuvre", "type": "rating", "required": false, "min": 0, "max": 20},
            {"id": "eval_average", "label": "Moyenne générale", "type": "number", "required": false, "min": 0, "max": 20},
            {"id": "eval_comments", "label": "Appréciations du conseil pédagogique", "type": "textarea", "required": false}
          ]
        },
        {
          "id": "bilan_final",
          "title": "Bilan final de la formation",
          "description": "Synthèse et conclusion de la formation",
          "icon": "award",
          "fields": [
            {"id": "final_overall_assessment", "label": "Appréciation globale", "type": "textarea", "required": true, "placeholder": "Synthèse de la formation..."},
            {"id": "final_skills_acquired", "label": "Compétences acquises", "type": "textarea", "required": false},
            {"id": "final_skills_to_develop", "label": "Compétences à approfondir", "type": "textarea", "required": false},
            {"id": "final_overall_rating", "label": "Évaluation finale globale", "type": "rating", "required": false, "min": 1, "max": 5},
            {"id": "final_recommendation", "label": "Recommandation de poursuite", "type": "textarea", "required": false, "placeholder": "Recommandations pour la suite..."},
            {"id": "training_result", "label": "Résultat de la formation", "type": "select", "required": true, "options": ["Formation validée", "Formation partiellement validée", "Formation non validée", "Abandon"]},
            {"id": "certification_obtained", "label": "Certification / Diplôme obtenu", "type": "checkbox", "required": false},
            {"id": "certification_date", "label": "Date d''obtention", "type": "date", "required": false}
          ]
        },
        {
          "id": "attestations_documents",
          "title": "Attestations et documents",
          "description": "Documents annexes (habilitations, attestations, etc.)",
          "icon": "folder",
          "fields": [
            {"id": "sst_certificate", "label": "Attestation SST (Sauveteur Secouriste du Travail)", "type": "checkbox", "required": false},
            {"id": "sst_date", "label": "Date d''obtention SST", "type": "date", "required": false},
            {"id": "habilitation_electrique", "label": "Habilitation électrique", "type": "text", "required": false, "placeholder": "Ex: B1V, BR..."},
            {"id": "habilitation_date", "label": "Date d''obtention habilitation", "type": "date", "required": false},
            {"id": "caces", "label": "CACES obtenu(s)", "type": "text", "required": false, "placeholder": "Ex: R489 cat. 3"},
            {"id": "caces_date", "label": "Date d''obtention CACES", "type": "date", "required": false},
            {"id": "other_certifications", "label": "Autres certifications / attestations", "type": "textarea", "required": false},
            {"id": "attached_documents", "label": "Documents joints", "type": "file", "required": false}
          ]
        },
        {
          "id": "signatures",
          "title": "Signatures",
          "description": "Validation par les différentes parties",
          "icon": "pen-tool",
          "fields": [
            {"id": "learner_signature_date", "label": "Date de signature apprenant", "type": "date", "required": false},
            {"id": "learner_signature_comment", "label": "Observations de l''apprenant", "type": "textarea", "required": false},
            {"id": "tutor_signature_date", "label": "Date de signature tuteur entreprise", "type": "date", "required": false},
            {"id": "tutor_signature_comment", "label": "Observations du tuteur", "type": "textarea", "required": false},
            {"id": "trainer_signature_date", "label": "Date de signature formateur", "type": "date", "required": false},
            {"id": "trainer_signature_comment", "label": "Observations du formateur", "type": "textarea", "required": false},
            {"id": "manager_signature_date", "label": "Date de signature responsable formation", "type": "date", "required": false},
            {"id": "manager_signature_comment", "label": "Observations du responsable", "type": "textarea", "required": false}
          ]
        }
      ]'::jsonb
    );
    
    RAISE NOTICE 'Modèle de livret d''apprentissage par défaut créé avec succès.';
  ELSE
    RAISE NOTICE 'Le modèle de livret d''apprentissage par défaut existe déjà.';
  END IF;
END $$;

-- Commenter la migration
COMMENT ON TABLE public.learning_portfolio_templates IS 'Modèles de livrets d''apprentissage personnalisables';
COMMENT ON TABLE public.learning_portfolios IS 'Livrets d''apprentissage des apprenants';
COMMENT ON TABLE public.learning_portfolio_entries IS 'Entrées des livrets d''apprentissage (évaluations, notes, etc.)';
COMMENT ON TABLE public.learning_portfolio_signatures IS 'Signatures des livrets d''apprentissage';



