import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { errorHandler, ErrorCode, AppError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'

type Document = Database['public']['Tables']['documents']['Row']
type DocumentInsert = Database['public']['Tables']['documents']['Insert']

export class DocumentService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère tous les documents d'une organisation avec pagination
   */
  async getAll(
    organizationId: string,
    filters?: {
      studentId?: string
      type?: Document['type']
      page?: number
      limit?: number
    }
  ) {
    try {
      const page = filters?.page || 1
      const limit = filters?.limit || 50
      const offset = (page - 1) * limit

      let query = this.supabase
        .from('documents')
        .select('*, students(*)', { count: 'exact' })
        .eq('organization_id', organizationId)

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId)
      }

      if (filters?.type) {
        query = query.eq('type', filters.type)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw errorHandler.handleError(error, {
          operation: 'getAll',
          organizationId,
          filters,
        })
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getAll',
        organizationId,
        filters,
      })
    }
  }

  /**
   * Récupère un document par son ID
   */
  async getById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('*, students(*)')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
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
        throw errorHandler.createNotFoundError(
          `Document avec l'ID ${id} introuvable`,
          { id }
        )
      }

      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getById',
        id,
      })
    }
  }

  /**
   * Crée un nouveau document
   */
  async create(document: DocumentInsert) {
    try {
      // Validation
      if (!document.title) {
        throw errorHandler.createValidationError(
          'Le titre est obligatoire',
          'title'
        )
      }

      if (!document.file_url) {
        throw errorHandler.createValidationError(
          'L\'URL du fichier est obligatoire',
          'file_url'
        )
      }

      const { data, error } = await this.supabase
        .from('documents')
        .insert(document)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
            operation: 'create',
            field: 'title',
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'create',
          document,
        })
      }

      logger.info('Document created successfully', {
        id: data?.id,
        organizationId: document.organization_id || undefined,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'create',
        document,
      })
    }
  }

  /**
   * Upload un document vers Supabase Storage
   */
  async uploadFile(file: File, path: string) {
    try {
      if (!file) {
        throw errorHandler.createValidationError(
          'Le fichier est obligatoire',
          'file'
        )
      }

      if (!path) {
        throw errorHandler.createValidationError(
          'Le chemin est obligatoire',
          'path'
        )
      }

      const { data, error } = await this.supabase.storage
        .from('documents')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        if (error.message?.includes('already exists')) {
          throw errorHandler.handleError(error, {
            code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
            operation: 'uploadFile',
            path,
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'uploadFile',
          path,
          fileName: file.name,
        })
      }

      logger.info('File uploaded successfully', {
        path,
        fileName: file.name,
        size: file.size,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'uploadFile',
        path,
        fileName: file?.name,
      })
    }
  }

  /**
   * Génère l'URL publique d'un document
   */
  async getPublicUrl(path: string) {
    const { data } = this.supabase.storage
      .from('documents')
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * Supprime un document
   */
  async delete(id: string) {
    try {
      if (!id) {
        throw errorHandler.createValidationError(
          'L\'ID du document est obligatoire',
          'id'
        )
      }

      const { error } = await this.supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (error) {
        if (error.code === '23503') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_FOREIGN_KEY_CONSTRAINT,
            operation: 'delete',
            id,
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'delete',
          id,
        })
      }

      logger.info('Document deleted successfully', { id })
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'delete',
        id,
      })
    }
  }
}

export const documentService = new DocumentService()

