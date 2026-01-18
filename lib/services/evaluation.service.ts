import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type Grade = TableRow<'grades'>
type GradeInsert = TableInsert<'grades'>
type GradeUpdate = TableUpdate<'grades'>

export interface EvaluationFilters {
  sessionId?: string
  studentId?: string
  subject?: string
  assessmentType?: string
  startDate?: string
  endDate?: string
  termPeriod?: string
  academicYearId?: string
  isMakeup?: boolean
}

export interface EvaluationStats {
  total: number
  byType: Record<string, number>
  averageScore: number
  averagePercentage: number
  bySubject: Record<string, { count: number; average: number }>
}

class EvaluationService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère toutes les évaluations pour une organisation
   */
  async getAll(organizationId: string, filters?: EvaluationFilters) {
    let query = this.supabase
      .from('grades')
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name, formations(name, programs(name))),
        users(id, full_name)
      `)
      .eq('organization_id', organizationId)
      .order('graded_at', { ascending: false })

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.subject) {
      query = query.ilike('subject', `%${filters.subject}%`)
    }

    if (filters?.assessmentType) {
      query = query.eq('assessment_type', filters.assessmentType)
    }

    if (filters?.startDate) {
      query = query.gte('graded_at', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('graded_at', filters.endDate)
    }

    if (filters?.termPeriod) {
      query = query.eq('term_period', filters.termPeriod)
    }

    if (filters?.academicYearId) {
      query = query.eq('academic_year_id', filters.academicYearId)
    }

    if (filters?.isMakeup !== undefined) {
      query = query.eq('is_makeup', filters.isMakeup)
    }

    const { data, error } = await query

    // Si erreur de relation, essayer sans les jointures complexes
    if (error && (error.code === 'PGRST116' || error.message?.includes('relationship') || error.message?.includes('Could not find') || (error as any).status === 400)) {
      let simpleQuery = this.supabase
        .from('grades')
        .select('*')
        .eq('organization_id', organizationId)
        .order('graded_at', { ascending: false })

      if (filters?.sessionId) {
        simpleQuery = simpleQuery.eq('session_id', filters.sessionId)
      }
      if (filters?.studentId) {
        simpleQuery = simpleQuery.eq('student_id', filters.studentId)
      }
      if (filters?.subject) {
        simpleQuery = simpleQuery.ilike('subject', `%${filters.subject}%`)
      }
      if (filters?.assessmentType) {
        simpleQuery = simpleQuery.eq('assessment_type', filters.assessmentType)
      }
      if (filters?.startDate) {
        simpleQuery = simpleQuery.gte('graded_at', filters.startDate)
      }
      if (filters?.endDate) {
        simpleQuery = simpleQuery.lte('graded_at', filters.endDate)
      }
      if (filters?.termPeriod) {
        simpleQuery = simpleQuery.eq('term_period', filters.termPeriod)
      }
      if (filters?.academicYearId) {
        simpleQuery = simpleQuery.eq('academic_year_id', filters.academicYearId)
      }
      if (filters?.isMakeup !== undefined) {
        simpleQuery = simpleQuery.eq('is_makeup', filters.isMakeup)
      }

      const { data: simpleData, error: simpleError } = await simpleQuery
      if (simpleError) throw simpleError
      return simpleData || []
    }

    if (error) throw error
    return data || []
  }

  /**
   * Récupère une évaluation par son ID
   */
  async getById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from('grades')
        .select(`
          *,
          students(id, first_name, last_name, student_number),
          sessions(id, name, formations(name, programs(name))),
          users(id, full_name)
        `)
        .eq('id', id)
        .single()

      if (error) {
        // Si erreur de relation, essayer sans les jointures complexes
        if (error.code === 'PGRST116' || error.message?.includes('relationship') || error.message?.includes('Could not find') || (error as any).status === 400) {
          const { data: simpleData, error: simpleError } = await this.supabase
            .from('grades')
            .select('*')
            .eq('id', id)
            .single()
          
          if (simpleError) throw simpleError
          return simpleData
        }
        throw error
      }
      return data
    } catch (err) {
      throw err
    }
  }

  /**
   * Crée une nouvelle évaluation
   */
  async create(organizationId: string, evaluation: Omit<GradeInsert, 'organization_id' | 'created_at' | 'updated_at' | 'percentage'> & { score?: number | null; max_score?: number | null }) {
    // Préparer les données d'insertion
    // NOTE: percentage est une colonne générée, on ne peut pas l'insérer manuellement
    
    // Préserver assessment_type explicitement avant le spread
    const assessmentType = evaluation.assessment_type
    
    const insertData: any = {
      ...evaluation,
      organization_id: organizationId,
      // Préserver assessment_type explicitement (au cas où le spread l'écraserait)
      assessment_type: assessmentType,
      // Ne pas inclure percentage - c'est une colonne générée calculée automatiquement
      coefficient: evaluation.coefficient ?? 1.0,
      is_makeup: evaluation.is_makeup ?? false,
      graded_at: evaluation.graded_at || new Date().toISOString(),
    }

    // Retirer percentage si présent (colonne générée)
    delete insertData.percentage

    // Nettoyer les valeurs undefined pour éviter les erreurs
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        insertData[key] = null
      }
    })

    // Valider assessment_type avant insertion
    const validAssessmentTypes = [
      'pre_formation',
      'hot',
      'cold',
      'manager',
      'instructor',
      'funder',
      'quiz',
      'exam',
      'project',
      'other',
    ]
    
    if (insertData.assessment_type && !validAssessmentTypes.includes(insertData.assessment_type)) {
      console.error('❌ [EVALUATION SERVICE] assessment_type invalide:', {
        received: insertData.assessment_type,
        validTypes: validAssessmentTypes,
      })
      // Forcer à 'other' si la valeur n'est pas valide
      insertData.assessment_type = 'other'
    }


    // Insérer sans select pour éviter les erreurs 400
    const { data: insertedData, error: insertError } = await this.supabase
      .from('grades')
      .insert(insertData)
      .select('id, subject, score, max_score, percentage, organization_id, session_id, student_id, teacher_id, assessment_type, notes, graded_at, created_at')
      .single()

    if (insertError) {
      console.error('Erreur insertion évaluation:', insertError)
      throw insertError
    }
    
    // Retourner les données insérées sans essayer de récupérer les relations
    // Les relations seront récupérées lors du refetch de la liste
    return insertedData
  }

  /**
   * Crée une évaluation de rattrapage
   */
  async createMakeup(
    organizationId: string,
    originalGradeId: string,
    evaluation: Omit<GradeInsert, 'organization_id' | 'created_at' | 'updated_at' | 'is_makeup' | 'original_grade_id' | 'percentage'>
  ) {
    // Préparer les données d'insertion
    const insertData: any = {
      ...evaluation,
      organization_id: organizationId,
      // Ne pas inclure percentage - c'est une colonne générée
      coefficient: evaluation.coefficient ?? 1.0,
      is_makeup: true,
      original_grade_id: originalGradeId,
      graded_at: evaluation.graded_at || new Date().toISOString(),
    }

    // Retirer percentage si présent
    delete insertData.percentage

    // Nettoyer les valeurs undefined
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        insertData[key] = null
      }
    })

    // Insérer sans select pour éviter les erreurs 400
    const { data: insertedData, error: insertError } = await this.supabase
      .from('grades')
      .insert(insertData)
      .select('id, subject, score, max_score, percentage, organization_id, session_id, student_id, teacher_id, assessment_type, notes, graded_at, created_at')
      .single()

    if (insertError) throw insertError
    
    return insertedData
  }

  /**
   * Calcule la moyenne pondérée pour un étudiant
   */
  async calculateWeightedAverage(
    organizationId: string,
    studentId: string,
    sessionId?: string,
    termPeriod?: string,
    academicYearId?: string
  ): Promise<number | null> {
    const filters: EvaluationFilters = {
      studentId,
      sessionId,
      termPeriod,
      academicYearId,
      isMakeup: false, // Exclure les rattrapages pour la moyenne principale
    }

    const evaluations = await this.getAll(organizationId, filters)

    if (evaluations.length === 0) return null

    let weightedSum = 0
    let totalCoefficient = 0

    evaluations.forEach((evaluation) => {
      const coefficient = (evaluation as Grade & { coefficient?: number }).coefficient || 1.0
      const maxScore = evaluation.max_score || 1
      const score = evaluation.score

      if (maxScore > 0) {
        weightedSum += (score / maxScore) * 20 * coefficient // Convertir sur 20
        totalCoefficient += coefficient
      }
    })

    if (totalCoefficient === 0) return null

    return Math.round((weightedSum / totalCoefficient) * 100) / 100
  }

  /**
   * Met à jour une évaluation
   */
  async update(id: string, updates: Omit<GradeUpdate, 'percentage'>) {
    // Préparer les données de mise à jour
    const updateData: any = {
      ...updates,
      // Ne pas inclure percentage - c'est une colonne générée calculée automatiquement
      updated_at: new Date().toISOString(),
    }

    // Retirer percentage si présent
    delete updateData.percentage

    // Nettoyer les valeurs undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    // Mettre à jour sans jointure
    const { data: updatedData, error: updateError } = await this.supabase
      .from('grades')
      .update(updateData)
      .eq('id', id)
      .select('id, subject, score, max_score, percentage, organization_id, session_id, student_id, teacher_id, assessment_type, notes, graded_at, created_at, updated_at')
      .single()

    if (updateError) throw updateError
    
    return updatedData
  }

  /**
   * Supprime une évaluation
   */
  async delete(id: string) {
    const { error } = await this.supabase
      .from('grades')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Récupère les statistiques des évaluations
   */
  async getStats(organizationId: string, filters?: EvaluationFilters): Promise<EvaluationStats> {
    const evaluations = await this.getAll(organizationId, filters)
    
    const stats: EvaluationStats = {
      total: evaluations.length,
      byType: {},
      averageScore: 0,
      averagePercentage: 0,
      bySubject: {},
    }

    if (evaluations.length === 0) return stats

    let totalScore = 0
    let totalMaxScore = 0
    let totalPercentage = 0
    let validPercentageCount = 0

    evaluations.forEach((evaluation) => {
      // Par type
      const type = evaluation.assessment_type || 'other'
      stats.byType[type] = (stats.byType[type] || 0) + 1

      // Par sujet
      const subject = evaluation.subject
      if (!stats.bySubject[subject]) {
        stats.bySubject[subject] = { count: 0, average: 0 }
      }
      stats.bySubject[subject].count++

      // Scores
      totalScore += evaluation.score
      if (evaluation.max_score) {
        totalMaxScore += evaluation.max_score
      }
      if (evaluation.percentage !== null && evaluation.percentage !== undefined) {
        totalPercentage += evaluation.percentage
        validPercentageCount++
      }
    })

    // Moyennes
    stats.averageScore = totalMaxScore > 0 ? totalScore / evaluations.length : 0
    stats.averagePercentage = validPercentageCount > 0 ? totalPercentage / validPercentageCount : 0

    // Moyennes par sujet
    Object.keys(stats.bySubject).forEach((subject) => {
      const subjectEvals = evaluations.filter((e) => e.subject === subject)
      const subjectTotal = subjectEvals.reduce((sum, e) => sum + e.score, 0)
      stats.bySubject[subject].average = subjectTotal / subjectEvals.length
    })

    return stats
  }

  /**
   * Crée plusieurs évaluations en masse
   */
  async createBulk(organizationId: string, evaluations: Omit<GradeInsert, 'organization_id' | 'created_at' | 'updated_at' | 'percentage'>[]) {
    const evaluationsWithOrg = evaluations.map((evaluation) => {
      const insertData: any = {
        ...evaluation,
        organization_id: organizationId,
        // Ne pas inclure percentage - c'est une colonne générée
        graded_at: evaluation.graded_at || new Date().toISOString(),
      }

      // Retirer percentage si présent
      delete insertData.percentage

      // Nettoyer les valeurs undefined
      Object.keys(insertData).forEach(key => {
        if (insertData[key] === undefined) {
          insertData[key] = null
        }
      })

      return insertData
    })

    // Insérer d'abord sans jointure
    const { data: insertedData, error: insertError } = await this.supabase
      .from('grades')
      .insert(evaluationsWithOrg)
      .select('*')

    if (insertError) throw insertError
    
    if (!insertedData || insertedData.length === 0) return []
    
    // Essayer de récupérer avec les relations pour chaque note créée
    try {
      const ids = insertedData.map(item => item.id)
      const { data, error } = await this.supabase
        .from('grades')
        .select(`
          *,
          students(id, first_name, last_name, student_number),
          sessions(id, name),
          users(id, full_name)
        `)
        .in('id', ids)
      
      if (error) return insertedData
      return data || []
    } catch {
      return insertedData
    }
  }
}

export const evaluationService = new EvaluationService()












