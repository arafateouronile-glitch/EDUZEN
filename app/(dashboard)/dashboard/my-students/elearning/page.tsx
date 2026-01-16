'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GraduationCap,
  Users,
  BookOpen,
  TrendingUp,
  CheckCircle,
  PlayCircle,
  XCircle,
  Search,
  Clock,
  BarChart3,
  ArrowLeft,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { formatDate, cn } from '@/lib/utils'

interface StudentCourseProgress {
  student_id: string
  student_name: string
  student_email: string
  course_id: string
  course_title: string
  course_slug: string
  session_id: string
  session_name: string
  progress: number
  completed_lessons: number
  total_lessons: number
  quiz_score: number | null
  last_activity: string | null
  status: 'not_started' | 'in_progress' | 'completed'
  is_required: boolean
  due_date: string | null
}

export default function TeacherElearningProgressPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set())

  // Récupérer les sessions où l'enseignant est affecté
  const { data: teacherSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['teacher-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      try {
        // Récupérer les sessions où l'utilisateur est formateur
        const { data, error } = await supabase
          .from('sessions')
          .select(`
            id, name, start_date, end_date, status,
            session_trainers!inner(user_id)
          `)
          .eq('session_trainers.user_id', user.id)
          .order('start_date', { ascending: false })

        if (error) {
          // Essayer sans le filtre session_trainers si la relation n'existe pas
          if (error.message?.includes('relationship') || error.message?.includes('schema cache')) {
            // Fallback : récupérer toutes les sessions de l'organisation pour les admins
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('sessions')
              .select('id, name, start_date, end_date, status')
              .eq('organization_id', user.organization_id || '')
              .order('start_date', { ascending: false })

            if (fallbackError) throw fallbackError
            return fallbackData || []
          }
          throw error
        }
        return data || []
      } catch (error: any) {
        console.warn('Error fetching teacher sessions:', error)
        return []
      }
    },
    enabled: !!user?.id,
  })

  // Récupérer tous les cours e-learning des sessions de l'enseignant
  const { data: sessionCourses } = useQuery({
    queryKey: ['teacher-session-courses', teacherSessions?.map((s: any) => s.id)],
    queryFn: async () => {
      if (!teacherSessions?.length) return []

      const sessionIds = teacherSessions.map((s: any) => s.id)

      try {
        const { data, error } = await supabase
          .from('session_courses')
          .select(`
            *,
            course:courses(id, title, slug, difficulty_level),
            session:sessions(id, name)
          `)
          .in('session_id', sessionIds)

        if (error) {
          if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
            return []
          }
          throw error
        }
        return data || []
      } catch (error: any) {
        console.warn('Error fetching session courses:', error)
        return []
      }
    },
    enabled: !!teacherSessions?.length,
  })

  // Récupérer les apprenants et leur progression
  const { data: studentProgressData, isLoading: loadingProgress } = useQuery({
    queryKey: ['teacher-student-progress', (sessionCourses || []).map((sc: any) => sc.id)],
    queryFn: async () => {
      if (!sessionCourses?.length || !teacherSessions?.length) return []

      const sessionIds = teacherSessions.map((s: any) => s.id)
      const courseIds = [...new Set((sessionCourses || []).map((sc: any) => sc.course_id))]

      try {
        // Récupérer les inscriptions des étudiants aux sessions
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select(`
            student_id, session_id,
            students(id, first_name, last_name, email)
          `)
          .in('session_id', sessionIds)

        if (enrollError) throw enrollError

        // Récupérer les leçons
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id, course_id')
          .in('course_id', courseIds)

        // Récupérer la progression des leçons pour tous les étudiants
        const studentIds = [...new Set((enrollments || []).map((e: any) => e.student_id))]
        
        const { data: lessonProgress } = await supabase
          .from('lesson_progress')
          .select('*, lessons(course_id)')
          .in('student_id', studentIds)

        // Récupérer les scores des quiz
        const { data: quizAttempts } = await supabase
          .from('quiz_attempts')
          .select('*, quizzes(lesson_id, lessons(course_id))')
          .in('student_id', studentIds)
          .eq('is_completed', true)

        // Construire les données de progression
        const progressData: StudentCourseProgress[] = []

        for (const enrollment of (enrollments || []) as any[]) {
          const student = enrollment.students as any
          if (!student) continue

          // Trouver les cours assignés à cette session
          const sessionCoursesForStudent = (sessionCourses || []).filter(
            (sc: any) => sc.session_id === enrollment.session_id
          )

          for (const sessionCourse of sessionCoursesForStudent as any[]) {
            const courseId = sessionCourse.course_id
            const courseLessons = (lessons || []).filter((l: any) => l.course_id === courseId)
            const totalLessons = courseLessons.length

            const studentLessonProgress = (lessonProgress || []).filter(
              (lp: any) => lp.student_id === enrollment.student_id && lp.lessons?.course_id === courseId
            )
            const completedLessons = studentLessonProgress.filter((lp: any) => lp.is_completed).length

            const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

            // Score moyen des quiz
            const courseQuizAttempts = (quizAttempts || []).filter(
              (qa: any) => qa.student_id === enrollment.student_id && qa.quizzes?.lessons?.course_id === courseId
            )
            const quizScore = courseQuizAttempts.length > 0
              ? Math.round(courseQuizAttempts.reduce((sum: number, qa: any) => sum + (qa.score || 0), 0) / courseQuizAttempts.length)
              : null

            const lastProgress: any = studentLessonProgress.sort((a: any, b: any) =>
              new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
            )[0]

            let status: 'not_started' | 'in_progress' | 'completed' = 'not_started'
            if (completedLessons > 0 && completedLessons >= totalLessons) {
              status = 'completed'
            } else if (completedLessons > 0) {
              status = 'in_progress'
            }

            progressData.push({
              student_id: enrollment.student_id,
              student_name: `${student.first_name} ${student.last_name}`,
              student_email: student.email || '',
              course_id: courseId,
              course_title: sessionCourse.course?.title || 'Cours',
              course_slug: sessionCourse.course?.slug || '',
              session_id: enrollment.session_id,
              session_name: sessionCourse.session?.name || 'Session',
              progress,
              completed_lessons: completedLessons,
              total_lessons: totalLessons,
              quiz_score: quizScore,
              last_activity: lastProgress?.updated_at || lastProgress?.created_at || null,
              status,
              is_required: sessionCourse.is_required,
              due_date: sessionCourse.due_date,
            })
          }
        }

        return progressData
      } catch (error: any) {
        console.warn('Error fetching student progress:', error)
        return []
      }
    },
    enabled: !!sessionCourses?.length,
  })

  // Filtrer les données
  const filteredProgress = (studentProgressData || []).filter((p) => {
    const matchesSearch = p.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.student_email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSession = selectedSession === 'all' || p.session_id === selectedSession
    const matchesCourse = selectedCourse === 'all' || p.course_id === selectedCourse

    return matchesSearch && matchesSession && matchesCourse
  })

  // Grouper par étudiant
  const progressByStudent = filteredProgress.reduce((acc, p) => {
    if (!acc[p.student_id]) {
      acc[p.student_id] = {
        student_id: p.student_id,
        student_name: p.student_name,
        student_email: p.student_email,
        courses: [],
      }
    }
    acc[p.student_id].courses.push(p)
    return acc
  }, {} as Record<string, { student_id: string; student_name: string; student_email: string; courses: StudentCourseProgress[] }>)

  // Calculer les statistiques globales
  const globalStats = {
    totalStudents: Object.keys(progressByStudent).length,
    totalCourses: [...new Set(filteredProgress.map(p => p.course_id))].length,
    avgProgress: filteredProgress.length > 0
      ? Math.round(filteredProgress.reduce((sum, p) => sum + p.progress, 0) / filteredProgress.length)
      : 0,
    completed: filteredProgress.filter(p => p.status === 'completed').length,
    inProgress: filteredProgress.filter(p => p.status === 'in_progress').length,
    notStarted: filteredProgress.filter(p => p.status === 'not_started').length,
  }

  // Listes pour les filtres
  const uniqueSessions = [...new Map(
    (sessionCourses || []).map((sc: any) => [sc.session_id, { id: sc.session_id, name: sc.session?.name }])
  ).values()]

  const uniqueCourses = [...new Map(
    (sessionCourses || []).map((sc: any) => [sc.course_id, { id: sc.course_id, title: sc.course?.title }])
  ).values()]

  const toggleStudentExpand = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  const isLoading = loadingSessions || loadingProgress

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/my-students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <GraduationCap className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suivi E-Learning</h1>
            <p className="text-gray-500">Progression des apprenants dans vos sessions</p>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Apprenants</p>
                <p className="text-xl font-bold">{globalStats.totalStudents}</p>
              </div>
              <Users className="h-6 w-6 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Cours</p>
                <p className="text-xl font-bold">{globalStats.totalCourses}</p>
              </div>
              <BookOpen className="h-6 w-6 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Progression</p>
                <p className="text-xl font-bold">{globalStats.avgProgress}%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-indigo-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Terminés</p>
                <p className="text-xl font-bold text-green-600">{globalStats.completed}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">En cours</p>
                <p className="text-xl font-bold text-yellow-600">{globalStats.inProgress}</p>
              </div>
              <PlayCircle className="h-6 w-6 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Non commencés</p>
                <p className="text-xl font-bold text-gray-400">{globalStats.notStarted}</p>
              </div>
              <XCircle className="h-6 w-6 text-gray-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un apprenant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Toutes les sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sessions</SelectItem>
                {uniqueSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tous les cours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les cours</SelectItem>
                {uniqueCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des apprenants */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : Object.keys(progressByStudent).length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <GraduationCap className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Aucune donnée de progression</p>
              <p className="text-sm">
                {sessionCourses?.length === 0
                  ? 'Aucun cours e-learning n\'est assigné à vos sessions.'
                  : 'Aucun apprenant ne correspond à vos critères de recherche.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(progressByStudent).map((student) => {
            const isExpanded = expandedStudents.has(student.student_id)
            const avgProgress = Math.round(
              student.courses.reduce((sum, c) => sum + c.progress, 0) / student.courses.length
            )
            const completedCount = student.courses.filter(c => c.status === 'completed').length

            return (
              <Card key={student.student_id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* En-tête de l'étudiant */}
                  <button
                    onClick={() => toggleStudentExpand(student.student_id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">{student.student_name}</h3>
                        <p className="text-sm text-muted-foreground">{student.student_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mr-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Cours</p>
                        <p className="text-sm font-semibold">{student.courses.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Terminés</p>
                        <p className="text-sm font-semibold text-green-600">
                          {completedCount}/{student.courses.length}
                        </p>
                      </div>
                      <div className="w-24">
                        <p className="text-xs text-muted-foreground text-center mb-1">Progression</p>
                        <Progress value={avgProgress} className="h-2" />
                        <p className="text-xs text-center mt-1 font-semibold">{avgProgress}%</p>
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Détails des cours */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50/50 p-4">
                      <div className="space-y-3">
                        {student.courses.map((course) => (
                          <div
                            key={`${student.student_id}-${course.course_id}`}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                course.status === 'completed' ? 'bg-green-100' :
                                course.status === 'in_progress' ? 'bg-yellow-100' : 'bg-gray-100'
                              )}>
                                {course.status === 'completed' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : course.status === 'in_progress' ? (
                                  <PlayCircle className="h-4 w-4 text-yellow-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{course.course_title}</p>
                                  {course.is_required && (
                                    <Badge variant="secondary" className="text-xs">Obligatoire</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {course.session_name}
                                  {course.last_activity && ` • Dernière activité: ${formatDate(course.last_activity)}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Leçons</p>
                                <p className="text-sm font-semibold">
                                  {course.completed_lessons}/{course.total_lessons}
                                </p>
                              </div>
                              {course.quiz_score !== null && (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">Quiz</p>
                                  <p className="text-sm font-semibold">{course.quiz_score}%</p>
                                </div>
                              )}
                              {course.due_date && (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">Échéance</p>
                                  <p className={cn(
                                    "text-xs font-semibold",
                                    new Date(course.due_date) < new Date() && course.status !== 'completed'
                                      ? 'text-red-600'
                                      : 'text-gray-600'
                                  )}>
                                    {formatDate(course.due_date)}
                                  </p>
                                </div>
                              )}
                              <div className="w-24">
                                <Progress value={course.progress} className="h-2" />
                                <p className="text-xs text-center mt-1">{course.progress}%</p>
                              </div>
                              <Badge variant={
                                course.status === 'completed' ? 'default' :
                                course.status === 'in_progress' ? 'secondary' : 'outline'
                              }>
                                {course.status === 'completed' ? 'Terminé' :
                                 course.status === 'in_progress' ? 'En cours' : 'Non commencé'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}





