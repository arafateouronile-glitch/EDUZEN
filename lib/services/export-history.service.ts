/**
 * Service pour gérer l'historique des exports
 *
 * NOTE: La table 'export_history' n'existe pas encore dans Supabase.
 * Les types sont définis manuellement ici jusqu'à ce que la table soit créée
 * et les types régénérés avec: supabase gen types typescript
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// Types définis manuellement car la table n'existe pas encore dans database.types.ts
// TODO: Supprimer ces définitions après avoir créé la table et régénéré les types
export type ExportType = 'excel' | 'csv' | 'pdf'
export type EntityType = 'students' | 'documents' | 'payments' | 'dashboard_report' | 'attendance_report' | 'other'

export interface ExportHistory {
  id: string
  organization_id: string
  user_id: string
  export_type: ExportType
  entity_type: EntityType
  filename: string
  record_count: number
  file_size_bytes: number | null
  filters: string | null
  created_at: string
}

type ExportHistoryInsert = Omit<ExportHistory, 'id' | 'created_at'>

export interface ExportHistoryWithUser extends ExportHistory {
  users?: {
    full_name: string | null
    email: string
  } | null
}

export interface CreateExportHistoryParams {
  organizationId: string
  userId: string
  exportType: ExportType
  entityType: EntityType
  filename: string
  recordCount?: number
  fileSizeBytes?: number
  filters?: Record<string, any>
}

export class ExportHistoryService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Enregistre un export dans l'historique
   * Retourne null si la table n'existe pas (non bloquant)
   */
  async create(params: CreateExportHistoryParams): Promise<ExportHistory | null> {
    try {
      const { data, error } = await this.supabase
        .from('export_history')
        .insert({
          organization_id: params.organizationId,
          user_id: params.userId,
          export_type: params.exportType,
          entity_type: params.entityType,
          filename: params.filename,
          record_count: params.recordCount || 0,
          file_size_bytes: params.fileSizeBytes,
          filters: params.filters ? JSON.stringify(params.filters) : null,
        })
        .select()
        .single()

      if (error) {
        // Si la table n'existe pas, retourner null silencieusement
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          return null
        }
        throw error
      }
      return data
    } catch (error: any) {
      // Si la table n'existe pas, retourner null silencieusement
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        return null
      }
      throw error
    }
  }

  /**
   * Récupère l'historique des exports d'une organisation
   */
  async getByOrganization(
    organizationId: string,
    filters?: {
      userId?: string
      exportType?: ExportType
      entityType?: EntityType
      page?: number
      limit?: number
    }
  ) {
    try {
      const page = filters?.page || 1
      const limit = filters?.limit || 50
      const offset = (page - 1) * limit

      let query = this.supabase
        .from('export_history')
        .select('*, users(full_name, email)', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters?.exportType) {
        query = query.eq('export_type', filters.exportType)
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType)
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) {
        // Si la table n'existe pas encore ou erreur 400/404, retourner un résultat vide
        if (
          error.code === 'PGRST116' ||
          error.code === 'PGRST200' ||
          error.code === '42P01' ||
          error.code === 'PGRST301' ||
          (error as any).status === 400 ||
          (error as any).status === 404 ||
          error.code === '400' ||
          error.code === '404' ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          return {
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          }
        }
        throw error
      }

      return {
        data: (data || []) as ExportHistoryWithUser[],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      }
    } catch (error: any) {
      // Gérer les erreurs de table inexistante
      if (
        error?.code === 'PGRST116' ||
        error?.code === 'PGRST200' ||
        error?.code === '42P01' ||
        error?.code === 'PGRST301' ||
        error?.status === 400 ||
        error?.status === 404 ||
        error?.code === '400' ||
        error?.code === '404' ||
        error?.message?.includes('relation') ||
        error?.message?.includes('does not exist')
      ) {
        return {
          data: [],
          total: 0,
          page: filters?.page || 1,
          limit: filters?.limit || 50,
          totalPages: 0,
        }
      }
      throw error
    }
  }

  /**
   * Récupère les statistiques d'export d'une organisation
   */
  async getStats(organizationId: string) {
    try {
      const { data, error } = await this.supabase
        .from('export_history')
        .select('export_type, entity_type, record_count, file_size_bytes')
        .eq('organization_id', organizationId)

      if (error) {
        // Si la table n'existe pas encore ou erreur 400/404, retourner des stats vides
        if (
          error.code === 'PGRST116' ||
          error.code === 'PGRST200' ||
          error.code === '42P01' ||
          error.code === 'PGRST301' ||
          (error as any).status === 400 ||
          (error as any).status === 404 ||
          error.code === '400' ||
          error.code === '404' ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          return {
            total: 0,
            byType: {} as Record<ExportType, number>,
            byEntity: {} as Record<EntityType, number>,
            totalRecords: 0,
            totalSizeBytes: 0,
          }
        }
        throw error
      }

      const stats = {
        total: data?.length || 0,
        byType: {} as Record<ExportType, number>,
        byEntity: {} as Record<EntityType, number>,
        totalRecords: 0,
        totalSizeBytes: 0,
      }

      data?.forEach((export_) => {
        stats.byType[export_.export_type as ExportType] =
          (stats.byType[export_.export_type as ExportType] || 0) + 1
        stats.byEntity[export_.entity_type as EntityType] =
          (stats.byEntity[export_.entity_type as EntityType] || 0) + 1
        stats.totalRecords += export_.record_count || 0
        stats.totalSizeBytes += export_.file_size_bytes || 0
      })

      return stats
    } catch (error: any) {
      // Gérer les erreurs de table inexistante
      if (
        error?.code === 'PGRST116' ||
        error?.code === 'PGRST200' ||
        error?.code === '42P01' ||
        error?.code === 'PGRST301' ||
        error?.status === 400 ||
        error?.status === 404 ||
        error?.code === '400' ||
        error?.code === '404' ||
        error?.message?.includes('relation') ||
        error?.message?.includes('does not exist')
      ) {
        return {
          total: 0,
          byType: {} as Record<ExportType, number>,
          byEntity: {} as Record<EntityType, number>,
          totalRecords: 0,
          totalSizeBytes: 0,
        }
      }
      throw error
    }
  }

  /**
   * Supprime un export de l'historique
   */
  async delete(exportId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('export_history')
      .delete()
      .eq('id', exportId)
      .eq('user_id', userId) // Sécurité : seul le créateur peut supprimer

    if (error) throw error
  }

  /**
   * Supprime tous les exports d'un utilisateur
   */
  async deleteByUser(userId: string, organizationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('export_history')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error
  }
}

export const exportHistoryService = new ExportHistoryService()

