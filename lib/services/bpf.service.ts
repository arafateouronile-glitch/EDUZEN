/**
 * EDUZEN - Service Bilan Pédagogique et Financier (BPF)
 *
 * Service pour le rapport annuel obligatoire des Organismes de Formation
 */

import { createClient } from '@/lib/supabase/client'

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
// SERVICE
// =====================================================

export class BPFService {
  private supabase = createClient()

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
          console.warn('[BPF] Reports table does not exist yet')
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
        console.warn('[BPF] Could not calculate metrics automatically:', error.message)
        return this.getDefaultMetrics()
      }

      return data || this.getDefaultMetrics()
    } catch (err) {
      console.warn('[BPF] Error calculating metrics:', err)
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
}

// Export singleton
export const bpfService = new BPFService()
