/**
 * Service CPF - Gestion du Compte Personnel de Formation
 * Intégration avec Mon Compte Formation
 */

import { createClient } from '@/lib/supabase/client'

export interface CPFConfiguration {
  id: string
  organization_id: string
  cpf_provider_number?: string
  provider_name: string
  siret_number: string
  api_key?: string
  api_secret?: string
  api_endpoint: string
  is_active: boolean
  last_sync_date?: string
  sync_frequency: 'hourly' | 'daily' | 'weekly' | 'manual'
  created_at: string
  updated_at: string
}

export interface CPFLearnerRights {
  id: string
  organization_id: string
  learner_id: string
  cpf_account_number?: string
  total_credits: number
  available_credits: number
  used_credits: number
  last_sync_date?: string
  sync_status: 'pending' | 'synced' | 'error'
  sync_error?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CPFEligibleTraining {
  id: string
  organization_id: string
  training_id?: string
  cpf_training_code?: string
  cpf_training_title: string
  rncp_code?: string
  price: number
  currency: string
  duration_hours?: number
  duration_days?: number
  certification_level?: string
  eligibility_status: 'pending' | 'eligible' | 'rejected' | 'expired'
  eligibility_date?: string
  eligibility_end_date?: string
  cpf_funding_rate: number
  max_learners?: number
  current_learners: number
  description?: string
  prerequisites?: string
  learning_objectives?: string
  created_at: string
  updated_at: string
}

export interface CPFEnrollment {
  id: string
  organization_id: string
  learner_id: string
  training_id: string
  enrollment_date: string
  start_date?: string
  end_date?: string
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'rejected'
  cpf_funding_amount: number
  learner_contribution: number
  total_amount: number
  cpf_transaction_id?: string
  cpf_attestation_number?: string
  attestation_date?: string
  attestation_file_url?: string
  completion_certificate_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CPFAttestation {
  id: string
  organization_id: string
  enrollment_id: string
  attestation_number: string
  attestation_type: 'enrollment' | 'attendance' | 'completion' | 'partial_completion'
  issue_date: string
  validity_start_date?: string
  validity_end_date?: string
  file_url?: string
  file_hash?: string
  status: 'issued' | 'validated' | 'rejected' | 'expired'
  validation_date?: string
  validated_by?: string
  rejection_reason?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export class CPFService {
  private supabase = createClient()

  /**
   * Récupérer la configuration CPF d'une organisation
   */
  async getConfiguration(organizationId: string): Promise<CPFConfiguration | null> {
    const { data, error } = await this.supabase
      .from('cpf_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Créer ou mettre à jour la configuration CPF
   */
  async upsertConfiguration(config: Partial<CPFConfiguration>): Promise<CPFConfiguration> {
    const { data, error } = await this.supabase
      .from('cpf_configurations')
      .upsert(config, {
        onConflict: 'organization_id',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer les droits CPF d'un stagiaire
   */
  async getLearnerRights(organizationId: string, learnerId: string): Promise<CPFLearnerRights | null> {
    const { data, error } = await this.supabase
      .from('cpf_learner_rights')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('learner_id', learnerId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Synchroniser les droits CPF d'un stagiaire avec l'API Mon Compte Formation
   */
  async syncLearnerRights(organizationId: string, learnerId: string): Promise<CPFLearnerRights> {
    // TODO: Implémenter l'appel réel à l'API Mon Compte Formation
    // Pour l'instant, on simule la synchronisation
    
    const config = await this.getConfiguration(organizationId)
    if (!config || !config.is_active) {
      throw new Error('Configuration CPF non active')
    }

    // Simulation - à remplacer par l'appel API réel
    const mockRights = {
      organization_id: organizationId,
      learner_id: learnerId,
      total_credits: 500,
      available_credits: 450,
      used_credits: 50,
      last_sync_date: new Date().toISOString(),
      sync_status: 'synced' as const,
    }

    const { data, error } = await this.supabase
      .from('cpf_learner_rights')
      .upsert(mockRights, {
        onConflict: 'organization_id,learner_id',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer les formations éligibles CPF
   */
  async getEligibleTrainings(organizationId: string): Promise<CPFEligibleTraining[]> {
    const { data, error } = await this.supabase
      .from('cpf_eligible_trainings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('eligibility_status', 'eligible')
      .order('cpf_training_title', { ascending: true })

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
        console.warn('Table cpf_eligible_trainings does not exist yet or invalid query:', error?.message)
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Créer une formation éligible CPF
   */
  async createEligibleTraining(training: Partial<CPFEligibleTraining>): Promise<CPFEligibleTraining> {
    const { data, error } = await this.supabase
      .from('cpf_eligible_trainings')
      .insert(training)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer les inscriptions CPF
   */
  async getEnrollments(organizationId: string, filters?: {
    learnerId?: string
    trainingId?: string
    status?: string
  }): Promise<CPFEnrollment[]> {
    let query = this.supabase
      .from('cpf_enrollments')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.learnerId) {
      query = query.eq('learner_id', filters.learnerId)
    }
    if (filters?.trainingId) {
      query = query.eq('training_id', filters.trainingId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('enrollment_date', { ascending: false })

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
        console.warn('Table cpf_enrollments does not exist yet or invalid query:', error?.message)
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Créer une inscription CPF
   */
  async createEnrollment(enrollment: Partial<CPFEnrollment>): Promise<CPFEnrollment> {
    // Vérifier les droits CPF disponibles
    const rights = await this.getLearnerRights(enrollment.organization_id!, enrollment.learner_id!)
    if (!rights || rights.available_credits < (enrollment.cpf_funding_amount || 0)) {
      throw new Error('Crédits CPF insuffisants')
    }

    const { data, error } = await this.supabase
      .from('cpf_enrollments')
      .insert(enrollment)
      .select()
      .single()

    if (error) throw error

    // Mettre à jour les droits CPF
    await this.supabase
      .from('cpf_learner_rights')
      .update({
        available_credits: rights.available_credits - (enrollment.cpf_funding_amount || 0),
        used_credits: rights.used_credits + (enrollment.cpf_funding_amount || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rights.id)

    return data
  }

  /**
   * Générer une attestation CPF
   */
  async generateAttestation(attestation: Partial<CPFAttestation>): Promise<CPFAttestation> {
    // Générer un numéro d'attestation unique
    const attestationNumber = `CPF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const { data, error } = await this.supabase
      .from('cpf_attestations')
      .insert({
        ...attestation,
        attestation_number: attestationNumber,
        issue_date: new Date().toISOString().split('T')[0],
        status: 'issued',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer les attestations d'une inscription
   */
  async getAttestations(enrollmentId: string): Promise<CPFAttestation[]> {
    const { data, error } = await this.supabase
      .from('cpf_attestations')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .order('issue_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Synchroniser le catalogue depuis un fichier XML
   * Note: L'importation CPF se fait principalement via fichiers XML via le portail EDOF
   * Cette méthode appelle l'API route qui fait le traitement côté serveur
   */
  async syncCatalogFromXML(
    organizationId: string,
    xmlFile: File | string,
    options?: {
      syncType?: 'full' | 'incremental'
      createdBy?: string
    }
  ): Promise<{ syncId: string; result: any }> {
    const config = await this.getConfiguration(organizationId)
    if (!config || !config.is_active) {
      throw new Error('Configuration CPF non active')
    }

    // Créer un FormData pour l'upload
    const formData = new FormData()
    
    if (xmlFile instanceof File) {
      formData.append('file', xmlFile)
    } else {
      // Si c'est une chaîne (URL ou contenu), on ne peut pas l'utiliser directement
      // Dans ce cas, il faudrait télécharger le fichier d'abord
      throw new Error('Le fichier XML doit être un objet File')
    }

    // Appeler l'API route pour le traitement
    const response = await fetch('/api/cpf/catalog-sync', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`)
    }

    const data = await response.json()

    return {
      syncId: data.syncId,
      result: data,
    }
  }

  /**
   * Synchroniser le catalogue depuis l'API Caisse des Dépôts
   * Note: Vérifier la disponibilité de l'API REST pour le catalogue
   */
  async syncCatalogFromAPI(
    organizationId: string,
    options?: {
      syncType?: 'full' | 'incremental'
      createdBy?: string
    }
  ): Promise<{ syncId: string; result: any }> {
    const config = await this.getConfiguration(organizationId)
    if (!config || !config.is_active) {
      throw new Error('Configuration CPF non active')
    }

    if (!config.api_key || !config.api_secret) {
      throw new Error('Clés API CPF non configurées')
    }

    // Créer un log de synchronisation
    const { data: syncLog, error: syncLogError } = await this.supabase
      .from('cpf_catalog_sync')
      .insert({
        organization_id: organizationId,
        sync_type: options?.syncType || 'full',
        sync_method: 'api',
        sync_status: 'in_progress',
        created_by: options?.createdBy,
      })
      .select()
      .single()

    if (syncLogError) throw syncLogError

    try {
      // TODO: Implémenter l'appel à l'API Caisse des Dépôts
      // Pour l'instant, on retourne une structure de base
      // L'implémentation réelle nécessitera:
      // 1. Authentification avec api_key et api_secret
      // 2. Appel à l'endpoint du catalogue CPF
      // 3. Traitement des données reçues
      // 4. Création/mise à jour des formations

      // Mettre à jour le log de synchronisation
      await this.supabase
        .from('cpf_catalog_sync')
        .update({
          sync_status: 'completed',
          completed_at: new Date().toISOString(),
          records_total: 0,
          records_created: 0,
          records_updated: 0,
        })
        .eq('id', syncLog.id)

      return {
        syncId: syncLog.id,
        result: {
          success: true,
          message: 'Synchronisation démarrée (à implémenter)',
        },
      }
    } catch (error: any) {
      // En cas d'erreur, mettre à jour le log
      await this.supabase
        .from('cpf_catalog_sync')
        .update({
          sync_status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
          error_details: { error: error.toString() },
        })
        .eq('id', syncLog.id)

      throw error
    }
  }

  /**
   * Récupérer l'historique des synchronisations du catalogue
   */
  async getCatalogSyncHistory(
    organizationId: string,
    filters?: {
      limit?: number
      status?: string
      syncMethod?: string
    }
  ) {
    let query = this.supabase
      .from('cpf_catalog_sync')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('sync_status', filters.status)
    }
    if (filters?.syncMethod) {
      query = query.eq('sync_method', filters.syncMethod)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Récupérer une synchronisation spécifique
   */
  async getCatalogSyncById(syncId: string) {
    const { data, error } = await this.supabase
      .from('cpf_catalog_sync')
      .select('*')
      .eq('id', syncId)
      .single()

    if (error) throw error
    return data
  }
}

export const cpfService = new CPFService()
