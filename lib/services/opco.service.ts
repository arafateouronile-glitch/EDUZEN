/**
 * Service OPCO - Gestion des opérateurs de compétences
 * Déclarations automatiques et financements OPCO pour les organismes de formation en France
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface OPCOConfiguration {
  id: string
  organization_id: string
  opco_name: string
  opco_code?: string
  siret_number: string
  api_key?: string
  api_secret?: string
  api_endpoint?: string
  is_active: boolean
  last_sync_date?: string
  sync_frequency: 'hourly' | 'daily' | 'weekly' | 'manual'
  created_at: string
  updated_at: string
}

export interface OPCOConvention {
  id: string
  organization_id: string
  opco_config_id: string
  convention_number: string
  convention_type: 'apprentissage' | 'pro_a' | 'afest' | 'vae' | 'other'
  start_date: string
  end_date?: string
  status: 'draft' | 'pending' | 'active' | 'suspended' | 'terminated'
  funding_rate: number
  max_funding_amount?: number
  used_funding_amount: number
  remaining_funding_amount?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface OPCODeclaration {
  id: string
  organization_id: string
  opco_config_id: string
  convention_id?: string
  declaration_type: 'activity' | 'funding_request' | 'completion' | 'payment' | 'annual'
  declaration_period_start: string
  declaration_period_end: string
  declaration_date: string
  status: 'draft' | 'submitted' | 'validated' | 'rejected' | 'paid' | 'cancelled'
  total_trainees: number
  total_hours: number
  total_amount: number
  requested_funding: number
  approved_funding: number
  paid_funding: number
  opco_reference?: string
  submission_date?: string
  validation_date?: string
  payment_date?: string
  rejection_reason?: string
  metadata?: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

export interface OPCODeclarationLine {
  id: string
  declaration_id: string
  training_id?: string
  learner_id?: string
  training_title: string
  learner_name: string
  start_date: string
  end_date?: string
  total_hours: number
  unit_price?: number
  total_price: number
  funding_rate: number
  funding_amount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  notes?: string
  created_at: string
}

export interface OPCOFundingRequest {
  id: string
  organization_id: string
  opco_config_id: string
  convention_id?: string
  request_number?: string
  request_type: 'training' | 'equipment' | 'consulting' | 'other'
  training_id?: string
  title: string
  description?: string
  requested_amount: number
  approved_amount: number
  paid_amount: number
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'cancelled'
  submission_date?: string
  approval_date?: string
  payment_date?: string
  rejection_reason?: string
  opco_reference?: string
  metadata?: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

export class OPCOService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupérer les configurations OPCO d'une organisation
   */
  async getConfigurations(organizationId: string): Promise<OPCOConfiguration[]> {
    const { data, error } = await this.supabase
      .from('opco_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('opco_name', { ascending: true })

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
        console.warn('Table opco_configurations does not exist yet or invalid query:', error?.message)
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Créer ou mettre à jour une configuration OPCO
   */
  async upsertConfiguration(config: Partial<OPCOConfiguration>): Promise<OPCOConfiguration> {
    const { data, error } = await this.supabase
      .from('opco_configurations')
      .upsert(config, {
        onConflict: 'organization_id,opco_code',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer les conventions OPCO
   */
  async getConventions(organizationId: string, filters?: {
    opcoConfigId?: string
    status?: string
  }): Promise<OPCOConvention[]> {
    let query = this.supabase
      .from('opco_conventions')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.opcoConfigId) {
      query = query.eq('opco_config_id', filters.opcoConfigId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('start_date', { ascending: false })

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
        console.warn('Table opco_conventions does not exist yet or invalid query:', error?.message)
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Créer une convention OPCO
   */
  async createConvention(convention: Partial<OPCOConvention>): Promise<OPCOConvention> {
    // Générer un numéro de convention si non fourni
    if (!convention.convention_number) {
      convention.convention_number = `CONV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    }

    // Calculer le montant restant si max_funding_amount est défini
    if (convention.max_funding_amount) {
      convention.remaining_funding_amount = convention.max_funding_amount - (convention.used_funding_amount || 0)
    }

    const { data, error } = await this.supabase
      .from('opco_conventions')
      .insert(convention)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer les déclarations OPCO
   */
  async getDeclarations(organizationId: string, filters?: {
    opcoConfigId?: string
    conventionId?: string
    status?: string
    periodStart?: string
    periodEnd?: string
  }): Promise<OPCODeclaration[]> {
    let query = this.supabase
      .from('opco_declarations')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.opcoConfigId) {
      query = query.eq('opco_config_id', filters.opcoConfigId)
    }
    if (filters?.conventionId) {
      query = query.eq('convention_id', filters.conventionId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.periodStart) {
      query = query.gte('declaration_period_end', filters.periodStart)
    }
    if (filters?.periodEnd) {
      query = query.lte('declaration_period_start', filters.periodEnd)
    }

    const { data, error } = await query.order('declaration_date', { ascending: false })

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
        console.warn('Table opco_declarations does not exist yet or invalid query:', error?.message)
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Créer une déclaration OPCO
   */
  async createDeclaration(declaration: Partial<OPCODeclaration>): Promise<OPCODeclaration> {
    const { data, error } = await this.supabase
      .from('opco_declarations')
      .insert(declaration)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Soumettre une déclaration OPCO
   */
  async submitDeclaration(declarationId: string): Promise<void> {
    // TODO: Implémenter l'appel réel à l'API OPCO
    // Pour l'instant, on met juste à jour le statut

    const { error } = await this.supabase
      .from('opco_declarations')
      .update({
        status: 'submitted',
        submission_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', declarationId)

    if (error) throw error
  }

  /**
   * Récupérer les lignes d'une déclaration
   */
  async getDeclarationLines(declarationId: string): Promise<OPCODeclarationLine[]> {
    const { data, error } = await this.supabase
      .from('opco_declaration_lines')
      .select('*')
      .eq('declaration_id', declarationId)
      .order('start_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Ajouter une ligne à une déclaration
   */
  async addDeclarationLine(line: Partial<OPCODeclarationLine>): Promise<OPCODeclarationLine> {
    const { data, error } = await this.supabase
      .from('opco_declaration_lines')
      .insert(line)
      .select()
      .single()

    if (error) throw error

    // Mettre à jour les totaux de la déclaration
    await this.updateDeclarationTotals(line.declaration_id!)

    return data
  }

  /**
   * Mettre à jour les totaux d'une déclaration
   */
  private async updateDeclarationTotals(declarationId: string): Promise<void> {
    const lines = await this.getDeclarationLines(declarationId)

    const totals = lines.reduce(
      (acc, line) => ({
        total_trainees: acc.total_trainees + 1,
        total_hours: acc.total_hours + line.total_hours,
        total_amount: acc.total_amount + line.total_price,
        requested_funding: acc.requested_funding + line.funding_amount,
      }),
      { total_trainees: 0, total_hours: 0, total_amount: 0, requested_funding: 0 }
    )

    const { error } = await this.supabase
      .from('opco_declarations')
      .update({
        total_trainees: totals.total_trainees,
        total_hours: totals.total_hours,
        total_amount: totals.total_amount,
        requested_funding: totals.requested_funding,
        updated_at: new Date().toISOString(),
      })
      .eq('id', declarationId)

    if (error) throw error
  }

  /**
   * Récupérer les demandes de financement
   */
  async getFundingRequests(organizationId: string, filters?: {
    opcoConfigId?: string
    status?: string
  }): Promise<OPCOFundingRequest[]> {
    let query = this.supabase
      .from('opco_funding_requests')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.opcoConfigId) {
      query = query.eq('opco_config_id', filters.opcoConfigId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

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
        console.warn('Table opco_funding_requests does not exist yet or invalid query:', error?.message)
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Créer une demande de financement
   */
  async createFundingRequest(request: Partial<OPCOFundingRequest>): Promise<OPCOFundingRequest> {
    // Générer un numéro de demande si non fourni
    if (!request.request_number) {
      request.request_number = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    }

    const { data, error } = await this.supabase
      .from('opco_funding_requests')
      .insert(request)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Générer automatiquement une déclaration d'activité pour une période
   */
  async generateActivityDeclaration(
    organizationId: string,
    opcoConfigId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<OPCODeclaration> {
    // Récupérer les formations et stagiaires de la période
    // TODO: Implémenter la récupération réelle depuis les tables de formations
    // Pour l'instant, on crée une déclaration vide

    const declaration: Partial<OPCODeclaration> = {
      organization_id: organizationId,
      opco_config_id: opcoConfigId,
      declaration_type: 'activity',
      declaration_period_start: periodStart,
      declaration_period_end: periodEnd,
      declaration_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      total_trainees: 0,
      total_hours: 0,
      total_amount: 0,
      requested_funding: 0,
      approved_funding: 0,
      paid_funding: 0,
      created_by: (await this.supabase.auth.getUser()).data.user?.id || '',
    }

    return this.createDeclaration(declaration)
  }
}

export const opcoService = new OPCOService()
