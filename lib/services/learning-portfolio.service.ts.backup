import { createClient } from '@/lib/supabase/client'

// Types pour les livrets d'apprentissage
export interface TemplateField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date' | 'file' | 'rating' | 'competency'
  required: boolean
  placeholder?: string
  options?: string[] // Pour select
  min?: number // Pour number/rating
  max?: number
  description?: string
  competencyLevels?: string[] // Pour competency: ['Non acquis', 'En cours', 'Acquis', 'Maîtrisé']
}

export interface TemplateSection {
  id: string
  title: string
  description?: string
  icon?: string
  fields: TemplateField[]
}

export interface LearningPortfolioTemplate {
  id: string
  organization_id: string
  name: string
  description?: string
  template_structure: TemplateSection[]
  version: number
  is_active: boolean
  is_default: boolean
  header_logo_url?: string
  primary_color: string
  secondary_color: string
  formation_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface LearningPortfolio {
  id: string
  organization_id: string
  template_id: string
  student_id: string
  session_id?: string
  content: Record<string, any>
  status: 'draft' | 'in_progress' | 'completed' | 'validated'
  progress_percentage: number
  started_at?: string
  completed_at?: string
  validated_at?: string
  validated_by?: string
  is_visible_to_student: boolean
  pdf_url?: string
  pdf_generated_at?: string
  teacher_notes?: string
  student_comments?: string
  last_modified_by?: string
  created_at: string
  updated_at: string
  // Relations
  template?: LearningPortfolioTemplate
  student?: any
  session?: any
}

export interface PortfolioEntry {
  id: string
  portfolio_id: string
  section_id: string
  field_id: string
  value: any
  score?: number
  max_score?: number
  grade?: string
  teacher_comment?: string
  attachments: Array<{ url: string; name: string; type: string; size: number }>
  evaluated_by?: string
  evaluated_at?: string
  created_at: string
  updated_at: string
}

class LearningPortfolioService {
  private supabase = createClient()

  // =====================================================
  // Templates
  // =====================================================

  async getTemplates(organizationId: string): Promise<LearningPortfolioTemplate[]> {
    // Récupérer les templates de l'organisation ET les modèles système (organization_id IS NULL)
    const { data, error } = await this.supabase
      .from('learning_portfolio_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération templates:', error)
      return []
    }
    return data || []
  }

