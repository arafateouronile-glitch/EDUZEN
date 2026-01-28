/**
 * Service pour gérer la planification et l'automatisation d'envoi d'emails
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { EmailTemplate } from './email-template.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

type EmailSchedule = Database['public']['Tables']['email_schedules']['Row']
type EmailScheduleInsert = Database['public']['Tables']['email_schedules']['Insert']
type EmailScheduleUpdate = Database['public']['Tables']['email_schedules']['Update']
type EmailScheduleLog = Database['public']['Tables']['email_schedule_logs']['Row']
type EmailScheduleLogInsert = Database['public']['Tables']['email_schedule_logs']['Insert']

export type EmailScheduleTriggerType = 
  | 'before_session_start'
  | 'after_session_end'
  | 'before_evaluation_start'
  | 'after_evaluation_end'
  | 'fixed_date'

export type EmailScheduleTargetType = 
  | 'session'
  | 'evaluation'
  | 'student'
  | 'teacher'
  | 'all'

export type DocumentType = 
  | 'convocation'
  | 'certificat_realisation'
  | 'evaluation_pre_formation'
  | 'evaluation_post_formation'
  | 'attestation'
  | 'bulletin'
  | 'releve_notes'
  | 'certificat_presence'

export interface CreateEmailScheduleInput {
  name: string
  description?: string
  email_type: string
  template_id?: string
  trigger_type: EmailScheduleTriggerType
  trigger_days?: number
  trigger_time?: string
  trigger_datetime?: string
  target_type: EmailScheduleTargetType
  session_status?: string[]
  session_id?: string
  formation_id?: string
  program_id?: string
  is_active?: boolean
  send_to_students?: boolean
  send_to_teachers?: boolean
  send_to_coordinators?: boolean
  custom_variables?: Record<string, any>
  send_document?: boolean
  document_type?: DocumentType
  document_template_id?: string
}

export interface UpdateEmailScheduleInput extends Partial<CreateEmailScheduleInput> {
  id?: string // Optionnel car passé comme paramètre séparé dans updateSchedule
}

export interface EmailScheduleExecutionResult {
  scheduleId: string
  status: 'success' | 'failed' | 'partial'
  totalRecipients: number
  successfulSends: number
  failedSends: number
  errorMessage?: string
  errorDetails?: Record<string, any>
}

export class EmailScheduleService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  /**
   * Récupère toutes les règles de planification d'une organisation
   */
  async getAllSchedules(organizationId: string, filters?: {
    isActive?: boolean
    emailType?: string
  }) {
    let query = this.supabase
      .from('email_schedules')
      .select('*, email_templates(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    if (filters?.emailType) {
      query = query.eq('email_type', filters.emailType)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Récupère une règle de planification par son ID
   */
  async getScheduleById(id: string) {
    const { data, error } = await this.supabase
      .from('email_schedules')
      .select('*, email_templates(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Crée une nouvelle règle de planification
   */
  async createSchedule(organizationId: string, input: CreateEmailScheduleInput) {
    const { data: user } = await this.supabase.auth.getUser()
    
    // Construire l'objet schedule en ne gardant que les champs définis
    const schedule: Partial<EmailScheduleInsert> = {
      organization_id: organizationId,
      name: input.name,
      email_type: input.email_type,
      trigger_type: input.trigger_type,
      target_type: input.target_type,
      is_active: input.is_active ?? true,
      send_to_students: input.send_to_students ?? true,
      send_to_teachers: input.send_to_teachers ?? false,
      send_to_coordinators: input.send_to_coordinators ?? false,
    }

    // Ajouter les champs optionnels seulement s'ils sont définis
    if (input.description !== undefined) {
      schedule.description = input.description || null
    }
    if (input.template_id !== undefined) {
      schedule.template_id = input.template_id || null
    }
    if (input.trigger_days !== undefined) {
      schedule.trigger_days = input.trigger_days ?? null
    }
    if (input.trigger_time !== undefined) {
      schedule.trigger_time = input.trigger_time || null
    }
    if (input.trigger_datetime !== undefined) {
      schedule.trigger_datetime = input.trigger_datetime || null
    }
    if (input.session_status !== undefined) {
      schedule.session_status = input.session_status || null
    }
    if (input.session_id !== undefined) {
      schedule.session_id = input.session_id || null
    }
    if (input.formation_id !== undefined) {
      schedule.formation_id = input.formation_id || null
    }
    if (input.program_id !== undefined) {
      schedule.program_id = input.program_id || null
    }
    if (input.custom_variables !== undefined) {
      schedule.custom_variables = input.custom_variables || null
    }
    if (input.send_document !== undefined) {
      schedule.send_document = input.send_document ?? false
    }
    if (input.document_type !== undefined) {
      schedule.document_type = input.document_type || null
    }
    if (input.document_template_id !== undefined) {
      schedule.document_template_id = input.document_template_id || null
    }
    if (user?.user?.id) {
      schedule.created_by = user.user.id
    }

    const { data, error } = await this.supabase
      .from('email_schedules')
      .insert(schedule as EmailScheduleInsert)
      .select()
      .single()

    if (error) {
      logger.error('EmailScheduleService - Error creating email schedule', error, { error: sanitizeError(error) })
      throw error
    }
    return data
  }

  /**
   * Met à jour une règle de planification
   */
  async updateSchedule(id: string, input: UpdateEmailScheduleInput) {
    const update: EmailScheduleUpdate = {
      name: input.name,
      description: input.description,
      email_type: input.email_type,
      template_id: input.template_id,
      trigger_type: input.trigger_type,
      trigger_days: input.trigger_days,
      trigger_time: input.trigger_time,
      trigger_datetime: input.trigger_datetime,
      target_type: input.target_type,
      session_status: input.session_status,
      formation_id: input.formation_id,
      program_id: input.program_id,
      is_active: input.is_active,
      send_to_students: input.send_to_students,
      send_to_teachers: input.send_to_teachers,
      send_to_coordinators: input.send_to_coordinators,
      custom_variables: input.custom_variables,
      send_document: input.send_document,
      document_type: input.document_type,
      document_template_id: input.document_template_id,
    }

    // Supprimer les champs undefined
    Object.keys(update).forEach(key => {
      if (update[key as keyof EmailScheduleUpdate] === undefined) {
        delete update[key as keyof EmailScheduleUpdate]
      }
    })

    const { data, error } = await this.supabase
      .from('email_schedules')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime une règle de planification
   */
  async deleteSchedule(id: string) {
    const { error } = await this.supabase
      .from('email_schedules')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Récupère les règles actives à exécuter
   */
  async getActiveSchedulesToExecute() {
    const { data, error } = await this.supabase
      .from('email_schedules')
      .select('*, email_templates(*), organizations(*)')
      .eq('is_active', true)

    if (error) throw error
    return data || []
  }

  /**
   * Enregistre un log d'exécution
   */
  async logExecution(
    scheduleId: string,
    organizationId: string,
    result: EmailScheduleExecutionResult,
    triggerContext?: Record<string, any>
  ) {
    const log: EmailScheduleLogInsert = {
      schedule_id: scheduleId,
      organization_id: organizationId,
      status: result.status,
      total_recipients: result.totalRecipients,
      successful_sends: result.successfulSends,
      failed_sends: result.failedSends,
      error_message: result.errorMessage || null,
      error_details: result.errorDetails || null,
      trigger_context: triggerContext || null,
    }

    const { data, error } = await this.supabase
      .from('email_schedule_logs')
      .insert(log)
      .select()
      .single()

    if (error) throw error

    // Mettre à jour les statistiques de la règle
    // Récupérer la valeur actuelle de total_sent
    const { data: scheduleData } = await this.supabase
      .from('email_schedules')
      .select('total_sent')
      .eq('id', scheduleId)
      .single()
    
    const currentTotalSent = (scheduleData?.total_sent as number) || 0
    const newTotalSent = currentTotalSent + result.successfulSends

    await this.supabase
      .from('email_schedules')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: result.status,
        last_run_error: result.errorMessage || null,
        total_sent: newTotalSent,
      })
      .eq('id', scheduleId)

    return data
  }

  /**
   * Récupère l'historique d'exécution d'une règle
   */
  async getScheduleLogs(scheduleId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from('email_schedule_logs')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('executed_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }
}

// Note: emailScheduleService doit être instancié avec un client Supabase
// Pour les routes API: new EmailScheduleService(await createClient()) avec le client serveur
// Pour les composants client: new EmailScheduleService(createClient()) avec le client client

