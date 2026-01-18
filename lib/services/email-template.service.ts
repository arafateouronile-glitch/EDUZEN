import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TableRow } from '@/lib/types/supabase-helpers'

export type EmailTemplate = TableRow<'email_templates'>

export type EmailType = 
  | 'document_generated' 
  | 'invoice_sent' 
  | 'payment_reminder' 
  | 'notification' 
  | 'enrollment_confirmation'
  | 'session_reminder'
  | 'certificate_issued'
  | 'custom'

export interface CreateEmailTemplateInput {
  organization_id: string
  email_type: EmailType
  name: string
  subject: string
  body_html: string
  body_text?: string
  available_variables?: string[]
  is_default?: boolean
  is_active?: boolean
  description?: string
  metadata?: Record<string, any>
}

export interface UpdateEmailTemplateInput {
  name?: string
  subject?: string
  body_html?: string
  body_text?: string
  available_variables?: string[]
  is_default?: boolean
  is_active?: boolean
  description?: string
  metadata?: Record<string, any>
}

class EmailTemplateService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupérer tous les modèles d'une organisation
   */
  async getAll(organizationId: string): Promise<EmailTemplate[]> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('email_type', { ascending: true })
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Récupérer les modèles par type
   */
  async getByType(organizationId: string, emailType: EmailType): Promise<EmailTemplate[]> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email_type', emailType)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Récupérer le modèle par défaut pour un type
   */
  async getDefault(organizationId: string, emailType: EmailType): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email_type', emailType)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Récupérer un modèle par ID
   */
  async getById(id: string): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Créer un nouveau modèle
   */
  async create(input: CreateEmailTemplateInput, userId: string): Promise<EmailTemplate> {
    // Si ce modèle est marqué comme défaut, désactiver les autres modèles par défaut du même type
    if (input.is_default) {
      await this.unsetOtherDefaults(input.organization_id, input.email_type)
    }

    const { data, error } = await this.supabase
      .from('email_templates')
      .insert({
        ...input,
        created_by: userId,
        available_variables: input.available_variables || [],
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Mettre à jour un modèle
   */
  async update(id: string, input: UpdateEmailTemplateInput): Promise<EmailTemplate> {
    // Récupérer le modèle actuel pour connaître son type
    const current = await this.getById(id)
    if (!current) throw new Error('Modèle non trouvé')

    // Si ce modèle est marqué comme défaut, désactiver les autres modèles par défaut du même type
    if (input.is_default) {
      await this.unsetOtherDefaults(current.organization_id, current.email_type as EmailType, id)
    }

    const { data, error } = await this.supabase
      .from('email_templates')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprimer un modèle (soft delete en désactivant)
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('email_templates')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Supprimer définitivement un modèle
   */
  async deletePermanently(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('email_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Désactiver les autres modèles par défaut du même type
   */
  private async unsetOtherDefaults(
    organizationId: string, 
    emailType: EmailType, 
    excludeId?: string
  ): Promise<void> {
    let query = this.supabase
      .from('email_templates')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('email_type', emailType)
      .eq('is_default', true)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { error } = await query
    if (error) throw error
  }

  /**
   * Remplacer les variables dans un template
   */
  replaceVariables(template: string, variables: Record<string, string | number | undefined>): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      result = result.replace(regex, value?.toString() || '')
    }
    return result
  }

  /**
   * Obtenir les types d'emails disponibles avec leurs labels
   */
  getEmailTypes(): Array<{ value: EmailType; label: string; description: string; defaultVariables: string[] }> {
    return [
      {
        value: 'document_generated',
        label: 'Document généré',
        description: 'Email envoyé lors de la génération d\'un document',
        defaultVariables: ['student_name', 'document_title', 'document_type', 'organization_name', 'document_url'],
      },
      {
        value: 'invoice_sent',
        label: 'Facture envoyée',
        description: 'Email envoyé lors de l\'envoi d\'une facture',
        defaultVariables: ['student_name', 'invoice_number', 'invoice_amount', 'due_date', 'organization_name', 'invoice_url'],
      },
      {
        value: 'payment_reminder',
        label: 'Rappel de paiement',
        description: 'Email de rappel pour un paiement en attente',
        defaultVariables: ['student_name', 'invoice_number', 'invoice_amount', 'due_date', 'days_overdue', 'organization_name'],
      },
      {
        value: 'enrollment_confirmation',
        label: 'Confirmation d\'inscription',
        description: 'Email de confirmation d\'inscription à une session',
        defaultVariables: ['student_name', 'session_name', 'session_start_date', 'session_location', 'organization_name'],
      },
      {
        value: 'session_reminder',
        label: 'Rappel de session',
        description: 'Email de rappel avant une session',
        defaultVariables: ['student_name', 'session_name', 'session_date', 'session_time', 'session_location', 'organization_name'],
      },
      {
        value: 'certificate_issued',
        label: 'Certificat délivré',
        description: 'Email lors de la délivrance d\'un certificat',
        defaultVariables: ['student_name', 'certificate_name', 'certificate_date', 'organization_name', 'certificate_url'],
      },
      {
        value: 'notification',
        label: 'Notification générale',
        description: 'Notification générale personnalisée',
        defaultVariables: ['recipient_name', 'message', 'organization_name', 'action_url'],
      },
      {
        value: 'custom',
        label: 'Personnalisé',
        description: 'Modèle d\'email personnalisé',
        defaultVariables: [],
      },
    ]
  }
}

export const emailTemplateService = new EmailTemplateService()
