import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { errorHandler, ErrorCode, AppError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
import { getAllByOrganization, getById } from '@/lib/utils/supabase-helpers'
import { generateUniqueNumber } from '@/lib/utils/number-generator'
import { validateRequired } from '@/lib/utils/validators'

type Student = TableRow<'students'>
type StudentInsert = TableInsert<'students'>
type StudentUpdate = TableUpdate<'students'>

/**
 * Service de gestion des étudiants
 * 
 * Fournit des méthodes pour CRUD des étudiants avec :
 * - Pagination côté serveur
 * - Recherche textuelle (nom, prénom, numéro, email)
 * - Filtrage par classe et statut
 * - Génération automatique de numéros d'étudiant uniques
 */
export class StudentService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère tous les étudiants d'une organisation avec pagination
   * 
   * @param organizationId - ID de l'organisation
   * @param filters - Filtres optionnels (classe, statut, recherche, pagination)
   * @returns Objet avec data, total, page, limit, totalPages
   */
  async getAll(organizationId: string, filters?: {
    classId?: string
    status?: Student['status']
    search?: string
    page?: number
    limit?: number
  }) {
    try {
      const page = filters?.page || 1
      const limit = filters?.limit || 50
      const offset = (page - 1) * limit

      // Pour la recherche, on doit utiliser une requête personnalisée car elle utilise `or`
      if (filters?.search) {
        let query = this.supabase
          .from('students')
          .select('*, classes(id, name, level)', { count: 'exact' })
          .eq('organization_id', organizationId)
          .or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_number.ilike.%${filters.search}%`)

        if (filters?.classId) query = query.eq('class_id', filters.classId)
        if (filters?.status) query = query.eq('status', filters.status)

        const { data, error, count } = await query
          .order('last_name', { ascending: true })
          .range(offset, offset + limit - 1)

        if (error) {
          throw errorHandler.handleError(error, {
            organizationId,
            operation: 'getAll',
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
      }

      // Sinon, utiliser une requête avec pagination
      let query = this.supabase
        .from('students')
        .select('*, classes(id, name, level)', { count: 'exact' })
        .eq('organization_id', organizationId)

      if (filters?.classId) query = query.eq('class_id', filters.classId)
      if (filters?.status) query = query.eq('status', filters.status)

      const { data, error, count } = await query
        .order('last_name', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        throw errorHandler.handleError(error, {
          organizationId,
          operation: 'getAll',
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
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        organizationId,
        operation: 'getAll',
      })
    }
  }

  /**
   * Récupère un étudiant par son ID
   */
  async getById(id: string) {
    try {
      // Utiliser le helper pour réduire la duplication
      return getById<Student>(
        this.supabase,
        'students',
        id,
        '*, classes(id, name, level)'
      )
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
   * Récupère un étudiant par son numéro
   */
  async getByNumber(organizationId: string, studentNumber: string) {
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('student_number', studentNumber)
        .single()

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_NOT_FOUND,
            operation: 'getByNumber',
            organizationId,
            studentNumber,
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'getByNumber',
          organizationId,
          studentNumber,
        })
      }

      return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'getByNumber',
        organizationId,
        studentNumber,
      })
    }
  }

  /**
   * Crée un nouvel étudiant
   */
  async create(student: FlexibleInsert<'students'>) {
    try {
      // Validation avec helper
      validateRequired(student, ['first_name', 'last_name', 'organization_id'])

      // Générer un numéro d'étudiant si non fourni
      let studentNumber = student.student_number
      if (!studentNumber || studentNumber.trim() === '') {
        // Récupérer le code de l'organisation
        const { data: org } = await this.supabase
          .from('organizations')
          .select('code')
          .eq('id', student.organization_id)
          .single()

        const orgCode = org?.code || 'ORG'
        const year = new Date().getFullYear().toString().slice(-2)

        // Générer le numéro avec le helper
        studentNumber = await generateUniqueNumber(
          this.supabase,
          'students',
          student.organization_id,
          {
            prefix: 'EDU',
            orgCode,
            year,
            padding: 6,
            fieldName: 'student_number',
          }
        )
      }

      const studentData = {
        ...student,
        student_number: studentNumber,
      } as StudentInsert

      const { data, error } = await this.supabase
        .from('students')
        .insert(studentData)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
            operation: 'create',
            field: 'student_number',
          })
        }
        if (error.code === '42501') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_RLS_POLICY_VIOLATION,
            operation: 'create',
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'create',
          student,
        })
      }

      logger.info('Étudiant créé avec succès', {
        id: data?.id,
        organizationId: student.organization_id,
        studentNumber: data?.student_number,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'create',
        student,
      })
    }
  }

  /**
   * Met à jour un étudiant
   */
  async update(id: string, updates: FlexibleUpdate<'students'>) {
    try {
      // Nettoyer les valeurs avant la mise à jour
      const cleanUpdates = { ...updates }
      
      // Convertir les chaînes vides en null pour class_id (pour éviter les erreurs de contrainte FK)
      if ('class_id' in cleanUpdates) {
        if (cleanUpdates.class_id === '' || !cleanUpdates.class_id) {
          cleanUpdates.class_id = null
        } else {
          // Vérifier si class_id existe dans la table classes
          // Si ce n'est pas le cas, cela pourrait être une session ID, on le met à null
          const { data: classExists, error: classError } = await this.supabase
            .from('classes')
            .select('id')
            .eq('id', cleanUpdates.class_id)
            .maybeSingle()
          
          // Si la classe n'existe pas, on met class_id à null
          // (car class_id ne devrait pas référencer une session)
          if (!classExists && !classError) {
            cleanUpdates.class_id = null
          }
        }
      }

      const { data, error } = await this.supabase
        .from('students')
        .update(cleanUpdates as StudentUpdate)
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
        if (error.code === '42501') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_RLS_POLICY_VIOLATION,
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
          `Étudiant avec l'ID ${id} introuvable pour la mise à jour`,
          { id }
        )
      }

      logger.info('Étudiant mis à jour avec succès', {
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
   * Supprime un étudiant (soft delete en changeant le statut)
   */
  async delete(id: string) {
    return this.update(id, { status: 'inactive' })
  }

  /**
   * Importe plusieurs étudiants depuis un fichier CSV/Excel
   */
  async import(organizationId: string, students: FlexibleInsert<'students'>[]) {
    try {
      if (!students || students.length === 0) {
        throw errorHandler.createValidationError(
          'Aucun étudiant à importer',
          'students'
        )
      }

      // Récupérer le code de l'organisation pour générer les numéros
      const { data: org } = await this.supabase
        .from('organizations')
        .select('code')
        .eq('id', organizationId)
        .single()

      const orgCode = org?.code || 'ORG'
      const year = new Date().getFullYear().toString().slice(-2)

      // Générer les numéros d'étudiants pour ceux qui n'en ont pas
      const studentsWithNumbers = await Promise.all(
        students.map(async (student) => {
          if (student.student_number && student.student_number.trim() !== '') {
            return student
          }

          // Générer un numéro unique
          const studentNumber = await generateUniqueNumber(
            this.supabase,
            'students',
            organizationId,
            {
              prefix: 'EDU',
              orgCode,
              year,
              padding: 6,
              fieldName: 'student_number',
            }
          )

          return {
            ...student,
            student_number: studentNumber,
          }
        })
      )

      const { data, error } = await this.supabase
        .from('students')
        .insert(studentsWithNumbers as StudentInsert[])
        .select()

      if (error) {
        if (error.code === '23505') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
            operation: 'import',
            field: 'student_number',
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'import',
          organizationId,
          count: students.length,
        })
      }

      logger.info('Étudiants importés avec succès', {
        organizationId,
        count: data?.length || 0,
      })

      return data || []
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'import',
        organizationId,
      })
    }
  }
}

export const studentService = new StudentService()