  async getTemplateById(id: string): Promise<LearningPortfolioTemplate | null> {
    const { data, error } = await this.supabase
      .from('learning_portfolio_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erreur récupération template:', error)
      return null
    }
    return data
  }

  async createTemplate(template: Partial<LearningPortfolioTemplate>): Promise<LearningPortfolioTemplate | null> {
    const { data, error } = await this.supabase
      .from('learning_portfolio_templates')
      .insert(template)
      .select()
      .single()

    if (error) {
      console.error('Erreur création template:', error)
      throw error
    }
    return data
  }

  async updateTemplate(id: string, updates: Partial<LearningPortfolioTemplate>): Promise<LearningPortfolioTemplate | null> {
    const { data, error } = await this.supabase
      .from('learning_portfolio_templates')
      .update({ ...updates, version: updates.version ? updates.version + 1 : 1 })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour template:', error)
      throw error
    }
    return data
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('learning_portfolio_templates')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Erreur suppression template:', error)
      return false
    }
    return true
  }

  // =====================================================
  // Portfolios
  // =====================================================

  async getPortfolios(organizationId: string, filters?: {
    studentId?: string
    sessionId?: string
    status?: string
    templateId?: string
  }): Promise<LearningPortfolio[]> {
    let query = this.supabase
      .from('learning_portfolios')
      .select(`
        *,
        template:learning_portfolio_templates(*),
        student:students(id, first_name, last_name, email, photo_url),
        session:sessions(id, name, start_date, end_date)
      `)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }
    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.templateId) {
      query = query.eq('template_id', filters.templateId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erreur récupération portfolios:', error)
      return []
    }
    return data || []
  }

  async getPortfolioById(id: string): Promise<LearningPortfolio | null> {
    const { data, error } = await this.supabase
      .from('learning_portfolios')
      .select(`
        *,
        template:learning_portfolio_templates(*),
        student:students(id, first_name, last_name, email, photo_url, phone),
        session:sessions(id, name, start_date, end_date, formations(id, title))
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erreur récupération portfolio:', error)
      return null
    }
    return data
  }

  async getStudentPortfolios(studentId: string): Promise<LearningPortfolio[]> {
    const { data, error } = await this.supabase
      .from('learning_portfolios')
      .select(`
        *,
        template:learning_portfolio_templates(id, name, description, primary_color),
        session:sessions(id, name, formations(id, title))
      `)
      .eq('student_id', studentId)
      .eq('is_visible_to_student', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération portfolios étudiant:', error)
      return []
    }
    return data || []
  }

  async createPortfolio(portfolio: Partial<LearningPortfolio>): Promise<LearningPortfolio | null> {
    const { data, error } = await this.supabase
      .from('learning_portfolios')
      .insert({
        ...portfolio,
        status: 'draft',
        progress_percentage: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création portfolio:', error)
      throw error
    }
    return data
  }

  async updatePortfolio(id: string, updates: Partial<LearningPortfolio>, userId?: string): Promise<LearningPortfolio | null> {
    const { data, error } = await this.supabase
      .from('learning_portfolios')
      .update({
        ...updates,
        last_modified_by: userId,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour portfolio:', error)
      throw error
    }
    return data
  }

  async validatePortfolio(id: string, validatorId: string): Promise<LearningPortfolio | null> {
    const { data, error } = await this.supabase
      .from('learning_portfolios')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: validatorId,
        is_visible_to_student: true,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erreur validation portfolio:', error)
      throw error
    }
    return data
  }

  // =====================================================
  // Entries
  // =====================================================

  async getPortfolioEntries(portfolioId: string): Promise<PortfolioEntry[]> {
    const { data, error } = await this.supabase
      .from('learning_portfolio_entries')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erreur récupération entries:', error)
      return []
    }
    return data || []
  }

  async upsertEntry(entry: Partial<PortfolioEntry>): Promise<PortfolioEntry | null> {
    const { data, error } = await this.supabase
      .from('learning_portfolio_entries')
      .upsert(
        {
          ...entry,
          evaluated_at: new Date().toISOString(),
        },
        {
          onConflict: 'portfolio_id,section_id,field_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Erreur upsert entry:', error)
      throw error
    }
    return data
  }

  async bulkUpsertEntries(entries: Partial<PortfolioEntry>[]): Promise<boolean> {
    const { error } = await this.supabase
      .from('learning_portfolio_entries')
      .upsert(
        entries.map((e) => ({
          ...e,
          evaluated_at: new Date().toISOString(),
        })),
        {
          onConflict: 'portfolio_id,section_id,field_id',
        }
      )

    if (error) {
      console.error('Erreur bulk upsert entries:', error)
      throw error
    }
    return true
  }

  // =====================================================
  // Signatures
  // =====================================================

  async addSignature(signature: {
    portfolio_id: string
    signer_type: 'student' | 'teacher' | 'tutor' | 'company_tutor' | 'admin'
    signer_id: string
    signer_name: string
    signer_role?: string
    signature_data: string
  }): Promise<boolean> {
    const { error } = await this.supabase
      .from('learning_portfolio_signatures')
      .insert({
        ...signature,
        signed_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Erreur ajout signature:', error)
      throw error
    }
    return true
  }

  async getSignatures(portfolioId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('learning_portfolio_signatures')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('signed_at', { ascending: true })

    if (error) {
      console.error('Erreur récupération signatures:', error)
      return []
    }
    return data || []
  }

  // =====================================================
  // Helpers
  // =====================================================

  getDefaultTemplateStructure(): TemplateSection[] {
    return [
      // ===== SECTION 1: PAGE DE GARDE =====
      {
        id: 'page_garde',
        title: 'Page de garde',
        description: 'Informations générales sur le livret',
        icon: 'file-text',
        fields: [
          { id: 'formation_title', label: 'Intitulé de la formation', type: 'text', required: true, placeholder: 'Ex: CAP Menuisier' },
          { id: 'formation_code', label: 'Code formation / RNCP', type: 'text', required: false, placeholder: 'Ex: RNCP34567' },
          { id: 'formation_duration', label: 'Durée totale de la formation', type: 'text', required: true, placeholder: 'Ex: 1200 heures' },
          { id: 'training_period_start', label: 'Date de début de formation', type: 'date', required: true },
          { id: 'training_period_end', label: 'Date de fin de formation', type: 'date', required: true },
        ],
      },

      // ===== SECTION 2: IDENTIFICATION DE L'APPRENANT =====
      {
        id: 'identification_apprenant',
        title: 'Identification de l\'apprenant',
        description: 'Coordonnées et informations personnelles de l\'apprenant',
        icon: 'user',
        fields: [
          { id: 'learner_civility', label: 'Civilité', type: 'select', required: true, options: ['M.', 'Mme', 'Autre'] },
          { id: 'learner_last_name', label: 'Nom de famille', type: 'text', required: true },
          { id: 'learner_first_name', label: 'Prénom', type: 'text', required: true },
          { id: 'learner_birth_date', label: 'Date de naissance', type: 'date', required: true },
          { id: 'learner_birth_place', label: 'Lieu de naissance', type: 'text', required: false },
          { id: 'learner_address', label: 'Adresse', type: 'textarea', required: false, placeholder: 'Adresse complète' },
          { id: 'learner_phone', label: 'Téléphone', type: 'text', required: false },
          { id: 'learner_email', label: 'Email', type: 'text', required: false },
          { id: 'learner_photo', label: 'Photo d\'identité', type: 'file', required: false },
        ],
      },

      // ===== SECTION 3: ORGANISME DE FORMATION =====
      {
        id: 'organisme_formation',
        title: 'Organisme de formation',
        description: 'Informations sur l\'organisme de formation (CFA / OF)',
        icon: 'building',
        fields: [
          { id: 'of_name', label: 'Nom de l\'organisme', type: 'text', required: true },
          { id: 'of_address', label: 'Adresse', type: 'textarea', required: false },
          { id: 'of_phone', label: 'Téléphone', type: 'text', required: false },
          { id: 'of_email', label: 'Email', type: 'text', required: false },
          { id: 'of_siret', label: 'N° SIRET', type: 'text', required: false },
          { id: 'of_nda', label: 'N° de déclaration d\'activité', type: 'text', required: false },
          { id: 'referent_pedagogique', label: 'Référent pédagogique', type: 'text', required: true },
          { id: 'referent_phone', label: 'Téléphone du référent', type: 'text', required: false },
          { id: 'referent_email', label: 'Email du référent', type: 'text', required: false },
        ],
      },

      // ===== SECTION 4: ENTREPRISE D'ACCUEIL =====
      {
        id: 'entreprise_accueil',
        title: 'Entreprise d\'accueil',
        description: 'Informations sur l\'entreprise d\'accueil pour l\'alternance',
        icon: 'briefcase',
        fields: [
          { id: 'company_name', label: 'Raison sociale', type: 'text', required: true },
          { id: 'company_address', label: 'Adresse', type: 'textarea', required: false },
          { id: 'company_phone', label: 'Téléphone', type: 'text', required: false },
          { id: 'company_email', label: 'Email', type: 'text', required: false },
          { id: 'company_siret', label: 'N° SIRET', type: 'text', required: false },
          { id: 'company_activity', label: 'Activité principale', type: 'text', required: false },
          { id: 'company_size', label: 'Effectif', type: 'select', required: false, options: ['1-10', '11-50', '51-250', '251-500', '500+'] },
          { id: 'tutor_name', label: 'Maître d\'apprentissage / Tuteur', type: 'text', required: true },
          { id: 'tutor_function', label: 'Fonction du tuteur', type: 'text', required: false },
          { id: 'tutor_phone', label: 'Téléphone du tuteur', type: 'text', required: false },
          { id: 'tutor_email', label: 'Email du tuteur', type: 'text', required: false },
        ],
      },

      // ===== SECTION 5: CALENDRIER DE L'ALTERNANCE =====
      {
        id: 'calendrier_alternance',
        title: 'Calendrier de l\'alternance',
        description: 'Planning des périodes en entreprise et en formation',
        icon: 'calendar',
        fields: [
          { id: 'alternance_rhythm', label: 'Rythme de l\'alternance', type: 'text', required: true, placeholder: 'Ex: 2 semaines entreprise / 1 semaine CFA' },
          { id: 'total_hours_company', label: 'Heures totales en entreprise', type: 'number', required: false, min: 0 },
          { id: 'total_hours_training', label: 'Heures totales en formation', type: 'number', required: false, min: 0 },
          { id: 'calendar_notes', label: 'Remarques sur le calendrier', type: 'textarea', required: false },
        ],
      },

      // ===== SECTION 6: OBJECTIFS DE LA FORMATION =====
      {
        id: 'objectifs_formation',
        title: 'Objectifs de la formation',
        description: 'Objectifs pédagogiques et professionnels visés',
        icon: 'target',
        fields: [
          { id: 'main_objectives', label: 'Objectifs principaux de la formation', type: 'textarea', required: true, placeholder: 'Décrire les objectifs généraux...' },
          { id: 'professional_profile', label: 'Profil professionnel visé', type: 'textarea', required: false, placeholder: 'Métiers / fonctions visés...' },
          { id: 'specific_objectives', label: 'Objectifs spécifiques', type: 'textarea', required: false },
        ],
      },

      // ===== SECTION 7: RÉFÉRENTIEL DE COMPÉTENCES =====
      {
        id: 'referentiel_competences',
        title: 'Référentiel de compétences',
        description: 'Blocs de compétences et capacités à acquérir',
        icon: 'book-open',
        fields: [
          // Bloc 1
          { id: 'bloc1_title', label: 'Bloc 1 - Intitulé', type: 'text', required: true, placeholder: 'Ex: Préparation et organisation du chantier' },
          { id: 'bloc1_c1', label: 'Bloc 1 - Compétence 1', type: 'competency', required: true, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          { id: 'bloc1_c2', label: 'Bloc 1 - Compétence 2', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          { id: 'bloc1_c3', label: 'Bloc 1 - Compétence 3', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          { id: 'bloc1_c4', label: 'Bloc 1 - Compétence 4', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          // Bloc 2
          { id: 'bloc2_title', label: 'Bloc 2 - Intitulé', type: 'text', required: false, placeholder: 'Ex: Réalisation des travaux' },
          { id: 'bloc2_c1', label: 'Bloc 2 - Compétence 1', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          { id: 'bloc2_c2', label: 'Bloc 2 - Compétence 2', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          { id: 'bloc2_c3', label: 'Bloc 2 - Compétence 3', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          { id: 'bloc2_c4', label: 'Bloc 2 - Compétence 4', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          // Bloc 3
          { id: 'bloc3_title', label: 'Bloc 3 - Intitulé', type: 'text', required: false, placeholder: 'Ex: Contrôle et suivi de la qualité' },
          { id: 'bloc3_c1', label: 'Bloc 3 - Compétence 1', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          { id: 'bloc3_c2', label: 'Bloc 3 - Compétence 2', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          { id: 'bloc3_c3', label: 'Bloc 3 - Compétence 3', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
          { id: 'bloc3_c4', label: 'Bloc 3 - Compétence 4', type: 'competency', required: false, competencyLevels: ['Non évalué', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé'] },
        ],
      },

      // ===== SECTION 8: SUIVI DES PÉRIODES EN ENTREPRISE =====
      {
        id: 'suivi_periodes_entreprise',
        title: 'Suivi des périodes en entreprise',
        description: 'Bilans des périodes réalisées en entreprise',
        icon: 'clipboard-list',
        fields: [
          // Période 1
          { id: 'period1_dates', label: 'Période 1 - Dates', type: 'text', required: false, placeholder: 'Du ... au ...' },
          { id: 'period1_tasks', label: 'Période 1 - Activités réalisées', type: 'textarea', required: false },
          { id: 'period1_evaluation', label: 'Période 1 - Évaluation tuteur', type: 'rating', required: false, min: 1, max: 5 },
          { id: 'period1_comments', label: 'Période 1 - Observations', type: 'textarea', required: false },
          // Période 2
          { id: 'period2_dates', label: 'Période 2 - Dates', type: 'text', required: false, placeholder: 'Du ... au ...' },
          { id: 'period2_tasks', label: 'Période 2 - Activités réalisées', type: 'textarea', required: false },
          { id: 'period2_evaluation', label: 'Période 2 - Évaluation tuteur', type: 'rating', required: false, min: 1, max: 5 },
          { id: 'period2_comments', label: 'Période 2 - Observations', type: 'textarea', required: false },
          // Période 3
          { id: 'period3_dates', label: 'Période 3 - Dates', type: 'text', required: false, placeholder: 'Du ... au ...' },
          { id: 'period3_tasks', label: 'Période 3 - Activités réalisées', type: 'textarea', required: false },
          { id: 'period3_evaluation', label: 'Période 3 - Évaluation tuteur', type: 'rating', required: false, min: 1, max: 5 },
          { id: 'period3_comments', label: 'Période 3 - Observations', type: 'textarea', required: false },
        ],
      },

      // ===== SECTION 9: BILANS INTERMÉDIAIRES =====
      {
        id: 'bilans_intermediaires',
        title: 'Bilans intermédiaires',
        description: 'Points d\'étape avec l\'apprenant, le tuteur et le formateur',
        icon: 'users',
        fields: [
          // Bilan 1
          { id: 'bilan1_date', label: 'Bilan 1 - Date', type: 'date', required: false },
          { id: 'bilan1_progress', label: 'Bilan 1 - Progression globale', type: 'rating', required: false, min: 1, max: 5 },
          { id: 'bilan1_strong_points', label: 'Bilan 1 - Points forts', type: 'textarea', required: false },
          { id: 'bilan1_improvements', label: 'Bilan 1 - Axes d\'amélioration', type: 'textarea', required: false },
          { id: 'bilan1_objectives', label: 'Bilan 1 - Objectifs pour la prochaine période', type: 'textarea', required: false },
          // Bilan 2
          { id: 'bilan2_date', label: 'Bilan 2 - Date', type: 'date', required: false },
          { id: 'bilan2_progress', label: 'Bilan 2 - Progression globale', type: 'rating', required: false, min: 1, max: 5 },
          { id: 'bilan2_strong_points', label: 'Bilan 2 - Points forts', type: 'textarea', required: false },
          { id: 'bilan2_improvements', label: 'Bilan 2 - Axes d\'amélioration', type: 'textarea', required: false },
          { id: 'bilan2_objectives', label: 'Bilan 2 - Objectifs pour la prochaine période', type: 'textarea', required: false },
          // Bilan 3
          { id: 'bilan3_date', label: 'Bilan 3 - Date', type: 'date', required: false },
          { id: 'bilan3_progress', label: 'Bilan 3 - Progression globale', type: 'rating', required: false, min: 1, max: 5 },
          { id: 'bilan3_strong_points', label: 'Bilan 3 - Points forts', type: 'textarea', required: false },
          { id: 'bilan3_improvements', label: 'Bilan 3 - Axes d\'amélioration', type: 'textarea', required: false },
          { id: 'bilan3_objectives', label: 'Bilan 3 - Objectifs finaux', type: 'textarea', required: false },
        ],
      },

      // ===== SECTION 10: COMPÉTENCES TRANSVERSALES =====
      {
        id: 'competences_transversales',
        title: 'Compétences transversales',
        description: 'Savoir-être et compétences transférables',
        icon: 'star',
        fields: [
          { id: 'punctuality', label: 'Ponctualité / Assiduité', type: 'competency', required: false, competencyLevels: ['Insuffisant', 'À améliorer', 'Satisfaisant', 'Très bien', 'Excellent'] },
          { id: 'autonomy', label: 'Autonomie', type: 'competency', required: false, competencyLevels: ['Insuffisant', 'À améliorer', 'Satisfaisant', 'Très bien', 'Excellent'] },
          { id: 'initiative', label: 'Prise d\'initiative', type: 'competency', required: false, competencyLevels: ['Insuffisant', 'À améliorer', 'Satisfaisant', 'Très bien', 'Excellent'] },
          { id: 'teamwork', label: 'Travail en équipe', type: 'competency', required: false, competencyLevels: ['Insuffisant', 'À améliorer', 'Satisfaisant', 'Très bien', 'Excellent'] },
          { id: 'communication', label: 'Communication', type: 'competency', required: false, competencyLevels: ['Insuffisant', 'À améliorer', 'Satisfaisant', 'Très bien', 'Excellent'] },
          { id: 'adaptability', label: 'Adaptabilité', type: 'competency', required: false, competencyLevels: ['Insuffisant', 'À améliorer', 'Satisfaisant', 'Très bien', 'Excellent'] },
          { id: 'safety_rules', label: 'Respect des règles de sécurité', type: 'competency', required: false, competencyLevels: ['Insuffisant', 'À améliorer', 'Satisfaisant', 'Très bien', 'Excellent'] },
          { id: 'professionalism', label: 'Professionnalisme', type: 'competency', required: false, competencyLevels: ['Insuffisant', 'À améliorer', 'Satisfaisant', 'Très bien', 'Excellent'] },
        ],
      },

      // ===== SECTION 11: ÉVALUATIONS EN CENTRE DE FORMATION =====
      {
        id: 'evaluations_centre',
        title: 'Évaluations en centre de formation',
        description: 'Résultats des évaluations réalisées au CFA / OF',
        icon: 'file-check',
        fields: [
          { id: 'eval_general_knowledge', label: 'Enseignement général', type: 'rating', required: false, min: 0, max: 20 },
          { id: 'eval_professional', label: 'Enseignement professionnel', type: 'rating', required: false, min: 0, max: 20 },
          { id: 'eval_practical', label: 'Travaux pratiques', type: 'rating', required: false, min: 0, max: 20 },
          { id: 'eval_project', label: 'Projet / Chef-d\'œuvre', type: 'rating', required: false, min: 0, max: 20 },
          { id: 'eval_average', label: 'Moyenne générale', type: 'number', required: false, min: 0, max: 20 },
          { id: 'eval_comments', label: 'Appréciations du conseil pédagogique', type: 'textarea', required: false },
        ],
      },

      // ===== SECTION 12: BILAN FINAL =====
      {
        id: 'bilan_final',
        title: 'Bilan final de la formation',
        description: 'Synthèse et conclusion de la formation',
        icon: 'award',
        fields: [
          { id: 'final_overall_assessment', label: 'Appréciation globale', type: 'textarea', required: true, placeholder: 'Synthèse de la formation...' },
          { id: 'final_skills_acquired', label: 'Compétences acquises', type: 'textarea', required: false },
          { id: 'final_skills_to_develop', label: 'Compétences à approfondir', type: 'textarea', required: false },
          { id: 'final_overall_rating', label: 'Évaluation finale globale', type: 'rating', required: false, min: 1, max: 5 },
          { id: 'final_recommendation', label: 'Recommandation de poursuite', type: 'textarea', required: false, placeholder: 'Recommandations pour la suite...' },
          { id: 'training_result', label: 'Résultat de la formation', type: 'select', required: true, options: ['Formation validée', 'Formation partiellement validée', 'Formation non validée', 'Abandon'] },
          { id: 'certification_obtained', label: 'Certification / Diplôme obtenu', type: 'checkbox', required: false },
          { id: 'certification_date', label: 'Date d\'obtention', type: 'date', required: false },
        ],
      },

      // ===== SECTION 13: ATTESTATIONS ET DOCUMENTS =====
      {
        id: 'attestations_documents',
        title: 'Attestations et documents',
        description: 'Documents annexes (habilitations, attestations, etc.)',
        icon: 'folder',
        fields: [
          { id: 'sst_certificate', label: 'Attestation SST (Sauveteur Secouriste du Travail)', type: 'checkbox', required: false },
          { id: 'sst_date', label: 'Date d\'obtention SST', type: 'date', required: false },
          { id: 'habilitation_electrique', label: 'Habilitation électrique', type: 'text', required: false, placeholder: 'Ex: B1V, BR...' },
          { id: 'habilitation_date', label: 'Date d\'obtention habilitation', type: 'date', required: false },
          { id: 'caces', label: 'CACES obtenu(s)', type: 'text', required: false, placeholder: 'Ex: R489 cat. 3' },
          { id: 'caces_date', label: 'Date d\'obtention CACES', type: 'date', required: false },
          { id: 'other_certifications', label: 'Autres certifications / attestations', type: 'textarea', required: false },
          { id: 'attached_documents', label: 'Documents joints', type: 'file', required: false },
        ],
      },

      // ===== SECTION 14: SIGNATURES =====
      {
        id: 'signatures',
        title: 'Signatures',
        description: 'Validation par les différentes parties',
        icon: 'pen-tool',
        fields: [
          { id: 'learner_signature_date', label: 'Date de signature apprenant', type: 'date', required: false },
          { id: 'learner_signature_comment', label: 'Observations de l\'apprenant', type: 'textarea', required: false },
          { id: 'tutor_signature_date', label: 'Date de signature tuteur entreprise', type: 'date', required: false },
          { id: 'tutor_signature_comment', label: 'Observations du tuteur', type: 'textarea', required: false },
          { id: 'trainer_signature_date', label: 'Date de signature formateur', type: 'date', required: false },
          { id: 'trainer_signature_comment', label: 'Observations du formateur', type: 'textarea', required: false },
          { id: 'manager_signature_date', label: 'Date de signature responsable formation', type: 'date', required: false },
          { id: 'manager_signature_comment', label: 'Observations du responsable', type: 'textarea', required: false },
        ],
      },
    ]
  }
}

export const learningPortfolioService = new LearningPortfolioService()


