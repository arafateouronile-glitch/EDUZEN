import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { errorHandler, ErrorCode, AppError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
import { getAllByOrganization, getById } from '@/lib/utils/supabase-helpers'

type Attendance = Database['public']['Tables']['attendance']['Row']
type AttendanceInsert = Database['public']['Tables']['attendance']['Insert']
type AttendanceUpdate = Database['public']['Tables']['attendance']['Update']

export class AttendanceService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère toutes les présences d'une organisation
   */
  async getAll(organizationId: string, filters?: {
    studentId?: string
    classId?: string
    programSessionId?: string
    date?: string
    status?: Attendance['status']
  }) {
    try {
      // Utiliser le helper pour réduire la duplication
      const filtersMap: Record<string, unknown> = {}
      if (filters?.studentId) filtersMap.student_id = filters.studentId
      if (filters?.classId) filtersMap.class_id = filters.classId
      if (filters?.programSessionId) filtersMap.session_id = filters.programSessionId
      if (filters?.date) filtersMap.date = filters.date
      if (filters?.status) filtersMap.status = filters.status

      return getAllByOrganization<Attendance>(
        this.supabase,
        'attendance',
        organizationId,
        {
          select: '*, students(id, first_name, last_name, student_number), classes(id, name), sessions(id, title, start_time)',
          filters: filtersMap,
          orderBy: { column: 'date', ascending: false },
        }
      )
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
   * Récupère l'émargement d'une classe pour une date donnée
   */
  async getByClassAndDate(classId: string, date: string) {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*, students(id, first_name, last_name, student_number)') // ✅ Jointure optimisée
        .eq('class_id', classId)
        .eq('date', date)
        .order('students(last_name)', { ascending: true })

      if (error) {
        throw errorHandler.handleError(error, {
          operation: 'getByClassAndDate',
          classId,
          date,
        })
      }

      return data || []
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'getByClassAndDate',
        classId,
        date,
      })
    }
  }

  /**
   * Récupère l'émargement d'une session pour une date donnée
   */
  async getBySessionAndDate(sessionId: string, date: string) {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*, students(id, first_name, last_name, student_number)') // ✅ Jointure optimisée
        .eq('session_id', sessionId)
        .eq('date', date)
        .order('students(last_name)', { ascending: true })

      if (error) {
        throw errorHandler.handleError(error, {
          operation: 'getBySessionAndDate',
          sessionId,
          date,
        })
      }

      return data || []
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'getBySessionAndDate',
        sessionId,
        date,
      })
    }
  }

  /**
   * Crée ou met à jour un émargement
   */
  async upsert(attendance: AttendanceInsert & {
    latitude?: number
    longitude?: number
    location_accuracy?: number
    location_address?: string
    location_method?: 'manual' | 'qr_code' | 'gps' | 'ip'
  }) {
    // Vérifier la géolocalisation si la session l'exige
    if (attendance.session_id && (attendance.latitude || attendance.longitude)) {
      const locationValid = await this.validateLocation(
        attendance.session_id,
        attendance.latitude,
        attendance.longitude
      )

      if (!locationValid.valid) {
        throw errorHandler.createValidationError(
          locationValid.error || 'Localisation invalide',
          'location'
        )
      }

      // Ajouter les informations de vérification
      ;(attendance as Attendance & { location_verified?: boolean }).location_verified = locationValid.verified
    }

    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .upsert(attendance, {
          onConflict: 'student_id,class_id,session_id,date',
        })
        .select()
        .single()

      if (error) {
        if (error.code === '42501') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_RLS_POLICY_VIOLATION,
            operation: 'upsert',
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'upsert',
          attendance,
        })
      }

      logger.info('Émargement créé/mis à jour avec succès', {
        id: data?.id,
        studentId: attendance.student_id,
        date: attendance.date,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'upsert',
        attendance,
      })
    }
  }

  /**
   * Valide la géolocalisation pour un émargement
   */
  async validateLocation(
    sessionId: string,
    latitude?: number,
    longitude?: number
  ): Promise<{ valid: boolean; verified: boolean; error?: string; distance?: number }> {
    if (!latitude || !longitude) {
      return { valid: false, verified: false, error: 'Coordonnées GPS manquantes' }
    }

    // Récupérer les informations de la session
    const { data: session, error } = await this.supabase
      .from('sessions')
      .select('latitude, longitude, require_location_for_attendance, allowed_attendance_radius_meters')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return { valid: false, verified: false, error: 'Session non trouvée' }
    }

    const sessionData = session as any

    // Si la géolocalisation n'est pas requise, c'est valide
    if (!sessionData.require_location_for_attendance) {
      return { valid: true, verified: false }
    }

    // Si la session n'a pas de coordonnées GPS, on ne peut pas vérifier
    if (!sessionData.latitude || !sessionData.longitude) {
      return { valid: true, verified: false, error: 'Session sans coordonnées GPS' }
    }

    // Calculer la distance
    const distance = this.calculateDistance(
      sessionData.latitude,
      sessionData.longitude,
      latitude,
      longitude
    )

    // Vérifier le rayon autorisé
    if (sessionData.allowed_attendance_radius_meters) {
      if (distance > sessionData.allowed_attendance_radius_meters) {
        return {
          valid: false,
          verified: false,
          error: `Vous êtes trop loin de la session (${Math.round(distance)}m, maximum: ${sessionData.allowed_attendance_radius_meters}m)`,
          distance,
        }
      }
    }

    return { valid: true, verified: true, distance }
  }

  /**
   * Calcule la distance entre deux points GPS (formule de Haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance en mètres
  }

  /**
   * Met à jour un émargement
   */
  async update(id: string, updates: AttendanceUpdate) {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .update(updates)
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
          `Émargement avec l'ID ${id} introuvable pour la mise à jour`,
          { id }
        )
      }

      logger.info('Émargement mis à jour avec succès', {
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
   * Marque plusieurs présences en une fois
   */
  async markMultiple(
    organizationId: string,
    records: Array<{
      student_id: string
      class_id?: string
      session_id?: string // Utiliser session_id au lieu de program_session_id
      date: string
      status: 'present' | 'absent' | 'late' | 'excused'
      late_minutes?: number
      teacher_id?: string
      notes?: string
    }>
  ) {
    const attendanceRecords = records.map((record) => ({
      organization_id: organizationId,
      ...record,
      late_minutes: record.late_minutes || 0,
    }))

    try {
      if (!records || records.length === 0) {
        throw errorHandler.createValidationError(
          'Aucun enregistrement à marquer',
          'records'
        )
      }

      const { data, error } = await this.supabase
        .from('attendance')
        .upsert(attendanceRecords, {
          onConflict: 'student_id,class_id,session_id,date',
        })
        .select()

      if (error) {
        throw errorHandler.handleError(error, {
          operation: 'markMultiple',
          organizationId,
          count: records.length,
        })
      }

      logger.info('Présences marquées en masse avec succès', {
        organizationId,
        count: data?.length || 0,
      })

      return data || []
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'markMultiple',
        organizationId,
      })
    }
  }

  /**
   * Récupère les statistiques de présence pour un élève
   */
  async getStudentStats(studentId: string, startDate?: string, endDate?: string) {
    let query = this.supabase
      .from('attendance')
      .select('status, date')
      .eq('student_id', studentId)

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    try {
      const { data, error } = await query

      if (error) throw error

      const total = data?.length || 0
      const present = data?.filter((a) => a.status === 'present').length || 0
      const absent = data?.filter((a) => a.status === 'absent').length || 0
      const late = data?.filter((a) => a.status === 'late').length || 0
      const excused = data?.filter((a) => a.status === 'excused').length || 0

      return {
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate: total > 0 ? (present / total) * 100 : 0,
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'getStudentStats',
        studentId,
      })
    }
  }

  /**
   * Récupère les statistiques de présence pour une classe
   */
  async getClassStats(classId: string, date?: string) {
    let query = this.supabase
      .from('attendance')
      .select('status')
      .eq('class_id', classId)

    if (date) {
      query = query.eq('date', date)
    }

    try {
      const { data, error } = await query

      if (error) {
        throw errorHandler.handleError(error, {
          operation: 'getClassStats',
          classId,
          date,
        })
      }

      const total = data?.length || 0
      const present = data?.filter((a) => a.status === 'present').length || 0
      const absent = data?.filter((a) => a.status === 'absent').length || 0

      return {
        total,
        present,
        absent,
        attendanceRate: total > 0 ? (present / total) * 100 : 0,
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'getClassStats',
        classId,
      })
    }
  }

  /**
   * Sauvegarde une signature d'enseignant
   */
  async saveTeacherSignature(attendanceId: string, signatureUrl: string) {
    return this.update(attendanceId, {
      teacher_signature_url: signatureUrl,
    })
  }
}

export const attendanceService = new AttendanceService()
