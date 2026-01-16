/**
 * EXEMPLE DE SERVICE STANDARDISÉ
 * 
 * Ce fichier montre comment standardiser un service avec l'ErrorHandler.
 * Utilisez ce modèle pour refactoriser tous les services.
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { errorHandler, ErrorCode, AppError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'

// Types
type ExampleEntity = TableRow<'example_table'>
type ExampleInsert = TableInsert<'example_table'>
type ExampleUpdate = TableUpdate<'example_table'>

export class ExampleStandardizedService {
  private supabase = createClient()

  /**
   * Récupère tous les enregistrements d'une organisation
   * 
   * AVANT :
   *   if (error) throw error
   * 
   * APRÈS :
   *   Utilise errorHandler.handleError() pour une gestion cohérente
   */
  async getAll(organizationId: string, filters?: {
    status?: string
    search?: string
  }) {
    try {
      let query = this.supabase
        .from('example_table')
        .select('*')
        .eq('organization_id', organizationId)

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw errorHandler.handleError(error, {
          organizationId,
          operation: 'getAll',
          filters,
        })
      }

      return data || []
    } catch (error) {
      // Si c'est déjà une AppError, la relancer
      if (error instanceof AppError) {
        throw error
      }
      // Sinon, la convertir
      throw errorHandler.handleError(error, {
        organizationId,
        operation: 'getAll',
      })
    }
  }

  /**
   * Récupère un enregistrement par son ID
   */
  async getById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from('example_table')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        // Erreur spécifique pour "not found"
        if (error.code === 'PGRST116' || error.code === '42P01') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_NOT_FOUND,
            operation: 'getById',
            id,
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'getById',
          id,
        })
      }

      if (!data) {
        throw errorHandler.createDatabaseError(
          `Enregistrement avec l'ID ${id} introuvable`,
          { id }
        )
      }

      return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'getById',
        id,
      })
    }
  }

  /**
   * Crée un nouvel enregistrement
   */
  async create(entity: FlexibleInsert<'example_table'>) {
    try {
      // Validation avant insertion
      if (!entity.name) {
        throw errorHandler.createValidationError(
          'Le nom est obligatoire',
          'name'
        )
      }

      const { data, error } = await this.supabase
        .from('example_table')
        .insert(entity as ExampleInsert)
        .select()
        .single()

      if (error) {
        // Erreur spécifique pour contrainte unique
        if (error.code === '23505') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
            operation: 'create',
            field: 'name',
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'create',
          entity,
        })
      }

      logger.info('Enregistrement créé avec succès', {
        id: data?.id,
        organizationId: entity.organization_id,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'create',
        entity,
      })
    }
  }

  /**
   * Met à jour un enregistrement
   */
  async update(id: string, updates: FlexibleUpdate<'example_table'>) {
    try {
      const { data, error } = await this.supabase
        .from('example_table')
        .update(updates as ExampleUpdate)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_NOT_FOUND,
            operation: 'update',
            id,
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'update',
          id,
          updates,
        })
      }

      if (!data) {
        throw errorHandler.createDatabaseError(
          `Enregistrement avec l'ID ${id} introuvable pour la mise à jour`,
          { id }
        )
      }

      logger.info('Enregistrement mis à jour avec succès', {
        id,
        updates,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'update',
        id,
        updates,
      })
    }
  }

  /**
   * Supprime un enregistrement
   */
  async delete(id: string) {
    try {
      const { error } = await this.supabase
        .from('example_table')
        .delete()
        .eq('id', id)

      if (error) {
        if (error.code === '42501') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_RLS_POLICY_VIOLATION,
            operation: 'delete',
            id,
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'delete',
          id,
        })
      }

      logger.info('Enregistrement supprimé avec succès', { id })

      return true
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'delete',
        id,
      })
    }
  }
}





