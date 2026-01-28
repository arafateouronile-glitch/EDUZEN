/**
 * Service RGPD - Gestion de la conformité RGPD
 * Droit à l'oubli, portabilité, consentements, registre des traitements
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface GDPRConsent {
  id: string
  organization_id: string
  user_id: string
  consent_type: 'marketing' | 'analytics' | 'cookies' | 'data_sharing' | 'third_party' | 'other'
  purpose: string
  granted: boolean
  granted_at?: string
  withdrawn_at?: string
  ip_address?: string
  user_agent?: string
  consent_method?: 'web_form' | 'email' | 'paper' | 'phone' | 'api' | 'other'
  version?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface GDPRProcessingRegistry {
  id: string
  organization_id: string
  processing_name: string
  processing_purpose: string
  legal_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests'
  data_categories: string[]
  data_subjects: string[]
  recipients?: string[]
  transfers_outside_eu: boolean
  transfers_countries?: string[]
  retention_period?: string
  security_measures?: string[]
  data_protection_officer_id?: string
  status: 'draft' | 'active' | 'archived' | 'deleted'
  last_review_date?: string
  next_review_date?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface GDPRDataSubjectRequest {
  id: string
  organization_id: string
  user_id?: string
  request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection' | 'withdraw_consent'
  request_status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
  request_date: string
  requested_by_name: string
  requested_by_email: string
  requested_by_phone?: string
  identity_verification_method?: 'email' | 'id_card' | 'phone' | 'other'
  identity_verified: boolean
  identity_verified_at?: string
  verified_by?: string
  description?: string
  response_data?: Record<string, unknown>
  response_file_url?: string
  completed_at?: string
  completed_by?: string
  rejection_reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface GDPRDataBreach {
  id: string
  organization_id: string
  breach_type: 'confidentiality' | 'integrity' | 'availability'
  breach_date: string
  discovery_date: string
  description: string
  affected_data_categories?: string[]
  affected_data_subjects_count?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  notification_required: boolean
  cnil_notified: boolean
  cnil_notification_date?: string
  data_subjects_notified: boolean
  data_subjects_notification_date?: string
  measures_taken?: string[]
  preventive_measures?: string[]
  status: 'open' | 'investigating' | 'remediated' | 'closed'
  closed_at?: string
  closed_by?: string
  reported_by: string
  created_at: string
  updated_at: string
}

export class GDPRService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupérer les consentements d'un utilisateur
   */
  async getUserConsents(organizationId: string, userId: string): Promise<GDPRConsent[]> {
    const { data, error } = await this.supabase
      .from('gdpr_consents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Donner ou retirer un consentement
   */
  async updateConsent(consent: Partial<GDPRConsent>): Promise<GDPRConsent> {
    const updateData: Record<string, unknown> = {
      ...consent,
      updated_at: new Date().toISOString(),
    }

    if (consent.granted) {
      updateData.granted_at = new Date().toISOString()
      updateData.withdrawn_at = null
    } else {
      updateData.withdrawn_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('gdpr_consents')
      .upsert(updateData, {
        onConflict: 'organization_id,user_id,consent_type',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer le registre des traitements
   */
  async getProcessingRegistry(organizationId: string): Promise<GDPRProcessingRegistry[]> {
    const { data, error } = await this.supabase
      .from('gdpr_processing_registry')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('processing_name', { ascending: true })

    // Si la table n'existe pas, retourner un tableau vide
    if (error) {
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (errorObj.code === 'PGRST200' || errorObj.status === 404 || errorObj.message?.includes('does not exist')) {
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Créer ou mettre à jour une entrée du registre
   */
  async upsertProcessingRegistry(entry: Partial<GDPRProcessingRegistry>): Promise<GDPRProcessingRegistry> {
    const { data, error } = await this.supabase
      .from('gdpr_processing_registry')
      .upsert(entry, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Créer une demande de droits RGPD
   */
  async createDataSubjectRequest(request: Partial<GDPRDataSubjectRequest>): Promise<GDPRDataSubjectRequest> {
    const { data, error } = await this.supabase
      .from('gdpr_data_subject_requests')
      .insert(request)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupérer les demandes de droits RGPD
   */
  async getDataSubjectRequests(organizationId: string, filters?: {
    userId?: string
    requestType?: string
    status?: string
  }): Promise<GDPRDataSubjectRequest[]> {
    let query = this.supabase
      .from('gdpr_data_subject_requests')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters?.requestType) {
      query = query.eq('request_type', filters.requestType)
    }
    if (filters?.status) {
      query = query.eq('request_status', filters.status)
    }

    const { data, error } = await query.order('request_date', { ascending: false })

    // Si la table n'existe pas, retourner un tableau vide
    if (error) {
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (errorObj.code === 'PGRST200' || errorObj.status === 404 || errorObj.message?.includes('does not exist')) {
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Exporter les données d'un utilisateur (portabilité)
   */
  async exportUserData(organizationId: string, userId: string): Promise<{
    exportId: string
    fileUrl: string
  }> {
    // Récupérer toutes les données de l'utilisateur
    const userData = {
      profile: await this.getUserProfile(userId),
      enrollments: await this.getUserEnrollments(userId),
      payments: await this.getUserPayments(organizationId, userId),
      documents: await this.getUserDocuments(organizationId, userId),
      consents: await this.getUserConsents(organizationId, userId),
    }

    // Créer un export
    const { data: exportRecord, error } = await this.supabase
      .from('gdpr_data_exports')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        export_format: 'json',
        file_url: '', // NOTE: Fonctionnalité prévue - Générer le fichier JSON/ZIP et uploader vers Supabase Storage
        data_categories: Object.keys(userData),
        created_by: (await this.supabase.auth.getUser()).data.user?.id || '',
      })
      .select()
      .single()

    if (error) throw error

    // NOTE: Fonctionnalité prévue - Générer le fichier JSON/ZIP et uploader vers Supabase Storage
    // Le fichier devrait contenir toutes les données de l'utilisateur au format JSON ou ZIP
    // Pour l'instant, on retourne juste l'ID

    return {
      exportId: exportRecord.id,
      fileUrl: exportRecord.file_url || '',
    }
  }

  /**
   * Supprimer les données d'un utilisateur (droit à l'oubli)
   */
  async deleteUserData(
    organizationId: string,
    userId: string,
    deletionType: 'full' | 'partial' | 'anonymization' = 'anonymization'
  ): Promise<{
    deletionId: string
    status: string
  }> {
    // Créer un enregistrement de suppression
    const { data: deletionRecord, error } = await this.supabase
      .from('gdpr_data_deletions')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        deletion_type: deletionType,
        data_categories: ['all'], // NOTE: À améliorer - Détailler les catégories réelles (personal_data, financial_data, etc.)
        deletion_status: 'pending',
        performed_by: (await this.supabase.auth.getUser()).data.user?.id || '',
      })
      .select()
      .single()

    if (error) throw error

    // NOTE: Fonctionnalité prévue - Suppression/anonymisation réelle des données
    // Nécessite: Implémenter la logique de suppression/anonymisation selon le type de données
    // Pour l'instant, on retourne juste l'enregistrement

    return {
      deletionId: deletionRecord.id,
      status: deletionRecord.deletion_status,
    }
  }

  /**
   * Récupérer les violations de données
   */
  async getDataBreaches(organizationId: string): Promise<GDPRDataBreach[]> {
    const { data, error } = await this.supabase
      .from('gdpr_data_breaches')
      .select('*')
      .eq('organization_id', organizationId)
      .order('breach_date', { ascending: false })

    // Si la table n'existe pas, retourner un tableau vide
    if (error) {
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (errorObj.code === 'PGRST200' || errorObj.status === 404 || errorObj.message?.includes('does not exist')) {
        return []
      }
      throw error
    }
    return data || []
  }

  /**
   * Créer une violation de données
   */
  async createDataBreach(breach: Partial<GDPRDataBreach>): Promise<GDPRDataBreach> {
    const { data, error } = await this.supabase
      .from('gdpr_data_breaches')
      .insert(breach)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Notifier la CNIL d'une violation
   */
  async notifyCNIL(breachId: string): Promise<void> {
    // NOTE: Fonctionnalité prévue - Envoi réel à la CNIL
    // Nécessite: Intégration avec l'API CNIL ou envoi d'email formaté selon les exigences CNIL
    // Pour l'instant, on met juste à jour le statut

    const { error } = await this.supabase
      .from('gdpr_data_breaches')
      .update({
        cnil_notified: true,
        cnil_notification_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', breachId)

    if (error) throw error
  }

  // Méthodes privées pour récupérer les données utilisateur
  private async getUserProfile(userId: string) {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return data
  }

  private async getUserEnrollments(userId: string) {
    const { data } = await this.supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', userId)
    return data || []
  }

  private async getUserPayments(organizationId: string, userId: string) {
    const { data } = await this.supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('student_id', userId)
    return data || []
  }

  private async getUserDocuments(organizationId: string, userId: string) {
    const { data } = await this.supabase
      .from('generated_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('student_id', userId)
    return data || []
  }
}

export const gdprService = new GDPRService()
