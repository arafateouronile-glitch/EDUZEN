/**
 * Service Qualiopi - Gestion de la certification qualité
 * Pour les organismes de formation en France
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface QualiopiIndicator {
  id: string
  organization_id: string
  indicator_code: string
  indicator_name: string
  category: string
  description?: string
  status: 'not_started' | 'in_progress' | 'compliant' | 'non_compliant' | 'needs_improvement'
  compliance_rate: number
  last_evaluation_date?: string
  next_evaluation_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface QualiopiEvidence {
  id: string
  organization_id: string
  indicator_id: string
  evidence_type: 'document' | 'photo' | 'video' | 'testimony' | 'data' | 'report' | 'certificate' | 'other'
  title: string
  description?: string
  file_url?: string
  file_type?: string
  file_size?: number
  upload_date: string
  uploaded_by?: string
  validity_start_date?: string
  validity_end_date?: string
  is_valid: boolean
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  reviewer_id?: string
  review_date?: string
  review_notes?: string
  created_at: string
  updated_at: string
}

export interface QualiopiCorrectiveAction {
  id: string
  organization_id: string
  indicator_id?: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to?: string
  due_date?: string
  completion_date?: string
  completion_notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface QualiopiAudit {
  id: string
  organization_id: string
  audit_type: 'internal' | 'external' | 'certification' | 'surveillance'
  audit_date: string
  auditor_name?: string
  auditor_organization?: string
  overall_score?: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  report_url?: string
  findings?: Array<{ id: string; description: string; severity: 'low' | 'medium' | 'high' | 'critical'; indicator_code?: string }>
  recommendations?: Array<{ id: string; description: string; priority: 'low' | 'medium' | 'high' | 'critical'; indicator_code?: string }>
  certification_valid_until?: string
  notes?: string
  created_at: string
  updated_at: string
}

export class QualiopiService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupérer tous les indicateurs Qualiopi d'une organisation
   */
  async getIndicators(organizationId: string): Promise<QualiopiIndicator[]> {
    const { data, error } = await this.supabase
      .from('qualiopi_indicators')
      .select('*')
      .eq('organization_id', organizationId)
      .order('indicator_code', { ascending: true })

    if (error) {
      // Si la table n'existe pas encore ou erreur 404, retourner un tableau vide
      if (
        error.code === 'PGRST116' ||
        error.code === '42P01' ||
        error.code === 'PGRST301' ||
        error.status === 404 ||
        error.code === '404' ||
        error.message?.includes('relation') ||
        error.message?.includes('relationship') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache')
      ) {
        console.warn('Table qualiopi_indicators does not exist yet or invalid query:', error?.message)
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Récupérer un indicateur par son code
   */
  async getIndicatorByCode(organizationId: string, indicatorCode: string): Promise<QualiopiIndicator | null> {
    const { data, error } = await this.supabase
      .from('qualiopi_indicators')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('indicator_code', indicatorCode)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Créer ou mettre à jour un indicateur
   */
  async upsertIndicator(indicator: Partial<QualiopiIndicator>): Promise<QualiopiIndicator> {
    const { data, error } = await this.supabase
      .from('qualiopi_indicators')
      .upsert(indicator, {
        onConflict: 'organization_id,indicator_code',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Mettre à jour le statut d'un indicateur
   */
  async updateIndicatorStatus(
    indicatorId: string,
    status: QualiopiIndicator['status'],
    complianceRate?: number
  ): Promise<void> {
    const updateData: Record<string, string | number> = { status, updated_at: new Date().toISOString() }
    if (complianceRate !== undefined) {
      updateData.compliance_rate = complianceRate
      updateData.last_evaluation_date = new Date().toISOString()
    }

    const { error } = await this.supabase
      .from('qualiopi_indicators')
      .update(updateData)
      .eq('id', indicatorId)

    if (error) throw error
  }

  /**
   * Récupérer les preuves d'un indicateur
   */
  async getEvidence(indicatorId: string): Promise<QualiopiEvidence[]> {
    const { data, error } = await this.supabase
      .from('qualiopi_evidence')
      .select('*')
      .eq('indicator_id', indicatorId)
      .order('upload_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Ajouter une preuve
   */
  async addEvidence(evidence: Partial<QualiopiEvidence>): Promise<QualiopiEvidence> {
    const { data, error } = await this.supabase
      .from('qualiopi_evidence')
      .insert(evidence)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer les actions correctives
   */
  async getCorrectiveActions(organizationId: string, filters?: {
    indicatorId?: string
    status?: string
    priority?: string
  }): Promise<QualiopiCorrectiveAction[]> {
    let query = this.supabase
      .from('qualiopi_corrective_actions')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.indicatorId) {
      query = query.eq('indicator_id', filters.indicatorId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Créer une action corrective
   */
  async createCorrectiveAction(action: Partial<QualiopiCorrectiveAction>): Promise<QualiopiCorrectiveAction> {
    const { data, error } = await this.supabase
      .from('qualiopi_corrective_actions')
      .insert(action)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer les audits
   */
  async getAudits(organizationId: string): Promise<QualiopiAudit[]> {
    const { data, error } = await this.supabase
      .from('qualiopi_audits')
      .select('*')
      .eq('organization_id', organizationId)
      .order('audit_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Créer un audit
   */
  async createAudit(audit: Partial<QualiopiAudit>): Promise<QualiopiAudit> {
    const { data, error } = await this.supabase
      .from('qualiopi_audits')
      .insert(audit)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Calculer le taux de conformité global
   */
  async calculateComplianceRate(organizationId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('calculate_qualiopi_compliance_rate', {
        org_id: organizationId,
      })

      if (error) {
        // Si la fonction RPC n'existe pas encore ou erreur 404, retourner 0
        const is404Error = 
          error.code === 'PGRST116' ||
          error.code === '42883' ||
          error.code === 'PGRST301' ||
          error.status === 404 ||
          error.code === '404' ||
          String(error.status) === '404' ||
          String(error.code) === '404' ||
          error.message?.toLowerCase().includes('function') ||
          error.message?.toLowerCase().includes('does not exist') ||
          error.message?.toLowerCase().includes('schema cache') ||
          error.message?.toLowerCase().includes('not found') ||
          error.message?.toLowerCase().includes('404')

        if (is404Error) {
          // Ne pas logger en mode production pour éviter le bruit dans la console
          if (process.env.NODE_ENV === 'development') {
            console.warn('Function calculate_qualiopi_compliance_rate does not exist yet. This is normal if the function has not been created in Supabase yet.')
          }
          return 0
        }
        throw error
      }
      return data || 0
    } catch (err: unknown) {
      // Capturer les erreurs réseau ou autres erreurs inattendues
      if (
        err?.status === 404 ||
        err?.code === '404' ||
        String(err?.status) === '404' ||
        err?.message?.toLowerCase().includes('not found') ||
        err?.message?.toLowerCase().includes('404') ||
        err?.message?.toLowerCase().includes('function') ||
        err?.message?.toLowerCase().includes('does not exist')
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Function calculate_qualiopi_compliance_rate does not exist yet. This is normal if the function has not been created in Supabase yet.')
        }
        return 0
      }
      throw err
    }
  }

  /**
   * Initialiser les indicateurs Qualiopi pour une organisation
   */
  async initializeIndicators(organizationId: string): Promise<void> {
    // Liste des indicateurs Qualiopi standard
    const standardIndicators = [
      // Catégorie 1 : Conditions de réception
      { code: '1.1', name: 'Information préalable', category: 'conditions_reception' },
      { code: '1.2', name: 'Accueil et accompagnement', category: 'conditions_reception' },
      { code: '1.3', name: 'Accessibilité', category: 'conditions_reception' },
      
      // Catégorie 2 : Identification des objectifs
      { code: '2.1', name: 'Identification des besoins', category: 'identification_objectifs' },
      { code: '2.2', name: 'Définition des objectifs', category: 'identification_objectifs' },
      
      // Catégorie 3 : Adaptation des parcours
      { code: '3.1', name: 'Adaptation pédagogique', category: 'adaptation_parcours' },
      { code: '3.2', name: 'Suivi individualisé', category: 'adaptation_parcours' },
      
      // Catégorie 4 : Adéquation des ressources
      { code: '4.1', name: 'Ressources pédagogiques', category: 'adéquation_ressources' },
      { code: '4.2', name: 'Ressources techniques', category: 'adéquation_ressources' },
      { code: '4.3', name: 'Ressources humaines', category: 'adéquation_ressources' },
      
      // Catégorie 5 : Compétences des formateurs
      { code: '5.1', name: 'Compétences pédagogiques', category: 'compétences_formateurs' },
      { code: '5.2', name: 'Compétences techniques', category: 'compétences_formateurs' },
      { code: '5.3', name: 'Formation continue', category: 'compétences_formateurs' },
      
      // Catégorie 6 : Inscription
      { code: '6.1', name: 'Processus d\'inscription', category: 'inscription' },
      { code: '6.2', name: 'Contrat de formation', category: 'inscription' },
      
      // Catégorie 7 : Évaluation
      { code: '7.1', name: 'Évaluation des acquis', category: 'evaluation' },
      { code: '7.2', name: 'Certification', category: 'evaluation' },
      
      // Catégorie 8 : Accessibilité
      { code: '8.1', name: 'Accessibilité physique', category: 'accessibilite' },
      { code: '8.2', name: 'Accessibilité numérique', category: 'accessibilite' },
      
      // Catégorie 9 : Information du public
      { code: '9.1', name: 'Transparence de l\'information', category: 'information_public' },
      { code: '9.2', name: 'Publicité', category: 'information_public' },
      
      // Catégorie 10 : Gouvernance
      { code: '10.1', name: 'Gouvernance et pilotage', category: 'gouvernance' },
      { code: '10.2', name: 'Amélioration continue', category: 'gouvernance' },
    ]

    const indicators = standardIndicators.map((indicator) => ({
      organization_id: organizationId,
      indicator_code: indicator.code,
      indicator_name: indicator.name,
      category: indicator.category,
      status: 'not_started' as const,
      compliance_rate: 0,
    }))

    const { error } = await this.supabase
      .from('qualiopi_indicators')
      .upsert(indicators, {
        onConflict: 'organization_id,indicator_code',
        ignoreDuplicates: false,
      })

    if (error) {
      // Si la table n'existe pas encore ou erreur 404, logger un avertissement
      if (
        error.code === 'PGRST116' ||
        error.code === '42P01' ||
        error.code === 'PGRST301' ||
        error.status === 404 ||
        error.code === '404' ||
        error.message?.includes('relation') ||
        error.message?.includes('relationship') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache')
      ) {
        console.warn('Table qualiopi_indicators does not exist yet. Please create the table first:', error?.message)
        throw new Error('La table qualiopi_indicators n\'existe pas encore. Veuillez créer la table dans la base de données.')
      }
      throw error
    }
  }
}

export const qualiopiService = new QualiopiService()
