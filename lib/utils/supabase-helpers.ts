/**
 * Helpers réutilisables pour les requêtes Supabase
 * 
 * Réduit la duplication de code dans les services
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { errorHandler, AppError, ErrorCode } from '@/lib/errors'

export interface GetAllByOrganizationOptions {
  filters?: Record<string, unknown>
  orderBy?: { column: string; ascending?: boolean }
  select?: string
  search?: { field: string; value: string }
}

/**
 * Récupère tous les enregistrements d'une organisation avec options
 */
export async function getAllByOrganization<T>(
  supabase: SupabaseClient,
  table: string,
  organizationId: string,
  options?: GetAllByOrganizationOptions
): Promise<T[]> {
  try {
    let query = supabase
      .from(table)
      .select(options?.select || '*')
      .eq('organization_id', organizationId)

    // Appliquer les filtres
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
    }

    // Appliquer la recherche
    if (options?.search) {
      query = query.ilike(options.search.field, `%${options.search.value}%`)
    }

    // Appliquer le tri
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? false,
      })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      throw errorHandler.handleError(error, {
        organizationId,
        operation: 'getAllByOrganization',
        table,
      })
    }

    return (data || []) as T[]
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw errorHandler.handleError(error, {
      organizationId,
      operation: 'getAllByOrganization',
      table,
    })
  }
}

/**
 * Récupère un enregistrement par ID avec gestion d'erreur
 */
export async function getById<T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  select?: string
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(select || '*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        throw errorHandler.handleError(error, {
          code: ErrorCode.DB_NOT_FOUND,
          operation: 'getById',
          id,
          table,
        })
      }
      throw errorHandler.handleError(error, {
        operation: 'getById',
        id,
        table,
      })
    }

    if (!data) {
      throw errorHandler.createDatabaseError(
        `Enregistrement avec l'ID ${id} introuvable dans ${table}`,
        { id, table }
      )
    }

    return data as T
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw errorHandler.handleError(error, {
      operation: 'getById',
      id,
      table,
    })
  }
}

