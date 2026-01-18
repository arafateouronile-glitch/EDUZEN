import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type ReportCard = TableRow<'report_cards'>
type ReportCardSubject = TableRow<'report_card_subjects'>
type SubjectStatistics = TableRow<'subject_statistics'>
type ReportCardInsert = TableInsert<'report_cards'>
type ReportCardUpdate = TableUpdate<'report_cards'>

export interface ReportCardWithSubjects extends ReportCard {
  report_card_subjects: ReportCardSubject[]
  students?: {
    id: string
    first_name: string
    last_name: string
    student_number: string | null
  }
  sessions?: {
    id: string
    name: string
  }
}

export interface AdvancedStatistics {
  mean_score: number | null
  median_score: number | null
  mode_score: number | null
  std_deviation: number | null
  min_score: number | null
  max_score: number | null
  q1_score: number | null
  q3_score: number | null
  pass_rate: number | null
  total_students: number
}

export interface ReportCardFilters {
  studentId?: string
  sessionId?: string
  academicYearId?: string
  termPeriod?: string
  status?: 'draft' | 'published' | 'archived'
}

class ReportCardService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère tous les bulletins pour une organisation
   */
  async getAll(organizationId: string, filters?: ReportCardFilters): Promise<ReportCardWithSubjects[]> {
    let query = this.supabase
      .from('report_cards')
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name),
        report_card_subjects(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.academicYearId) {
      query = query.eq('academic_year_id', filters.academicYearId)
    }

    if (filters?.termPeriod) {
      query = query.eq('term_period', filters.termPeriod)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as ReportCardWithSubjects[]
  }

  /**
   * Récupère un bulletin par son ID
   */
  async getById(id: string): Promise<ReportCardWithSubjects | null> {
    const { data, error } = await this.supabase
      .from('report_cards')
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name),
        report_card_subjects(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as ReportCardWithSubjects
  }

  /**
   * Génère un bulletin automatiquement pour un étudiant
   */
  async generate(
    studentId: string,
    sessionId: string,
    termPeriod: string,
    academicYearId?: string
  ): Promise<ReportCardWithSubjects> {
    const { data, error } = await this.supabase.rpc('generate_report_card', {
      p_student_id: studentId,
      p_session_id: sessionId,
      p_term_period: termPeriod,
      p_academic_year_id: academicYearId || null,
    })

    if (error) throw error

    // Récupérer le bulletin généré
    const reportCard = await this.getById(data)
    if (!reportCard) throw new Error('Bulletin généré mais introuvable')

    return reportCard
  }

  /**
   * Met à jour un bulletin
   */
  async update(id: string, updates: ReportCardUpdate): Promise<ReportCardWithSubjects> {
    const { data, error } = await this.supabase
      .from('report_cards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name),
        report_card_subjects(*)
      `)
      .single()

    if (error) throw error
    return data as ReportCardWithSubjects
  }

  /**
   * Publie un bulletin
   */
  async publish(id: string, userId: string): Promise<ReportCardWithSubjects> {
    return this.update(id, {
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: userId,
    })
  }

  /**
   * Archive un bulletin
   */
  async archive(id: string): Promise<ReportCardWithSubjects> {
    return this.update(id, {
      status: 'archived',
    })
  }

  /**
   * Supprime un bulletin
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('report_cards')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Calcule les statistiques avancées pour une matière
   */
  async calculateSubjectStatistics(
    organizationId: string,
    subject: string,
    sessionId?: string,
    academicYearId?: string,
    termPeriod?: string,
    assessmentType?: string
  ): Promise<AdvancedStatistics> {
    const { data, error } = await this.supabase.rpc('calculate_subject_statistics', {
      p_organization_id: organizationId,
      p_subject: subject,
      p_session_id: sessionId || null,
      p_academic_year_id: academicYearId || null,
      p_term_period: termPeriod || null,
      p_assessment_type: assessmentType || null,
    })

    if (error) throw error

    const result = data?.[0]
    if (!result) {
      return {
        mean_score: null,
        median_score: null,
        mode_score: null,
        std_deviation: null,
        min_score: null,
        max_score: null,
        q1_score: null,
        q3_score: null,
        pass_rate: null,
        total_students: 0,
      }
    }

    return {
      mean_score: result.mean_score ? Number(result.mean_score) : null,
      median_score: result.median_score ? Number(result.median_score) : null,
      mode_score: result.mode_score ? Number(result.mode_score) : null,
      std_deviation: result.std_deviation ? Number(result.std_deviation) : null,
      min_score: result.min_score ? Number(result.min_score) : null,
      max_score: result.max_score ? Number(result.max_score) : null,
      q1_score: result.q1_score ? Number(result.q1_score) : null,
      q3_score: result.q3_score ? Number(result.q3_score) : null,
      pass_rate: result.pass_rate ? Number(result.pass_rate) : null,
      total_students: result.total_students || 0,
    }
  }

  /**
   * Met à jour une matière dans un bulletin
   */
  async updateSubject(
    reportCardId: string,
    subject: string,
    updates: Partial<ReportCardSubject>
  ): Promise<ReportCardSubject> {
    const { data, error } = await this.supabase
      .from('report_card_subjects')
      .update(updates)
      .eq('report_card_id', reportCardId)
      .eq('subject', subject)
      .select()
      .single()

    if (error) throw error
    return data as ReportCardSubject
  }
}

export const reportCardService = new ReportCardService()


import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type ReportCard = TableRow<'report_cards'>
type ReportCardSubject = TableRow<'report_card_subjects'>
type SubjectStatistics = TableRow<'subject_statistics'>
type ReportCardInsert = TableInsert<'report_cards'>
type ReportCardUpdate = TableUpdate<'report_cards'>

export interface ReportCardWithSubjects extends ReportCard {
  report_card_subjects: ReportCardSubject[]
  students?: {
    id: string
    first_name: string
    last_name: string
    student_number: string | null
  }
  sessions?: {
    id: string
    name: string
  }
}

export interface AdvancedStatistics {
  mean_score: number | null
  median_score: number | null
  mode_score: number | null
  std_deviation: number | null
  min_score: number | null
  max_score: number | null
  q1_score: number | null
  q3_score: number | null
  pass_rate: number | null
  total_students: number
}

export interface ReportCardFilters {
  studentId?: string
  sessionId?: string
  academicYearId?: string
  termPeriod?: string
  status?: 'draft' | 'published' | 'archived'
}

class ReportCardService {
  private supabase = createClient()

  /**
   * Récupère tous les bulletins pour une organisation
   */
  async getAll(organizationId: string, filters?: ReportCardFilters): Promise<ReportCardWithSubjects[]> {
    let query = this.supabase
      .from('report_cards')
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name),
        report_card_subjects(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.academicYearId) {
      query = query.eq('academic_year_id', filters.academicYearId)
    }

    if (filters?.termPeriod) {
      query = query.eq('term_period', filters.termPeriod)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as ReportCardWithSubjects[]
  }

  /**
   * Récupère un bulletin par son ID
   */
  async getById(id: string): Promise<ReportCardWithSubjects | null> {
    const { data, error } = await this.supabase
      .from('report_cards')
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name),
        report_card_subjects(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as ReportCardWithSubjects
  }

  /**
   * Génère un bulletin automatiquement pour un étudiant
   */
  async generate(
    studentId: string,
    sessionId: string,
    termPeriod: string,
    academicYearId?: string
  ): Promise<ReportCardWithSubjects> {
    const { data, error } = await this.supabase.rpc('generate_report_card', {
      p_student_id: studentId,
      p_session_id: sessionId,
      p_term_period: termPeriod,
      p_academic_year_id: academicYearId || null,
    })

    if (error) throw error

    // Récupérer le bulletin généré
    const reportCard = await this.getById(data)
    if (!reportCard) throw new Error('Bulletin généré mais introuvable')

    return reportCard
  }

  /**
   * Met à jour un bulletin
   */
  async update(id: string, updates: ReportCardUpdate): Promise<ReportCardWithSubjects> {
    const { data, error } = await this.supabase
      .from('report_cards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name),
        report_card_subjects(*)
      `)
      .single()

    if (error) throw error
    return data as ReportCardWithSubjects
  }

  /**
   * Publie un bulletin
   */
  async publish(id: string, userId: string): Promise<ReportCardWithSubjects> {
    return this.update(id, {
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: userId,
    })
  }

  /**
   * Archive un bulletin
   */
  async archive(id: string): Promise<ReportCardWithSubjects> {
    return this.update(id, {
      status: 'archived',
    })
  }

  /**
   * Supprime un bulletin
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('report_cards')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Calcule les statistiques avancées pour une matière
   */
  async calculateSubjectStatistics(
    organizationId: string,
    subject: string,
    sessionId?: string,
    academicYearId?: string,
    termPeriod?: string,
    assessmentType?: string
  ): Promise<AdvancedStatistics> {
    const { data, error } = await this.supabase.rpc('calculate_subject_statistics', {
      p_organization_id: organizationId,
      p_subject: subject,
      p_session_id: sessionId || null,
      p_academic_year_id: academicYearId || null,
      p_term_period: termPeriod || null,
      p_assessment_type: assessmentType || null,
    })

    if (error) throw error

    const result = data?.[0]
    if (!result) {
      return {
        mean_score: null,
        median_score: null,
        mode_score: null,
        std_deviation: null,
        min_score: null,
        max_score: null,
        q1_score: null,
        q3_score: null,
        pass_rate: null,
        total_students: 0,
      }
    }

    return {
      mean_score: result.mean_score ? Number(result.mean_score) : null,
      median_score: result.median_score ? Number(result.median_score) : null,
      mode_score: result.mode_score ? Number(result.mode_score) : null,
      std_deviation: result.std_deviation ? Number(result.std_deviation) : null,
      min_score: result.min_score ? Number(result.min_score) : null,
      max_score: result.max_score ? Number(result.max_score) : null,
      q1_score: result.q1_score ? Number(result.q1_score) : null,
      q3_score: result.q3_score ? Number(result.q3_score) : null,
      pass_rate: result.pass_rate ? Number(result.pass_rate) : null,
      total_students: result.total_students || 0,
    }
  }

  /**
   * Met à jour une matière dans un bulletin
   */
  async updateSubject(
    reportCardId: string,
    subject: string,
    updates: Partial<ReportCardSubject>
  ): Promise<ReportCardSubject> {
    const { data, error } = await this.supabase
      .from('report_card_subjects')
      .update(updates)
      .eq('report_card_id', reportCardId)
      .eq('subject', subject)
      .select()
      .single()

    if (error) throw error
    return data as ReportCardSubject
  }
}

