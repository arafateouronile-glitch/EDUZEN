'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  GraduationCap,
  Plus,
  Trash2,
  BookOpen,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  BarChart3,
  Eye,
  Loader2,
  PlayCircle,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate, cn } from '@/lib/utils'
import Link from 'next/link'
import type { EnrollmentWithRelations, StudentWithRelations } from '@/lib/types/query-types'

interface SessionElearningSectionProps {
  sessionId: string
  organizationId: string
  enrollments: EnrollmentWithRelations[]
}

interface SessionCourse {
  id: string
  session_id: string
  course_id: string
  is_required: boolean
  due_date: string | null
  assigned_at: string
  course?: {
    id: string
    title: string
    slug: string
    short_description: string | null
    difficulty_level: string
    estimated_duration_hours: number | null
    thumbnail_url: string | null
    is_published: boolean
  }
}

interface StudentProgress {
  student_id: string
  student_name: string
  course_id: string
  progress: number
  completed_lessons: number
  total_lessons: number
  quiz_score: number | null
  last_activity: string | null
  status: 'not_started' | 'in_progress' | 'completed'
}

export function SessionElearningSection({
  sessionId,
  organizationId,
  enrollments,
}: SessionElearningSectionProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [isRequired, setIsRequired] = useState(true)
  const [dueDate, setDueDate] = useState<string>('')
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'course' | 'student'>('student')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  const isMissingTableError = (error: any) => {
    const code = error?.code
    const status = error?.status
    const message = (error?.message || '').toLowerCase()
    return (
      code === 'PGRST116' || // table not found (sometimes)
      code === 'PGRST205' || // schema cache / table not found
      code === '42P01' || // relation does not exist
      status === 404 ||
      message.includes('could not find the table') ||
      message.includes('schema cache') ||
      message.includes('does not exist')
    )
  }

  // Récupérer les cours assignés à cette session
  const { data: sessionCourses, isLoading: loadingSessionCourses } = useQuery({
    queryKey: ['session-courses', sessionId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('session_courses')
          .select(`
            *,
            course:courses(
              id, title, slug, short_description, difficulty_level,
              estimated_duration_hours, thumbnail_url, is_published
            )
          `)
          .eq('session_id', sessionId)
          .order('assigned_at', { ascending: false })

        if (error) {
          // Table pas encore créée / schema cache pas rechargé
          if (isMissingTableError(error)) {
            return []
          }
          throw error
        }
        return (data || []) as SessionCourse[]
      } catch (error: any) {
        if (isMissingTableError(error)) return []
        console.warn('Error fetching session courses:', error)
        return []
      }
    },
    enabled: !!sessionId,
  })

  // Récupérer tous les cours disponibles pour l'organisation
  const { data: availableCourses } = useQuery({
    queryKey: ['available-courses', organizationId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, slug, is_published, difficulty_level')
          .eq('organization_id', organizationId)
          .eq('is_published', true)
          .order('title', { ascending: true })

        if (error) {
          if (error.code === 'PGRST116' || error.code === '42P01') {
            return []
          }
          throw error
        }
        return data || []
      } catch (error: any) {
        console.warn('Error fetching available courses:', error)
        return []
      }
    },
    enabled: !!organizationId,
  })

  // Récupérer la progression de tous les apprenants pour les cours de la session
  const { data: studentProgressData } = useQuery({
    queryKey: ['session-elearning-progress', sessionId, sessionCourses?.map(c => c.course_id)],
    queryFn: async () => {
      if (!sessionCourses?.length || !enrollments.length) return []

      const courseIds = sessionCourses.map(sc => sc.course_id)
      const studentIds = enrollments.map(e => e.student_id)

      try {
        // Récupérer les inscriptions aux cours
        const { data: courseEnrollments, error: enrollError } = await supabase
          .from('course_enrollments')
          .select('*')
          .in('course_id', courseIds)
          .in('student_id', studentIds)

        if (enrollError) {
          if (isMissingTableError(enrollError)) return []
          console.warn('Error fetching course enrollments:', enrollError)
          return []
        }

        // Récupérer la progression des leçons
        const { data: lessonProgress, error: progressError } = await supabase
          .from('lesson_progress')
          .select('*, lessons(course_id)')
          .in('student_id', studentIds)

        if (progressError) {
          if (!isMissingTableError(progressError)) console.warn('Error fetching lesson progress:', progressError)
        }

        // Récupérer le nombre total de leçons par cours
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, course_id')
          .in('course_id', courseIds)

        if (lessonsError) {
          if (!isMissingTableError(lessonsError)) console.warn('Error fetching lessons:', lessonsError)
        }

        // Récupérer les scores des quiz
        const { data: quizAttempts, error: quizError } = await supabase
          .from('quiz_attempts')
          .select('*, quizzes(lesson_id, lessons(course_id))')
          .in('student_id', studentIds)
          // Le schéma actuel utilise `completed_at` (pas `is_completed`)
          .not('completed_at', 'is', null)

        if (quizError) {
          if (!isMissingTableError(quizError)) console.warn('Error fetching quiz attempts:', quizError)
        }

        // Calculer la progression pour chaque apprenant et chaque cours
        const progressMap: StudentProgress[] = []

        for (const enrollment of enrollments) {
          const student = enrollment.students as StudentWithRelations
          if (!student) continue

          for (const sessionCourse of sessionCourses) {
            const courseId = sessionCourse.course_id
            const courseLessons = lessons?.filter(l => l.course_id === courseId) || []
            const totalLessons = courseLessons.length

            const studentLessonProgress = (lessonProgress || []).filter(
              (lp: any) => lp.student_id === enrollment.student_id && lp.lessons?.course_id === courseId
            )
            const completedLessons = studentLessonProgress.filter((lp: any) => lp.is_completed).length

            const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

            // Score moyen des quiz pour ce cours
            const courseQuizAttempts = (quizAttempts || []).filter(
              (qa: any) => qa.student_id === enrollment.student_id && qa.quizzes?.lessons?.course_id === courseId
            )
            const quizScore = courseQuizAttempts.length > 0
              ? Math.round(courseQuizAttempts.reduce((sum: number, qa: any) => sum + (qa.score || 0), 0) / courseQuizAttempts.length)
              : null

            const lastProgress = studentLessonProgress.sort((a: any, b: any) => 
              new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
            )[0]

            let status: 'not_started' | 'in_progress' | 'completed' = 'not_started'
            if (completedLessons > 0 && completedLessons >= totalLessons) {
              status = 'completed'
            } else if (completedLessons > 0) {
              status = 'in_progress'
            }

            progressMap.push({
              student_id: enrollment.student_id,
              student_name: `${student.first_name} ${student.last_name}`,
              course_id: courseId,
              progress,
              completed_lessons: completedLessons,
              total_lessons: totalLessons,
              quiz_score: quizScore,
              last_activity: lastProgress?.updated_at || lastProgress?.created_at || null,
              status,
            })
          }
        }

        return progressMap
      } catch (error: any) {
        if (isMissingTableError(error)) return []
        console.warn('Error calculating progress:', error)
        return []
      }
    },
    enabled: !!sessionCourses?.length && !!enrollments.length,
  })

  // Mutation pour ajouter un cours à la session
  const addCourseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourseId) throw new Error('Veuillez sélectionner un cours')

      const { data, error } = await supabase
        .from('session_courses')
        .insert({
          session_id: sessionId,
          course_id: selectedCourseId,
          is_required: isRequired,
          due_date: dueDate || null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Cours ajouté à la session')
      queryClient.invalidateQueries({ queryKey: ['session-courses', sessionId] })
      setShowAddCourse(false)
      setSelectedCourseId('')
      setIsRequired(true)
      setDueDate('')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'ajout du cours')
    },
  })

  // Mutation pour supprimer un cours de la session
  const removeCourseMutation = useMutation({
    mutationFn: async (sessionCourseId: string) => {
      const { error } = await supabase
        .from('session_courses')
        .delete()
        .eq('id', sessionCourseId)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Cours retiré de la session')
      queryClient.invalidateQueries({ queryKey: ['session-courses', sessionId] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression du cours')
    },
  })

  // Calculer les statistiques globales
  const getGlobalStats = () => {
    if (!studentProgressData?.length || !sessionCourses?.length) {
      return { avgProgress: 0, completed: 0, inProgress: 0, notStarted: 0, avgScore: null }
    }

    const totalEntries = studentProgressData.length
    const avgProgress = Math.round(
      studentProgressData.reduce((sum, p) => sum + p.progress, 0) / totalEntries
    )

    const completed = studentProgressData.filter(p => p.status === 'completed').length
    const inProgress = studentProgressData.filter(p => p.status === 'in_progress').length
    const notStarted = studentProgressData.filter(p => p.status === 'not_started').length

    const scoresWithData = studentProgressData.filter(p => p.quiz_score !== null)
    const avgScore = scoresWithData.length > 0
      ? Math.round(scoresWithData.reduce((sum, p) => sum + (p.quiz_score || 0), 0) / scoresWithData.length)
      : null

    return { avgProgress, completed, inProgress, notStarted, avgScore }
  }

  const globalStats = getGlobalStats()

  // Filtrer les cours déjà assignés
  const coursesNotAssigned = (availableCourses || []).filter(
    course => !sessionCourses?.some(sc => sc.course_id === course.id)
  )

  // Affichage des statistiques par cours
  const getCourseStats = (courseId: string) => {
    const courseProgress = studentProgressData?.filter(p => p.course_id === courseId) || []
    if (!courseProgress.length) {
      return { avgProgress: 0, completed: 0, total: enrollments.length, avgScore: null }
    }

    const avgProgress = Math.round(
      courseProgress.reduce((sum, p) => sum + p.progress, 0) / courseProgress.length
    )
    const completed = courseProgress.filter(p => p.status === 'completed').length
    const scoresWithData = courseProgress.filter(p => p.quiz_score !== null)
    const avgScore = scoresWithData.length > 0
      ? Math.round(scoresWithData.reduce((sum, p) => sum + (p.quiz_score || 0), 0) / scoresWithData.length)
      : null

    return { avgProgress, completed, total: enrollments.length, avgScore }
  }

  // Suivi nominatif (par apprenant)
  const progressByStudent = (studentProgressData || []).reduce((acc: Record<string, any>, p) => {
    acc[p.student_id] = acc[p.student_id] || { student_id: p.student_id, student_name: p.student_name, courses: [] as StudentProgress[] }
    acc[p.student_id].courses.push(p)
    return acc
  }, {})

  const getStudentStats = (studentId: string) => {
    const entries: StudentProgress[] = progressByStudent?.[studentId]?.courses || []
    const avgProgress = entries.length ? Math.round(entries.reduce((s, e) => s + e.progress, 0) / entries.length) : 0
    const completed = entries.filter(e => e.status === 'completed').length
    const inProgress = entries.filter(e => e.status === 'in_progress').length
    const notStarted = entries.filter(e => e.status === 'not_started').length
    const scores = entries.filter(e => e.quiz_score !== null).map(e => e.quiz_score as number)
    const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null
    return { avgProgress, completed, inProgress, notStarted, avgScore }
  }

  if (loadingSessionCourses) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-purple-600" />
              E-Learning de la session
            </CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex rounded-lg border bg-white/70 p-1">
                <button
                  type="button"
                  className={cn('px-3 py-1 text-sm rounded-md', viewMode === 'student' ? 'bg-purple-600 text-white' : 'text-gray-700')}
                  onClick={() => setViewMode('student')}
                >
                  Suivi nominatif
                </button>
                <button
                  type="button"
                  className={cn('px-3 py-1 text-sm rounded-md', viewMode === 'course' ? 'bg-purple-600 text-white' : 'text-gray-700')}
                  onClick={() => setViewMode('course')}
                >
                  Par séquence
                </button>
              </div>
              <Button
                onClick={() => setShowAddCourse(true)}
                disabled={coursesNotAssigned.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une séquence
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Assignez des séquences e-learning aux apprenants de cette session et suivez leur progression.
          </p>
        </CardContent>
      </Card>

      {/* Statistiques globales */}
      {sessionCourses && sessionCourses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Séquences</p>
                  <p className="text-2xl font-bold">{sessionCourses.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progression moy.</p>
                  <p className="text-2xl font-bold">{globalStats.avgProgress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Terminés</p>
                  <p className="text-2xl font-bold text-green-600">{globalStats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En cours</p>
                  <p className="text-2xl font-bold text-yellow-600">{globalStats.inProgress}</p>
                </div>
                <PlayCircle className="h-8 w-8 text-yellow-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score moy.</p>
                  <p className="text-2xl font-bold">
                    {globalStats.avgScore !== null ? `${globalStats.avgScore}%` : 'N/A'}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-indigo-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste (suivi nominatif / par séquence) */}
      {(!sessionCourses || sessionCourses.length === 0) ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <GraduationCap className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Aucune séquence e-learning assignée</p>
              <p className="text-sm mb-4">
                Ajoutez des séquences e-learning pour permettre aux apprenants de suivre des cours en ligne.
              </p>
              {coursesNotAssigned.length > 0 ? (
                <Button onClick={() => setShowAddCourse(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une séquence
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun cours e-learning disponible.{' '}
                  <Link href="/dashboard/elearning" className="text-purple-600 hover:underline">
                    Créer un cours
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'student' ? (
            <div className="space-y-4">
              {enrollments.map((enrollment) => {
                const student = enrollment.students as StudentWithRelations
                if (!student) return null
                const stats = getStudentStats(enrollment.student_id)
                const isExpanded = expandedStudent === enrollment.student_id
                const entries: StudentProgress[] = progressByStudent?.[enrollment.student_id]?.courses || []

                return (
                  <Card key={enrollment.student_id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{student.first_name} {student.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 mr-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Progression</p>
                            <p className="text-sm font-semibold">{stats.avgProgress}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Terminés</p>
                            <p className="text-sm font-semibold text-green-600">{stats.completed}</p>
                          </div>
                          {stats.avgScore !== null && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Score</p>
                              <p className="text-sm font-semibold">{stats.avgScore}%</p>
                            </div>
                          )}
                        </div>

                        <Button variant="outline" size="sm" onClick={() => setExpandedStudent(isExpanded ? null : enrollment.student_id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {isExpanded ? 'Masquer' : 'Détails'}
                        </Button>
                      </div>

                      <div className="px-4 pb-4">
                        <Progress value={stats.avgProgress} className="h-2" />
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-gray-50/50 p-4 space-y-2">
                          {entries.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Aucune séquence assignée ou aucune progression enregistrée.
                            </p>
                          ) : (
                            entries.map((p) => {
                              const courseMeta = sessionCourses.find(sc => sc.course_id === p.course_id)
                              return (
                                <div key={`${p.student_id}-${p.course_id}`} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{courseMeta?.course?.title || 'Séquence'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {p.completed_lessons}/{p.total_lessons} leçons
                                      {p.last_activity && ` • Dernière activité: ${formatDate(p.last_activity)}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="w-24">
                                      <Progress value={p.progress} className="h-2" />
                                      <p className="text-xs text-center mt-1">{p.progress}%</p>
                                    </div>
                                    {p.quiz_score !== null && (
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground">Quiz</p>
                                        <p className="text-sm font-semibold">{p.quiz_score}%</p>
                                      </div>
                                    )}
                                    <Badge variant={p.status === 'completed' ? 'default' : p.status === 'in_progress' ? 'secondary' : 'outline'}>
                                      {p.status === 'completed' ? 'Terminé' : p.status === 'in_progress' ? 'En cours' : 'Non commencé'}
                                    </Badge>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {sessionCourses.map((sessionCourse) => {
                const course = sessionCourse.course
                if (!course) return null

                const stats = getCourseStats(sessionCourse.course_id)
                const isExpanded = expandedCourse === sessionCourse.id
                const courseProgress = studentProgressData?.filter(p => p.course_id === sessionCourse.course_id) || []

                return (
                  <Card key={sessionCourse.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt={course.title} className="w-16 h-16 rounded-lg object-cover" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-purple-100 flex items-center justify-center">
                              <BookOpen className="h-8 w-8 text-purple-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{course.title}</h3>
                              {sessionCourse.is_required && <Badge variant="secondary" className="text-xs">Obligatoire</Badge>}
                              <Badge variant="outline" className="text-xs">
                                {course.difficulty_level === 'beginner' ? 'Débutant' : course.difficulty_level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                              </Badge>
                            </div>
                            {course.short_description && <p className="text-sm text-muted-foreground line-clamp-1">{course.short_description}</p>}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {course.estimated_duration_hours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {course.estimated_duration_hours}h
                                </span>
                              )}
                              {sessionCourse.due_date && (
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Échéance: {formatDate(sessionCourse.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 mr-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Progression</p>
                            <p className="text-sm font-semibold">{stats.avgProgress}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Terminés</p>
                            <p className="text-sm font-semibold text-green-600">{stats.completed}/{stats.total}</p>
                          </div>
                          {stats.avgScore !== null && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Score</p>
                              <p className="text-sm font-semibold">{stats.avgScore}%</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setExpandedCourse(isExpanded ? null : sessionCourse.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            {isExpanded ? 'Masquer' : 'Détails'}
                          </Button>
                          <Link href={`/dashboard/elearning/courses/${course.slug}`} target="_blank">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCourseMutation.mutate(sessionCourse.id)}
                            disabled={removeCourseMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="px-4 pb-4">
                        <Progress value={stats.avgProgress} className="h-2" />
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-gray-50/50 p-4">
                          <h4 className="text-sm font-medium mb-3 flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Progression par apprenant
                          </h4>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {courseProgress.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Aucune donnée de progression disponible
                              </p>
                            ) : (
                              courseProgress.map((progress) => (
                                <div key={`${progress.student_id}-${progress.course_id}`} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", progress.status === 'completed' ? 'bg-green-100' : progress.status === 'in_progress' ? 'bg-yellow-100' : 'bg-gray-100')}>
                                      {progress.status === 'completed' ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      ) : progress.status === 'in_progress' ? (
                                        <PlayCircle className="h-4 w-4 text-yellow-600" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-gray-400" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{progress.student_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {progress.completed_lessons}/{progress.total_lessons} leçons
                                        {progress.last_activity && ` • Dernière activité: ${formatDate(progress.last_activity)}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="w-24">
                                      <Progress value={progress.progress} className="h-2" />
                                      <p className="text-xs text-center mt-1">{progress.progress}%</p>
                                    </div>
                                    {progress.quiz_score !== null && (
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground">Quiz</p>
                                        <p className="text-sm font-semibold">{progress.quiz_score}%</p>
                                      </div>
                                    )}
                                    <Badge variant={progress.status === 'completed' ? 'default' : progress.status === 'in_progress' ? 'secondary' : 'outline'}>
                                      {progress.status === 'completed' ? 'Terminé' : progress.status === 'in_progress' ? 'En cours' : 'Non commencé'}
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Dialog pour ajouter un cours */}
      <Dialog open={showAddCourse} onOpenChange={setShowAddCourse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une séquence e-learning</DialogTitle>
            <DialogDescription>
              Sélectionnez une séquence à assigner aux apprenants de cette session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Séquence e-learning</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une séquence" />
                </SelectTrigger>
                <SelectContent>
                  {coursesNotAssigned.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                checked={isRequired}
                onCheckedChange={(checked) => setIsRequired(checked as boolean)}
              />
              <Label htmlFor="isRequired" className="cursor-pointer">
                Séquence obligatoire
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Date limite (optionnel)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCourse(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => addCourseMutation.mutate()}
              disabled={!selectedCourseId || addCourseMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {addCourseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ajout...
                </>
              ) : (
                'Ajouter'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

