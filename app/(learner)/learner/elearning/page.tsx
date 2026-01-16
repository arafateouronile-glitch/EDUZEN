'use client'

import { useQuery } from '@tanstack/react-query'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion } from '@/components/ui/motion'
import {
  PlayCircle,
  BookOpen,
  Clock,
  CheckCircle2,
  Search,
  Play,
  Award,
  TrendingUp,
  ChevronRight,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export default function LearnerElearningPage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])
  const [searchQuery, setSearchQuery] = useState('')

  // Récupérer les cours assignés via les sessions de l'apprenant
  // NOTE: on ne requête pas `enrollments` / `sessions` pour éviter les problèmes RLS/relations.
  // La RLS de `session_courses` filtre déjà par apprenant (header x-learner-student-id).
  const { data: sessionCourses, isLoading: isLoadingSessionCourses } = useQuery({
    queryKey: ['learner-session-courses', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []

      try {
        const { data, error } = await supabase
          .from('session_courses')
          .select(`
            *,
            course:courses(
              id, title, slug, short_description, description,
              difficulty_level, estimated_duration_hours, thumbnail_url, is_published
            )
          `)
          .order('assigned_at', { ascending: false })

        if (error) {
          if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
            return []
          }
          throw error
        }
        return data || []
      } catch (error: any) {
        logger.warn('Error fetching session courses', error, {
          studentId: maskId(studentId),
          error: sanitizeError(error),
        })
        return []
      }
    },
    enabled: !!studentId,
  })

  // Récupérer la progression de l'apprenant pour les cours de session
  const { data: lessonProgressData } = useQuery({
    queryKey: ['learner-lesson-progress', studentId, sessionCourses?.map(sc => sc.course_id)],
    queryFn: async () => {
      if (!studentId || !sessionCourses?.length) return {}
      if (!supabase) return {}

      const courseIds = sessionCourses.map(sc => sc.course_id)

      try {
        // Récupérer la progression des leçons
        const { data: progress, error } = await supabase
          .from('lesson_progress')
          .select('*, lessons(course_id)')
          .eq('student_id', studentId)

        if (error) {
          logger.warn('Error fetching lesson progress', error, {
            studentId: maskId(studentId),
            error: sanitizeError(error),
          })
          return {}
        }

        // Récupérer le nombre total de leçons par cours
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id, course_id')
          .in('course_id', courseIds)

        // Calculer la progression par cours
        const progressByCourse: Record<string, { completed: number; total: number; percentage: number }> = {}

        for (const courseId of courseIds) {
          const courseLessons = lessons?.filter(l => l.course_id === courseId) || []
          const completedLessons = (progress || []).filter(
            (p: any) => p.lessons?.course_id === courseId && p.is_completed
          ).length

          const total = courseLessons.length
          const percentage = total > 0 ? Math.round((completedLessons / total) * 100) : 0

          progressByCourse[courseId] = {
            completed: completedLessons,
            total,
            percentage,
          }
        }

        return progressByCourse
      } catch (error: any) {
        logger.warn('Error calculating progress', error, {
          studentId: maskId(studentId),
          error: sanitizeError(error),
        })
        return {}
      }
    },
    enabled: !!studentId && !!sessionCourses?.length,
  })

  // Construire les "enrollments" à partir des cours de session avec progression
  const enrollments = (sessionCourses || []).map((sc: any) => ({
    id: sc.id,
    course_id: sc.course_id,
    courses: sc.course,
    // session_name non disponible sans jointure `sessions` (évite RLS)
    session: null,
    progress_percentage: lessonProgressData?.[sc.course_id]?.percentage || 0,
    completed_lessons: lessonProgressData?.[sc.course_id]?.completed || 0,
    total_lessons: lessonProgressData?.[sc.course_id]?.total || 0,
    status: lessonProgressData?.[sc.course_id]?.percentage === 100 ? 'completed' : 
            lessonProgressData?.[sc.course_id]?.percentage > 0 ? 'in_progress' : 'not_started',
    is_required: sc.is_required,
    due_date: sc.due_date,
  }))

  const isLoading = isLoadingSessionCourses

  // Récupérer les cours disponibles (non inscrits)
  const { data: availableCourses } = useQuery({
    queryKey: ['learner-available-courses', studentData?.id, studentData?.organization_id],
    queryFn: async () => {
      if (!studentData?.id) return []
      
      const enrolledCourseIds = enrollments?.map((e: any) => e.course_id) || []
      
      try {
        let query = supabase
          .from('courses')
          .select('*')
          .eq('is_published', true)
          .eq('organization_id', studentData.organization_id)
        
        if (enrolledCourseIds.length > 0) {
          query = query.not('id', 'in', `(${enrolledCourseIds.join(',')})`)
        }
        
        const { data, error } = await query.order('created_at', { ascending: false })
        
        if (error) {
          // Si la table n'existe pas encore ou erreur 400, retourner un tableau vide
          if (
            error.code === 'PGRST116' ||
            error.code === '42P01' ||
            error.code === 'PGRST301' ||
            error.status === 400 ||
            error.code === '400' ||
            error.message?.includes('relation') ||
            error.message?.includes('relationship') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('schema cache')
          ) {
            logger.warn('Courses table does not exist yet or invalid query', error, {
              studentId: maskId(studentData.id),
              error: sanitizeError(error),
            })
            return []
          }
          throw error
        }
        
        return data || []
      } catch (error: any) {
        // Gérer les erreurs de table inexistante ou erreurs 400
        if (
          error?.code === 'PGRST116' ||
          error?.code === '42P01' ||
          error?.code === 'PGRST301' ||
          error?.status === 400 ||
          error?.code === '400' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('relationship') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache')
        ) {
          logger.warn('Courses table does not exist yet or invalid query', error, {
            studentId: maskId(studentData.id),
            error: sanitizeError(error),
          })
          return []
        }
        throw error
      }
    },
    enabled: !!studentData?.id && !!studentData?.organization_id,
  })

  // Filtrer les cours
  const inProgressCourses = enrollments?.filter((e: any) => 
    e.status === 'in_progress'
  ) || []

  const completedCourses = enrollments?.filter((e: any) => 
    e.status === 'completed'
  ) || []

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredEnrollments = enrollments?.filter((e: any) => {
    if (!normalizedSearch) return true
    const title = (e.courses?.title || '').toLowerCase()
    return title.includes(normalizedSearch)
  }) || []

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-100 text-green-700',
      intermediate: 'bg-amber-100 text-amber-700',
      advanced: 'bg-red-100 text-red-700',
    }
    const labels: Record<string, string> = {
      beginner: 'Débutant',
      intermediate: 'Intermédiaire',
      advanced: 'Avancé',
    }
    return (
      <Badge className={`${colors[level] || 'bg-gray-100 text-gray-700'}`}>
        {labels[level] || level}
      </Badge>
    )
  }

  const CourseCard = ({ enrollment, isAvailable = false }: { enrollment: any, isAvailable?: boolean }) => {
    const course = isAvailable ? enrollment : enrollment.courses
    const progress = enrollment.progress_percentage || 0

    // Si le cours est assigné mais que la jointure RLS empêche de lire `courses`,
    // on affiche une carte "placeholder" au lieu de ne rien montrer.
    if (!course?.slug) {
      return (
        <GlassCard className="overflow-hidden border border-amber-200 bg-amber-50/40">
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-2">
                Cours assigné (détails indisponibles)
              </h3>
              <Badge className="bg-amber-500 text-white">Configuration</Badge>
            </div>
            <p className="text-sm text-gray-600">
              Ce cours a été assigné à votre session, mais ses informations ne sont pas encore accessibles.
              Réessayez dans quelques secondes (ou contactez l’administrateur pour appliquer les règles d’accès apprenant).
            </p>
          </div>
        </GlassCard>
      )
    }

    return (
      <Link
        href={`/learner/elearning/${course?.slug}`}
        className="block"
      >
        <GlassCard className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
          {/* Thumbnail */}
          <div className="relative h-40 bg-gradient-to-br from-brand-blue/20 to-indigo-100">
            {course?.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-brand-blue/30" />
              </div>
            )}
            
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="h-8 w-8 text-brand-blue ml-1" />
              </div>
            </div>

            {/* Status badge */}
            {!isAvailable && (
              <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                {enrollment.status === 'completed' ? (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Terminé
                  </Badge>
                ) : progress > 0 ? (
                  <Badge className="bg-brand-blue text-white">
                    En cours
                  </Badge>
                ) : null}
                {enrollment.is_required && (
                  <Badge variant="secondary" className="text-xs">
                    Obligatoire
                  </Badge>
                )}
              </div>
            )}

            {/* Session name */}
            {!isAvailable && enrollment.session?.name && (
              <div className="absolute bottom-3 left-3">
                <Badge variant="outline" className="bg-white/90 text-xs">
                  {enrollment.session.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-brand-blue transition-colors">
                {course?.title}
              </h3>
            </div>

            {(course?.description || course?.short_description) && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                {course.short_description || course.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
              {/* Nombre de leçons */}
              {enrollment.total_lessons > 0 && (
                <span className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  {enrollment.total_lessons} leçons
                </span>
              )}
              {course?.estimated_duration_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {course.estimated_duration_hours}h
                </span>
              )}
              {course?.difficulty_level && getLevelBadge(course.difficulty_level)}
            </div>

            {/* Due date */}
            {!isAvailable && enrollment.due_date && (
              <div className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Échéance: {new Date(enrollment.due_date).toLocaleDateString('fr-FR')}
              </div>
            )}

            {/* Progress bar */}
            {!isAvailable && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {enrollment.completed_lessons}/{enrollment.total_lessons} leçons
                  </span>
                  <span className="font-semibold text-brand-blue">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-blue to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {isAvailable && (
              <Button className="w-full mt-2" variant="outline">
                Commencer le cours
              </Button>
            )}
          </div>
        </GlassCard>
      </Link>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-xl">
            <PlayCircle className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              E-Learning
            </h1>
            <p className="text-gray-500">
              Apprenez à votre rythme avec nos cours en ligne
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4 text-center">
          <PlayCircle className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{inProgressCourses.length}</div>
          <p className="text-xs text-gray-500">En cours</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{completedCourses.length}</div>
          <p className="text-xs text-gray-500">Terminés</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <TrendingUp className="h-6 w-6 text-brand-blue mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {enrollments?.reduce((acc: number, e: any) => acc + (e.progress_percentage || 0), 0) / (enrollments?.length || 1) || 0}%
          </div>
          <p className="text-xs text-gray-500">Progression moyenne</p>
        </GlassCard>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Rechercher un cours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="my-courses" className="space-y-6">
          <TabsList className="bg-white/50 backdrop-blur-sm border border-gray-200/50 p-1 rounded-xl">
            <TabsTrigger value="my-courses" className="rounded-lg data-[state=active]:bg-brand-blue data-[state=active]:text-white">
              <BookOpen className="h-4 w-4 mr-2" />
              Mes cours ({enrollments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="available" className="rounded-lg data-[state=active]:bg-brand-blue data-[state=active]:text-white">
              <PlayCircle className="h-4 w-4 mr-2" />
              Disponibles ({availableCourses?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-courses">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredEnrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEnrollments.map((enrollment: any) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun cours
                </h3>
                <p className="text-gray-500 mb-4">
                  Vous n'êtes inscrit à aucun cours pour le moment
                </p>
                <Button variant="outline">
                  Découvrir les cours disponibles
                </Button>
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="available">
            {availableCourses && availableCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map((course: any) => (
                  <CourseCard key={course.id} enrollment={course} isAvailable />
                ))}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <PlayCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Tous les cours sont déjà attribués
                </h3>
                <p className="text-gray-500">
                  Vous avez accès à tous les cours disponibles
                </p>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}


