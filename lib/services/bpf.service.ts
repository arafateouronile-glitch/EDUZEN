/**
 * EDUZEN - Service Bilan Pédagogique et Financier (BPF)
 *
 * Service pour le rapport annuel obligatoire des Organismes de Formation
 * Module "BPF Magic Engine" - Calcul précis et automatisé
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, sanitizeError } from '@/lib/utils/logger'

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface BPFReport {
  id: string
  organization_id: string
  year: number
  status: 'draft' | 'in_progress' | 'completed' | 'submitted'

  // Données financières
  total_revenue: number
  revenue_cpf: number
  revenue_opco: number
  revenue_companies: number
  revenue_individuals: number
  revenue_pole_emploi: number
  revenue_regions: number
  revenue_state: number
  revenue_other: number

  // Données pédagogiques
  total_students: number
  students_men: number
  students_women: number
  students_under_26: number
  students_over_45: number
  students_disabled: number

  total_training_hours: number
  total_trainee_hours: number
  total_programs: number
  total_sessions: number

  success_rate: number | null
  completion_rate: number | null
  employment_rate: number | null
  satisfaction_rate: number | null

  // Moyens
  total_trainers: number
  permanent_trainers: number
  freelance_trainers: number
  trainer_hours: number
  training_locations: number
  owned_locations: number
  rented_locations: number
  total_capacity: number
  subcontracting_amount: number

  // Métadonnées
  generated_at: string | null
  generated_by: string | null
  submitted_at: string | null
  submitted_by: string | null
  report_data: Record<string, any>
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BPFTrainingDomain {
  id: string
  bpf_report_id: string
  domain_code: string | null
  domain_name: string
  domain_category: string | null
  students_count: number
  training_hours: number
  revenue: number
  programs_count: number
  created_at: string
}

// =====================================================
// BPF MAGIC ENGINE TYPES
// =====================================================

export interface BPFStats {
  total_hours_realized: number
  total_trainee_hours: number
  total_students_count: number
  total_sessions_count: number
  total_programs_count: number
  attendance_rate: number
}

export interface BPFRevenueBreakdown {
  total_revenue: number
  revenue_cpf: number
  revenue_opco: number
  revenue_companies: number
  revenue_individuals: number
  revenue_pole_emploi: number
  revenue_regions: number
  revenue_state: number
  revenue_other: number
  breakdown_details: Record<string, BPFRevenueDetail[]>
}

export interface BPFRevenueDetail {
  enrollment_id: string
  amount: number
  funding_name: string
  session_name: string
  student_name: string
}

export interface BPFInconsistency {
  inconsistency_type: string
  severity: 'critical' | 'warning' | 'info'
  description: string
  affected_count: number
  details: Record<string, any>[]
}

export interface BPFStudentBreakdown {
  total_students: number
  students_men: number
  students_women: number
  students_under_26: number
  students_26_to_45: number
  students_over_45: number
  students_disabled: number
  age_breakdown: Record<string, number>
}

export interface BPFDrillDownResult {
  total_count: number
  items: Record<string, any>[]
}

export type BPFDrillDownMetric = 'trainee_hours' | 'revenue' | 'students' | 'sessions'

// BPF Category mappings for Cerfa
export const BPF_CATEGORIES = {
  cpf: { label: 'Mon Compte Formation (CPF)', cerfaLine: 'F1' },
  opco: { label: 'Opérateurs de Compétences (OPCO)', cerfaLine: 'F2' },
  companies: { label: 'Entreprises', cerfaLine: 'F3' },
  individuals: { label: 'Particuliers', cerfaLine: 'F4' },
  pole_emploi: { label: 'Pôle Emploi / France Travail', cerfaLine: 'F5' },
  regions: { label: 'Conseils régionaux', cerfaLine: 'F6' },
  state: { label: 'État', cerfaLine: 'F7' },
  other: { label: 'Autres financements', cerfaLine: 'F8' },
} as const

export type BPFCategory = keyof typeof BPF_CATEGORIES

// =====================================================
// SERVICE
// =====================================================

export class BPFService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupérer les rapports BPF d'une organisation
   */
  async getReports(organizationId: string): Promise<BPFReport[]> {
    try {
      const { data, error } = await this.supabase
        .from('bpf_reports')
        .select('*')
        .eq('organization_id', organizationId)
        .order('year', { ascending: false })

      if (error) {
        if (this.is404Error(error)) {
          logger.warn('BPFService - Reports table does not exist yet')
          return []
        }
        throw error
      }

      return data || []
    } catch (err: unknown) {
      if (this.is404Error(err)) return []
      throw err
    }
  }

  /**
   * Récupérer un rapport par ID
   */
  async getReport(reportId: string): Promise<BPFReport | null> {
    const { data, error } = await this.supabase
      .from('bpf_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Récupérer un rapport par année
   */
  async getReportByYear(organizationId: string, year: number): Promise<BPFReport | null> {
    const { data, error } = await this.supabase
      .from('bpf_reports')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('year', year)
      .maybeSingle()

    if (error && !this.is404Error(error)) throw error
    return data
  }

  /**
   * Créer un rapport BPF
   */
  async createReport(organizationId: string, year: number): Promise<BPFReport> {
    // Vérifier si un rapport existe déjà pour cette année
    const existing = await this.getReportByYear(organizationId, year)
    if (existing) {
      throw new Error(`Un rapport existe déjà pour l'année ${year}`)
    }

    // Calculer les métriques automatiquement
    const metrics = await this.calculateMetrics(organizationId, year)

    const reportData: Partial<BPFReport> = {
      organization_id: organizationId,
      year,
      status: 'draft',
      ...metrics,
    }

    const { data, error } = await this.supabase
      .from('bpf_reports')
      .insert(reportData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Mettre à jour un rapport
   */
  async updateReport(reportId: string, data: Partial<BPFReport>): Promise<BPFReport> {
    const cleanData = { ...data }
    delete (cleanData as any).id
    delete (cleanData as any).created_at
    delete (cleanData as any).updated_at

    const { data: updated, error } = await this.supabase
      .from('bpf_reports')
      .update(cleanData)
      .eq('id', reportId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  /**
   * Soumettre un rapport
   */
  async submitReport(reportId: string, userId: string): Promise<BPFReport> {
    return await this.updateReport(reportId, {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: userId,
    })
  }

  /**
   * Calculer les métriques BPF automatiquement
   */
  async calculateMetrics(organizationId: string, year: number): Promise<Partial<BPFReport>> {
    try {
      const { data, error } = await this.supabase.rpc('calculate_bpf_metrics', {
        org_id: organizationId,
        year_val: year,
      })

      if (error) {
        logger.warn('BPFService - Could not calculate metrics automatically', { errorMessage: error.message })
        return this.getDefaultMetrics()
      }

      return data || this.getDefaultMetrics()
    } catch (err) {
      logger.warn('BPFService - Error calculating metrics', { error: sanitizeError(err) })
      return this.getDefaultMetrics()
    }
  }

  /**
   * Récupérer les domaines de formation d'un rapport
   */
  async getTrainingDomains(reportId: string): Promise<BPFTrainingDomain[]> {
    try {
      const { data, error } = await this.supabase
        .from('bpf_training_domains')
        .select('*')
        .eq('bpf_report_id', reportId)
        .order('revenue', { ascending: false })

      if (error) {
        if (this.is404Error(error)) return []
        throw error
      }

      return data || []
    } catch (err: unknown) {
      if (this.is404Error(err)) return []
      throw err
    }
  }

  /**
   * Ajouter un domaine de formation
   */
  async addTrainingDomain(data: Partial<BPFTrainingDomain>): Promise<BPFTrainingDomain> {
    const { data: created, error } = await this.supabase
      .from('bpf_training_domains')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return created
  }

  /**
   * Métriques par défaut
   */
  private getDefaultMetrics(): Partial<BPFReport> {
    return {
      total_revenue: 0,
      revenue_cpf: 0,
      revenue_opco: 0,
      revenue_companies: 0,
      revenue_individuals: 0,
      revenue_pole_emploi: 0,
      revenue_regions: 0,
      revenue_state: 0,
      revenue_other: 0,
      total_students: 0,
      students_men: 0,
      students_women: 0,
      students_under_26: 0,
      students_over_45: 0,
      students_disabled: 0,
      total_training_hours: 0,
      total_trainee_hours: 0,
      total_programs: 0,
      total_sessions: 0,
      total_trainers: 0,
      permanent_trainers: 0,
      freelance_trainers: 0,
      trainer_hours: 0,
      training_locations: 0,
      owned_locations: 0,
      rented_locations: 0,
      total_capacity: 0,
      subcontracting_amount: 0,
    }
  }

  /**
   * Vérifier si une erreur est une erreur 404
   */
  private is404Error(error: any): boolean {
    return (
      error?.code === 'PGRST116' ||
      error?.code === '42P01' ||
      error?.code === 'PGRST301' ||
      error?.status === 404 ||
      error?.message?.includes('relation') ||
      error?.message?.includes('does not exist')
    )
  }

  // =====================================================
  // BPF MAGIC ENGINE METHODS
  // =====================================================

  /**
   * Récupérer les statistiques BPF précises basées sur les émargements
   * C'est LE calcul qui donne des sueurs froides aux directeurs d'OF
   */
  async getStats(organizationId: string, year: number): Promise<BPFStats> {
    try {
      const { data, error } = await this.supabase.rpc('get_bpf_stats', {
        target_org_id: organizationId,
        target_year: year,
      })

      if (error) {
        logger.warn('BPFService - Could not get BPF stats', { errorMessage: error.message })
        return this.getDefaultStats()
      }

      // RPC retourne un tableau, on prend le premier élément
      const result = Array.isArray(data) ? data[0] : data
      return result || this.getDefaultStats()
    } catch (err) {
      logger.warn('BPFService - Error getting stats', { error: sanitizeError(err) })
      return this.getDefaultStats()
    }
  }

  /**
   * Récupérer la ventilation du CA par source de financement
   */
  async getRevenueBreakdown(organizationId: string, year: number): Promise<BPFRevenueBreakdown> {
    try {
      const { data, error } = await this.supabase.rpc('get_bpf_revenue_breakdown', {
        target_org_id: organizationId,
        target_year: year,
      })

      if (error) {
        logger.warn('BPFService - Could not get revenue breakdown', { errorMessage: error.message })
        return this.getDefaultRevenueBreakdown()
      }

      const result = Array.isArray(data) ? data[0] : data
      return result || this.getDefaultRevenueBreakdown()
    } catch (err) {
      logger.warn('BPFService - Error getting revenue breakdown', { error: sanitizeError(err) })
      return this.getDefaultRevenueBreakdown()
    }
  }

  /**
   * Détecter les incohérences de données qui pourraient fausser le BPF
   * C'est le "vérificateur d'incohérences" qui signale les problèmes
   */
  async getInconsistencies(organizationId: string, year: number): Promise<BPFInconsistency[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_bpf_inconsistencies', {
        target_org_id: organizationId,
        target_year: year,
      })

      if (error) {
        logger.warn('BPFService - Could not get inconsistencies', { errorMessage: error.message })
        return []
      }

      return (data || []).map((item: any) => ({
        inconsistency_type: item.inconsistency_type,
        severity: item.severity as 'critical' | 'warning' | 'info',
        description: item.description,
        affected_count: item.affected_count,
        details: item.details || [],
      }))
    } catch (err) {
      logger.warn('BPFService - Error getting inconsistencies', { error: sanitizeError(err) })
      return []
    }
  }

  /**
   * Récupérer la répartition démographique des stagiaires
   */
  async getStudentBreakdown(organizationId: string, year: number): Promise<BPFStudentBreakdown> {
    try {
      const { data, error } = await this.supabase.rpc('get_bpf_student_breakdown', {
        target_org_id: organizationId,
        target_year: year,
      })

      if (error) {
        logger.warn('BPFService - Could not get student breakdown', { errorMessage: error.message })
        return this.getDefaultStudentBreakdown()
      }

      const result = Array.isArray(data) ? data[0] : data
      return result || this.getDefaultStudentBreakdown()
    } catch (err) {
      logger.warn('BPFService - Error getting student breakdown', { error: sanitizeError(err) })
      return this.getDefaultStudentBreakdown()
    }
  }

  /**
   * Drill-down sur un chiffre spécifique du BPF
   * Mode Audit : voir le détail des calculs
   */
  async getDrillDown(
    organizationId: string,
    year: number,
    metricType: BPFDrillDownMetric,
    page: number = 1,
    pageSize: number = 50
  ): Promise<BPFDrillDownResult> {
    try {
      const { data, error } = await this.supabase.rpc('get_bpf_drill_down', {
        target_org_id: organizationId,
        target_year: year,
        metric_type: metricType,
        page_num: page,
        page_size: pageSize,
      })

      if (error) {
        logger.warn('BPFService - Could not get drill down', { errorMessage: error.message })
        return { total_count: 0, items: [] }
      }

      const result = Array.isArray(data) ? data[0] : data
      return {
        total_count: result?.total_count || 0,
        items: result?.items || [],
      }
    } catch (err) {
      logger.warn('BPFService - Error getting drill down', { error: sanitizeError(err) })
      return { total_count: 0, items: [] }
    }
  }

  /**
   * Recalculer et mettre à jour un rapport BPF avec les données actuelles
   */
  async recalculateReport(reportId: string, organizationId: string): Promise<BPFReport> {
    const report = await this.getReport(reportId)
    if (!report) {
      throw new Error('Rapport BPF non trouvé')
    }

    const metrics = await this.calculateMetrics(organizationId, report.year)
    return await this.updateReport(reportId, {
      ...metrics,
      generated_at: new Date().toISOString(),
      status: 'in_progress',
    })
  }

  /**
   * Préparer les données pour l'export Cerfa
   */
  async prepareCerfaData(organizationId: string, year: number): Promise<BPFCerfaData> {
    const [stats, revenue, students, inconsistencies] = await Promise.all([
      this.getStats(organizationId, year),
      this.getRevenueBreakdown(organizationId, year),
      this.getStudentBreakdown(organizationId, year),
      this.getInconsistencies(organizationId, year),
    ])

    // Récupérer les infos de l'organisation
    const { data: org } = await this.supabase
      .from('organizations')
      .select('name, siret, address, city, postal_code, nda_number')
      .eq('id', organizationId)
      .single()

    return {
      organization: {
        name: org?.name || '',
        siret: org?.siret || '',
        address: org?.address || '',
        city: org?.city || '',
        postal_code: org?.postal_code || '',
        nda_number: org?.nda_number || '',
      },
      year,
      // Cadre F - Origine des produits
      cadreF: {
        total: revenue.total_revenue,
        cpf: revenue.revenue_cpf,
        opco: revenue.revenue_opco,
        companies: revenue.revenue_companies,
        individuals: revenue.revenue_individuals,
        pole_emploi: revenue.revenue_pole_emploi,
        regions: revenue.revenue_regions,
        state: revenue.revenue_state,
        other: revenue.revenue_other,
      },
      // Cadre G - Stagiaires
      cadreG: {
        total: students.total_students,
        men: students.students_men,
        women: students.students_women,
        under_26: students.students_under_26,
        over_45: students.students_over_45,
        disabled: students.students_disabled,
      },
      // Cadre H - Bilan d'activité
      cadreH: {
        total_hours: stats.total_hours_realized,
        trainee_hours: stats.total_trainee_hours,
        sessions_count: stats.total_sessions_count,
        programs_count: stats.total_programs_count,
        attendance_rate: stats.attendance_rate,
      },
      // Alertes
      inconsistencies,
      hasWarnings: inconsistencies.some((i) => i.severity === 'warning'),
      hasCriticalIssues: inconsistencies.some((i) => i.severity === 'critical'),
    }
  }

  // =====================================================
  // DEFAULT VALUES
  // =====================================================

  private getDefaultStats(): BPFStats {
    return {
      total_hours_realized: 0,
      total_trainee_hours: 0,
      total_students_count: 0,
      total_sessions_count: 0,
      total_programs_count: 0,
      attendance_rate: 0,
    }
  }

  private getDefaultRevenueBreakdown(): BPFRevenueBreakdown {
    return {
      total_revenue: 0,
      revenue_cpf: 0,
      revenue_opco: 0,
      revenue_companies: 0,
      revenue_individuals: 0,
      revenue_pole_emploi: 0,
      revenue_regions: 0,
      revenue_state: 0,
      revenue_other: 0,
      breakdown_details: {},
    }
  }

  private getDefaultStudentBreakdown(): BPFStudentBreakdown {
    return {
      total_students: 0,
      students_men: 0,
      students_women: 0,
      students_under_26: 0,
      students_26_to_45: 0,
      students_over_45: 0,
      students_disabled: 0,
      age_breakdown: {},
    }
  }
}

// =====================================================
// CERFA DATA TYPE
// =====================================================

export interface BPFCerfaData {
  organization: {
    name: string
    siret: string
    address: string
    city: string
    postal_code: string
    nda_number: string
  }
  year: number
  cadreF: {
    total: number
    cpf: number
    opco: number
    companies: number
    individuals: number
    pole_emploi: number
    regions: number
    state: number
    other: number
  }
  cadreG: {
    total: number
    men: number
    women: number
    under_26: number
    over_45: number
    disabled: number
  }
  cadreH: {
    total_hours: number
    trainee_hours: number
    sessions_count: number
    programs_count: number
    attendance_rate: number
  }
  inconsistencies: BPFInconsistency[]
  hasWarnings: boolean
  hasCriticalIssues: boolean
}

// Export singleton
export const bpfService = new BPFService()