export const reportCardService = new ReportCardService()


import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type ReportCard = TableRow<'report_cards'>
type ReportCardSubject = TableRow<'report_card_subjects'>
type SubjectStatistics = TableRow<'subject_statistics'>
type ReportCardInsert = TableInsert<'report_cards'>
type ReportCardUpdate = TableUpdate<'report_cards'>

export interface ReportCardWithSubjects extends ReportCard {
  report_card_subjects: ReportCardSubject[]
  students?: {
    id: string
    first_name: string
    last_name: string
    student_number: string | null
  }
  sessions?: {
    id: string
    name: string
  }
}

export interface AdvancedStatistics {
  mean_score: number | null
  median_score: number | null
  mode_score: number | null
  std_deviation: number | null
  min_score: number | null
  max_score: number | null
  q1_score: number | null
  q3_score: number | null
  pass_rate: number | null
  total_students: number
}

export interface ReportCardFilters {
  studentId?: string
  sessionId?: string
  academicYearId?: string
  termPeriod?: string
  status?: 'draft' | 'published' | 'archived'
}

class ReportCardService {
  private supabase = createClient()

  /**
   * Récupère tous les bulletins pour une organisation
   */
  async getAll(organizationId: string, filters?: ReportCardFilters): Promise<ReportCardWithSubjects[]> {
    let query = this.supabase
      .from('report_cards')
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name),
        report_card_subjects(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.academicYearId) {
      query = query.eq('academic_year_id', filters.academicYearId)
    }

