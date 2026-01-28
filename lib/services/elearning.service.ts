import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'
import { logger, sanitizeError } from '@/lib/utils/logger'

type Course = TableRow<'courses'>
type Lesson = TableRow<'lessons'>
type Quiz = TableRow<'quizzes'>
type QuizQuestion = TableRow<'quiz_questions'>
type CourseEnrollment = TableRow<'course_enrollments'>
type LessonProgress = TableRow<'lesson_progress'>
type Assignment = TableRow<'assignments'>
type AssignmentSubmission = TableRow<'assignment_submissions'>

export class ELearningService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // ========== COURSES ==========

  async getCourses(organizationId: string, filters?: {
    instructorId?: string
    isPublished?: boolean
    isFeatured?: boolean
    difficulty?: string
    search?: string
  }) {
    try {
      let query = this.supabase
        .from('courses')
        .select('*, instructor:users(id, full_name, email), formation:formations(*)')
        .eq('organization_id', organizationId)

    if (filters?.instructorId) {
      query = query.eq('instructor_id', filters.instructorId)
    }

    if (filters?.isPublished !== undefined) {
      query = query.eq('is_published', filters.isPublished)
    }

    if (filters?.isFeatured) {
      query = query.eq('is_featured', true)
    }

    if (filters?.difficulty) {
      query = query.eq('difficulty_level', filters.difficulty)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

      const { data, error } = await query
        .order('created_at', { ascending: false })

      if (error) {
        // Si la table n'existe pas encore ou erreur 400, retourner un tableau vide
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.code === 'PGRST301' ||
          (error as any).status === 400 ||
          error.code === '400' ||
          error.message?.includes('relation') ||
          error.message?.includes('relationship') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache')
        ) {
          logger.warn('ELearningService - Table courses does not exist yet or invalid query', { errorMessage: error.message })
          return []
        }
        throw error
      }
      return data || []
    } catch (error: unknown) {
      // Gérer les erreurs de table inexistante ou erreurs 400
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (
        errorObj?.code === 'PGRST116' ||
        errorObj?.code === '42P01' ||
        errorObj?.code === 'PGRST301' ||
        errorObj?.status === 400 ||
        errorObj?.code === '400' ||
        errorObj?.message?.includes('relation') ||
        errorObj?.message?.includes('relationship') ||
        errorObj?.message?.includes('does not exist') ||
        errorObj?.message?.includes('schema cache')
      ) {
        logger.warn('ELearningService - Table courses does not exist yet or invalid query', { errorMessage: errorObj?.message || String(error) })
        return []
      }
      throw error
    }
  }

  async getCourseBySlug(slug: string, organizationId: string) {
    try {
      // Essayer d'abord avec toutes les relations
      let query = this.supabase
        .from('courses')
        .select(`
          *,
          instructor:users(id, full_name, email),
          formation:formations(*),
          sections:course_sections(*),
          lessons:lessons(*)
        `)
        .eq('slug', slug)
        .eq('organization_id', organizationId)
      
      const { data, error } = await query.maybeSingle()

      if (error) {
        // Si la table n'existe pas encore ou erreur 400, retourner null
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.code === 'PGRST301' ||
          (error as any).status === 400 ||
          error.code === '400' ||
          error.message?.includes('relation') ||
          error.message?.includes('relationship') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache')
        ) {
          logger.warn('ELearningService - Table courses or relations do not exist yet or invalid query', { errorMessage: error.message })
          return null
        }
        throw error
      }
      return data
    } catch (error: unknown) {
      // Gérer les erreurs de table inexistante ou erreurs 400
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (
        errorObj?.code === 'PGRST116' ||
        errorObj?.code === '42P01' ||
        errorObj?.code === 'PGRST301' ||
        errorObj?.status === 400 ||
        errorObj?.code === '400' ||
        errorObj?.message?.includes('relation') ||
        errorObj?.message?.includes('relationship') ||
        errorObj?.message?.includes('does not exist') ||
        errorObj?.message?.includes('schema cache')
      ) {
        logger.warn('ELearningService - Table courses or relations do not exist yet or invalid query', { errorMessage: errorObj?.message })
        return null
      }
      throw error
    }
  }

  async createCourse(course: TableInsert<'courses'>) {
    const { data, error } = await this.supabase
      .from('courses')
      .insert(course)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCourse(id: string, updates: TableUpdate<'courses'>) {
    const { data, error } = await this.supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteCourse(id: string) {
    const { error } = await this.supabase
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== SECTIONS ==========

  async getCourseSections(courseId: string) {
    const { data, error } = await this.supabase
      .from('course_sections')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  async createSection(section: TableInsert<'course_sections'>) {
    const { data, error } = await this.supabase
      .from('course_sections')
      .insert(section)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateSection(id: string, updates: TableUpdate<'course_sections'>) {
    const { data, error } = await this.supabase
      .from('course_sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteSection(id: string) {
    // Détacher les leçons avant suppression de la section (évite les erreurs FK, et garde les leçons)
    const { error: detachError } = await this.supabase
      .from('lessons')
      .update({ section_id: null })
      .eq('section_id', id)

    if (detachError) throw detachError

    const { error } = await this.supabase
      .from('course_sections')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== LESSONS ==========

  async getCourseLessons(courseId: string) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  async getLessonById(id: string) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*, course:courses(*), section:course_sections(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async getLessonBySlug(slug: string, courseId: string) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*, course:courses(*), section:course_sections(*)')
      .eq('slug', slug)
      .eq('course_id', courseId)
      .single()

    if (error) throw error
    return data
  }

  async createLesson(lesson: TableInsert<'lessons'>) {
    const { data, error } = await this.supabase
      .from('lessons')
      .insert(lesson)
      .select()
      .single()

    if (error) throw error

    // Mettre à jour le nombre total de leçons du cours
    await this.updateCourseLessonCount(lesson.course_id)

    return data
  }

  async updateLesson(id: string, updates: TableUpdate<'lessons'>) {
    const { data, error } = await this.supabase
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteLesson(id: string) {
    // Récupérer le course_id avant suppression
    const { data: lesson } = await this.supabase
      .from('lessons')
      .select('course_id')
      .eq('id', id)
      .single()

    const { error } = await this.supabase
      .from('lessons')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Mettre à jour le nombre total de leçons du cours
    if (lesson) {
      await this.updateCourseLessonCount(lesson.course_id)
    }
  }

  private async updateCourseLessonCount(courseId: string) {
    const { count } = await this.supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)

    await this.supabase
      .from('courses')
      .update({ total_lessons: count || 0 })
      .eq('id', courseId)
  }

  // ========== ENROLLMENTS ==========

  async enrollInCourse(courseId: string, studentId: string) {
    const { data, error } = await this.supabase
      .from('course_enrollments')
      .insert({
        course_id: courseId,
        student_id: studentId,
        enrollment_status: 'enrolled',
      })
      .select()
      .single()

    if (error) throw error

    // Incrémenter le nombre total d'étudiants
    await this.incrementCourseStudentCount(courseId)

    return data
  }

  async getStudentEnrollments(studentId: string) {
    try {
      const { data, error } = await this.supabase
        .from('course_enrollments')
        .select(`
          *,
          course:courses(*, instructor:users(id, full_name, email))
        `)
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false })

      if (error) {
        // Si la table n'existe pas encore ou erreur 400, retourner un tableau vide
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.code === 'PGRST301' ||
          (error as any).status === 400 ||
          error.code === '400' ||
          error.message?.includes('relation') ||
          error.message?.includes('relationship') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache')
        ) {
          logger.warn('ELearningService - Table course_enrollments does not exist yet or invalid query', { errorMessage: error.message })
          return []
        }
        throw error
      }
      return data || []
    } catch (error: unknown) {
      // Gérer les erreurs de table inexistante ou erreurs 400
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (
        errorObj?.code === 'PGRST116' ||
        errorObj?.code === '42P01' ||
        errorObj?.code === 'PGRST301' ||
        errorObj?.status === 400 ||
        errorObj?.code === '400' ||
        errorObj?.message?.includes('relation') ||
        errorObj?.message?.includes('relationship') ||
        errorObj?.message?.includes('does not exist') ||
        errorObj?.message?.includes('schema cache')
      ) {
        logger.warn('ELearningService - Table course_enrollments does not exist yet or invalid query', { errorMessage: errorObj?.message || String(error) })
        return []
      }
      throw error
    }
  }

  async getCourseEnrollments(courseId: string) {
    const { data, error } = await this.supabase
      .from('course_enrollments')
      .select(`
        *,
        student:users(id, full_name, email)
      `)
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false })

    if (error) throw error
    return data
  }

  async updateEnrollment(id: string, updates: TableUpdate<'course_enrollments'>) {
    const { data, error } = await this.supabase
      .from('course_enrollments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  private async incrementCourseStudentCount(courseId: string) {
    const { data: course } = await this.supabase
      .from('courses')
      .select('total_students')
      .eq('id', courseId)
      .single()

    if (course) {
      await this.supabase
        .from('courses')
        .update({ total_students: (course.total_students || 0) + 1 })
        .eq('id', courseId)
    }
  }

  // ========== LESSON PROGRESS ==========

  async getLessonProgress(lessonId: string, studentId: string) {
    const { data, error } = await this.supabase
      .from('lesson_progress')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async updateLessonProgress(
    lessonId: string,
    studentId: string,
    updates: Partial<LessonProgress>
  ) {
    // Vérifier si une progression existe déjà
    const existing = await this.getLessonProgress(lessonId, studentId)

    if (existing) {
      const { data, error } = await this.supabase
        .from('lesson_progress')
        .update({
          ...updates,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      const { data, error } = await this.supabase
        .from('lesson_progress')
        .insert({
          lesson_id: lessonId,
          student_id: studentId,
          ...updates,
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  }

  async markLessonAsCompleted(lessonId: string, studentId: string) {
    return this.updateLessonProgress(lessonId, studentId, {
      is_completed: true,
      completion_percentage: 100,
      completed_at: new Date().toISOString(),
    })
  }

  // ========== QUIZZES ==========

  async getQuiz(quizId: string) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('*, questions:quiz_questions(*)')
      .eq('id', quizId)
      .single()

    if (error) throw error
    return data
  }

  async createQuiz(quiz: TableInsert<'quizzes'>) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .insert(quiz)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async createQuizQuestion(question: TableInsert<'quiz_questions'>) {
    const { data, error } = await this.supabase
      .from('quiz_questions')
      .insert(question)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async submitQuizAttempt(attempt: TableInsert<'quiz_attempts'>) {
    // Calculer le score
    const quiz = await this.getQuiz(attempt.quiz_id)
    if (!quiz || !quiz.questions) {
      throw new Error('Quiz non trouvé')
    }

    const questions = quiz.questions as Array<{ id: string; question_type: string; options?: unknown[]; correct_answer?: unknown }>
    const answers = attempt.answers as Record<string, unknown>
    let correctCount = 0
    const totalQuestions = questions.length

    questions.forEach((question: { id: string; question_type: string; options?: unknown[]; correct_answer?: unknown }) => {
      const studentAnswer = answers[question.id]
      const typedQuestion = {
        question_type: question.question_type,
        options: question.options as Array<{ is_correct?: boolean; text?: string }> | undefined,
        correct_answer: question.correct_answer,
      }
      if (this.isAnswerCorrect(typedQuestion, studentAnswer)) {
        correctCount++
      }
    })

    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
    const isPassed = score >= (quiz.passing_score || 70)

    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .insert({
        ...attempt,
        score,
        total_questions: totalQuestions,
        correct_answers: correctCount,
        is_passed: isPassed,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  private isAnswerCorrect(question: { question_type: string; options?: Array<{ is_correct?: boolean; text?: string }>; correct_answer?: unknown }, studentAnswer: unknown): boolean {
    switch (question.question_type) {
      case 'multiple_choice':
        const options = question.options as Array<{ is_correct?: boolean; text?: string }> | undefined
        const correctOption = options?.find((opt) => opt.is_correct)
        return studentAnswer === correctOption?.text
      case 'true_false':
        return studentAnswer === question.correct_answer
      case 'short_answer':
        const studentStr = String(studentAnswer || '').toLowerCase().trim()
        const correctStr = String(question.correct_answer || '').toLowerCase().trim()
        return studentStr === correctStr
      default:
        return false
    }
  }

  async getStudentQuizAttempts(quizId: string, studentId: string) {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== ASSIGNMENTS ==========

  async getCourseAssignments(courseId: string) {
    const { data, error } = await this.supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createAssignment(assignment: TableInsert<'assignments'>) {
    const { data, error } = await this.supabase
      .from('assignments')
      .insert(assignment)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async submitAssignment(submission: TableInsert<'assignment_submissions'>) {
    const { data, error } = await this.supabase
      .from('assignment_submissions')
      .insert(submission)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async gradeAssignment(
    submissionId: string,
    score: number,
    feedback: string,
    gradedBy: string
  ) {
    const { data, error } = await this.supabase
      .from('assignment_submissions')
      .update({
        score,
        feedback,
        graded_by: gradedBy,
        graded_at: new Date().toISOString(),
        status: 'graded',
      })
      .eq('id', submissionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== CERTIFICATES ==========

  async generateCertificate(courseId: string, studentId: string) {
    // Vérifier que l'étudiant a complété le cours
    const { data: enrollment } = await this.supabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .eq('enrollment_status', 'completed')
      .maybeSingle()

    if (!enrollment) {
      throw new Error('Le cours doit être complété pour générer un certificat')
    }

    // Vérifier si un certificat existe déjà
    const { data: existing } = await this.supabase
      .from('course_certificates')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (existing) {
      return existing
    }

    // Créer le certificat (le numéro sera généré automatiquement par le trigger)
    const { data, error } = await this.supabase
      .from('course_certificates')
      .insert({
        course_id: courseId,
        student_id: studentId,
        enrollment_id: enrollment.id,
        certificate_number: '', // Sera remplacé par le trigger
      } as any)
      .select()
      .single()

    if (error) throw error

    // NOTE: Fonctionnalité prévue - Générer le PDF du certificat et uploader vers Supabase Storage
    // Utiliser PDFGenerator ou un service de génération de certificats
    // Pour l'instant, on retourne juste l'enregistrement

    return data
  }

  async getStudentCertificates(studentId: string) {
    const { data, error } = await this.supabase
      .from('course_certificates')
      .select('*, course:courses(*)')
      .eq('student_id', studentId)
      .order('issued_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== REVIEWS ==========

  async createReview(review: TableInsert<'course_reviews'>) {
    const { data, error } = await this.supabase
      .from('course_reviews')
      .insert(review)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getCourseReviews(courseId: string) {
    const { data, error } = await this.supabase
      .from('course_reviews')
      .select('*, student:users(id, full_name, email)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getCourseRatingStats(courseId: string) {
    const { data, error } = await this.supabase
      .from('course_reviews')
      .select('rating')
      .eq('course_id', courseId)

    if (error) throw error

    const stats = {
      total: data.length,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }

    if (data.length > 0) {
      const ratings = data.map((r) => r.rating).filter(Boolean) as number[]
      stats.average = ratings.reduce((a, b) => a + b, 0) / ratings.length

      ratings.forEach((rating) => {
        stats.distribution[rating as keyof typeof stats.distribution]++
      })
    }

    return stats
  }
}

export const elearningService = new ELearningService()
