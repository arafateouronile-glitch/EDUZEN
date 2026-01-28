// Note: Ne pas importer createClient ici car ce service peut être utilisé côté serveur
// Le client doit être passé en paramètre du constructeur
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { errorHandler, ErrorCode, ErrorSeverity, AppError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
import { getAllByOrganization, getById } from '@/lib/utils/supabase-helpers'
import { generateUniqueNumber } from '@/lib/utils/number-generator'
import { validateRequired } from '@/lib/utils/validators'
import { QuotaService } from './quota.service'

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


  constructor(supabaseClient: SupabaseClient<Database>) {
    if (!supabaseClient) {
      throw new Error('StudentService requires a Supabase client to be passed in constructor')
    }
    this.supabase = supabaseClient
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

      // Récupérer d'abord les étudiants sans relations pour éviter les erreurs
      // Enrichir ensuite avec les données des classes si nécessaire
      let query = this.supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)

      if (filters?.classId) query = query.eq('class_id', filters.classId)
      if (filters?.status) query = query.eq('status', filters.status)
      
      // Ajouter la recherche si nécessaire
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_number.ilike.%${filters.search}%`)
      }

      const { data: studentsData, error, count } = await query
        .order('last_name', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        throw errorHandler.handleError(error, {
          organizationId,
          operation: 'getAll',
          filters,
        })
      }

      // Enrichir avec les données des classes si nécessaire
      const students = studentsData || []
      const classIds = [...new Set(students.map((s: any) => s.class_id).filter(Boolean))]
      
      let classesMap = new Map()
      if (classIds.length > 0) {
        try {
          const { data: classesData } = await this.supabase
            .from('classes')
            .select('id, name, level')
            .in('id', classIds)
          
          if (classesData) {
            classesMap = new Map(classesData.map((c: any) => [c.id, c]))
          }
        } catch (classError) {
          // Ignorer les erreurs de récupération des classes (table peut ne pas exister)
          logger.warn('Erreur récupération classes pour enrichissement', { error: classError })
        }
      }

      // Enrichir les étudiants avec les données des classes
      const enrichedStudents = students.map((student: any) => ({
        ...student,
        classes: student.class_id ? classesMap.get(student.class_id) || null : null
      }))

      return {
        data: enrichedStudents,
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
      // Récupérer l'étudiant sans relations pour éviter les erreurs
      const { data: student, error } = await this.supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
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

      if (!student) {
        throw errorHandler.createDatabaseError(
          `Étudiant avec l'ID ${id} introuvable`,
          { id }
        )
      }

      // Enrichir avec les données de la classe si nécessaire
      if (student.class_id) {
        try {
          const { data: classData } = await this.supabase
            .from('classes')
            .select('id, name, level')
            .eq('id', student.class_id)
            .maybeSingle()
          
          return {
            ...student,
            classes: classData || null
          } as Student & { classes: any }
        } catch (classError) {
          // Ignorer les erreurs de récupération des classes
          logger.warn('Erreur récupération classe pour enrichissement', { error: classError })
          return {
            ...student,
            classes: null
          } as Student & { classes: any }
        }
      }

      return {
        ...student,
        classes: null
      } as Student & { classes: any }
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

      // Vérifier les quotas avant de créer
      if (student.organization_id) {
        const quotaService = new QuotaService(this.supabase)
        const quotaCheck = await quotaService.canAddStudent(student.organization_id)
        if (!quotaCheck.allowed) {
          throw new AppError(
            quotaCheck.reason || 'Limite d\'étudiants atteinte pour votre plan',
            ErrorCode.QUOTA_EXCEEDED,
            ErrorSeverity.MEDIUM,
            { usage: quotaCheck.usage }
          )
        }
      }

      // Générer un numéro d'étudiant si non fourni
      let studentNumber = student.student_number
      if (!studentNumber || studentNumber.trim() === '') {
        // Récupérer le code de l'organisation
        const orgId = student.organization_id
        if (!orgId) throw new Error('organization_id is required')
        
        const { data: org } = await this.supabase
          .from('organizations')
          .select('code')
          .eq('id', orgId)
          .single()

        const orgCode = org?.code || 'ORG'
        const year = new Date().getFullYear().toString().slice(-2)

        // Générer le numéro avec le helper
        studentNumber = await generateUniqueNumber(
          this.supabase,
          'students',
          orgId,
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
        organizationId: student.organization_id || undefined,
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

// Factory function pour créer une instance du service
export function createStudentService(supabaseClient: SupabaseClient<Database>) {
  return new StudentService(supabaseClient)
}

// Pour la compatibilité avec le code existant qui utilise studentService
// Cette variable sera undefined jusqu'à ce qu'elle soit initialisée
export let studentService: StudentService