    if (filters?.termPeriod) {
      query = query.eq('term_period', filters.termPeriod)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as ReportCardWithSubjects[]
  }

  /**
   * Récupère un bulletin par son ID
   */
  async getById(id: string): Promise<ReportCardWithSubjects | null> {
    const { data, error } = await this.supabase
      .from('report_cards')
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name),
        report_card_subjects(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as ReportCardWithSubjects
  }

  /**
   * Génère un bulletin automatiquement pour un étudiant
   */
  async generate(
    studentId: string,
    sessionId: string,
    termPeriod: string,
    academicYearId?: string
  ): Promise<ReportCardWithSubjects> {
    const { data, error } = await this.supabase.rpc('generate_report_card', {
      p_student_id: studentId,
      p_session_id: sessionId,
      p_term_period: termPeriod,
      p_academic_year_id: academicYearId || null,
    })

    if (error) throw error

    // Récupérer le bulletin généré
    const reportCard = await this.getById(data)
    if (!reportCard) throw new Error('Bulletin généré mais introuvable')

    return reportCard
  }

  /**
   * Met à jour un bulletin
   */
  async update(id: string, updates: ReportCardUpdate): Promise<ReportCardWithSubjects> {
    const { data, error } = await this.supabase
      .from('report_cards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        students(id, first_name, last_name, student_number),
        sessions(id, name),
        report_card_subjects(*)
      `)
      .single()

    if (error) throw error
    return data as ReportCardWithSubjects
  }

  /**
   * Publie un bulletin
   */
  async publish(id: string, userId: string): Promise<ReportCardWithSubjects> {
    return this.update(id, {
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: userId,
    })
  }

  /**
   * Archive un bulletin
   */
  async archive(id: string): Promise<ReportCardWithSubjects> {
    return this.update(id, {
      status: 'archived',
    })
  }

  /**
   * Supprime un bulletin
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('report_cards')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Calcule les statistiques avancées pour une matière
   */
  async calculateSubjectStatistics(
    organizationId: string,
    subject: string,
    sessionId?: string,
    academicYearId?: string,
    termPeriod?: string,
    assessmentType?: string
  ): Promise<AdvancedStatistics> {
    const { data, error } = await this.supabase.rpc('calculate_subject_statistics', {
      p_organization_id: organizationId,
      p_subject: subject,
      p_session_id: sessionId || null,
      p_academic_year_id: academicYearId || null,
      p_term_period: termPeriod || null,
      p_assessment_type: assessmentType || null,
    })

    if (error) throw error

    const result = data?.[0]
    if (!result) {
      return {
        mean_score: null,
        median_score: null,
        mode_score: null,
        std_deviation: null,
        min_score: null,
        max_score: null,
        q1_score: null,
        q3_score: null,
        pass_rate: null,
        total_students: 0,
      }
    }

    return {
      mean_score: result.mean_score ? Number(result.mean_score) : null,
      median_score: result.median_score ? Number(result.median_score) : null,
      mode_score: result.mode_score ? Number(result.mode_score) : null,
      std_deviation: result.std_deviation ? Number(result.std_deviation) : null,
      min_score: result.min_score ? Number(result.min_score) : null,
      max_score: result.max_score ? Number(result.max_score) : null,
      q1_score: result.q1_score ? Number(result.q1_score) : null,
      q3_score: result.q3_score ? Number(result.q3_score) : null,
      pass_rate: result.pass_rate ? Number(result.pass_rate) : null,
      total_students: result.total_students || 0,
    }
  }

  /**
   * Met à jour une matière dans un bulletin
   */
  async updateSubject(
    reportCardId: string,
    subject: string,
    updates: Partial<ReportCardSubject>
  ): Promise<ReportCardSubject> {
    const { data, error } = await this.supabase
      .from('report_card_subjects')
      .update(updates)
      .eq('report_card_id', reportCardId)
      .eq('subject', subject)
      .select()
      .single()

    if (error) throw error
    return data as ReportCardSubject
  }
}

export const reportCardService = new ReportCardService()





