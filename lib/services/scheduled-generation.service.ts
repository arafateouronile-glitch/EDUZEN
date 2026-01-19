/**
 * Service pour la génération programmée de documents
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { DocumentType, DocumentVariables } from '@/lib/types/document-templates'

type ScheduledGeneration = any
type ScheduledGenerationInsert = any
type ScheduledGenerationUpdate = any

export interface ScheduledGenerationConfig {
  template_id: string
  organization_id: string
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom'
  schedule_config: {
    time?: string // Format HH:MM
    day_of_week?: number // 0-6 (Dimanche-Samedi)
    day_of_month?: number // 1-31
    cron_expression?: string // Expression cron personnalisée
  }
  filter_criteria?: {
    student_ids?: string[]
    session_ids?: string[]
    enrollment_ids?: string[]
    custom_filters?: Record<string, unknown>
  }
  format: 'PDF' | 'DOCX' | 'HTML'
  send_email?: boolean
  email_recipients?: string[]
  enabled: boolean
  variables?: DocumentVariables
}

export class ScheduledGenerationService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  /**
   * Crée une nouvelle génération programmée
   */
  async create(config: ScheduledGenerationConfig): Promise<ScheduledGeneration> {
    const { data, error } = await (this.supabase as any)
      .from('scheduled_generations')
      .insert({
        template_id: config.template_id,
        organization_id: config.organization_id,
        schedule_type: config.schedule_type,
        schedule_config: config.schedule_config,
        filter_criteria: config.filter_criteria || {},
        format: config.format,
        send_email: config.send_email || false,
        email_recipients: config.email_recipients || [],
        enabled: config.enabled,
        variables: config.variables || {},
      } as ScheduledGenerationInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère toutes les générations programmées d'une organisation
   */
  async getAll(organizationId: string): Promise<ScheduledGeneration[]> {
    const { data, error } = await (this.supabase as any)
      .from('scheduled_generations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Récupère une génération programmée par ID
   */
  async getById(id: string): Promise<ScheduledGeneration | null> {
    const { data, error } = await (this.supabase as any)
      .from('scheduled_generations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Met à jour une génération programmée
   */
  async update(
    id: string,
    updates: Partial<ScheduledGenerationConfig>
  ): Promise<ScheduledGeneration> {
    const { data, error } = await (this.supabase as any)
      .from('scheduled_generations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      } as ScheduledGenerationUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Active ou désactive une génération programmée
   */
  async setEnabled(id: string, enabled: boolean): Promise<ScheduledGeneration> {
    return this.update(id, { enabled })
  }

  /**
   * Supprime une génération programmée
   */
  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('scheduled_generations')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Récupère les générations programmées à exécuter maintenant
   */
  async getDueGenerations(): Promise<ScheduledGeneration[]> {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentDayOfWeek = now.getDay()
    const currentDayOfMonth = now.getDate()

    const { data, error } = await (this.supabase as any)
      .from('scheduled_generations')
      .select('*')
      .eq('enabled', true)

    if (error) throw error

    // Filtrer les générations qui doivent être exécutées maintenant
    return (data || []).filter((gen: any) => {
      const config = (gen as any).schedule_config as { time?: string; day_of_week?: number; day_of_month?: number; cron_expression?: string }

      if ((gen as any).schedule_type === 'daily') {
        const [hour, minute] = (config.time || '00:00').split(':').map(Number)
        return currentHour === hour && currentMinute === minute
      }

      if ((gen as any).schedule_type === 'weekly') {
        const [hour, minute] = (config.time || '00:00').split(':').map(Number)
        const dayOfWeek = config.day_of_week ?? 0
        return (
          currentDayOfWeek === dayOfWeek &&
          currentHour === hour &&
          currentMinute === minute
        )
      }

      if ((gen as any).schedule_type === 'monthly') {
        const [hour, minute] = (config.time || '00:00').split(':').map(Number)
        const dayOfMonth = config.day_of_month ?? 1
        return (
          currentDayOfMonth === dayOfMonth &&
          currentHour === hour &&
          currentMinute === minute
        )
      }

      // Pour 'custom', on devrait utiliser une bibliothèque cron
      // Pour l'instant, on retourne false
      return false
    })
  }

  /**
   * Marque une génération comme exécutée
   */
  async markAsExecuted(id: string, result: { success: boolean; error?: string }): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('scheduled_generations')
      .update({
        last_executed_at: new Date().toISOString(),
        last_execution_result: result,
        execution_count: (await this.getById(id))?.execution_count || 0 + 1,
      } as ScheduledGenerationUpdate)
      .eq('id', id)

    if (error) throw error
  }
}

// Note: scheduledGenerationService doit être instancié avec un client Supabase
// Pour les routes API: new ScheduledGenerationService(await createClient()) avec le client serveur
// Pour les composants client: new ScheduledGenerationService(createClient()) avec le client client
