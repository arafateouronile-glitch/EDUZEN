'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import {
  ArrowLeft, Play, CheckCircle, Star, Users, Clock, BookOpen, Award,
  GraduationCap, Target, TrendingUp, ChevronDown, ChevronRight, Sparkles,
  PlayCircle, FileText, Video, Layers, Calendar, MessageSquare, Share2, Edit
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  // Récupérer le cours
  const { data: course, isLoading } = useQuery<{ id: string; [key: string]: any } | null>({
    queryKey: ['course', slug, user?.organization_id],
    queryFn: async () => {
      const result = await elearningService.getCourseBySlug(slug, user?.organization_id || '')
      return result as any
    },
    enabled: !!slug && !!user?.organization_id,
  })

  // Vérifier si l'utilisateur est inscrit
  const { data: enrollment } = useQuery<any>({
    queryKey: ['course-enrollment', course?.id, user?.id],
    queryFn: async () => {
      if (!course?.id || !user?.id) return null
      const enrollments = await elearningService.getStudentEnrollments(user.id)
      return enrollments.find((e: any) => e.course_id === (course as any).id)
    },
    enabled: !!course?.id && !!user?.id,
  })

  // Récupérer les statistiques de notation
  const { data: ratingStats } = useQuery<any>({
    queryKey: ['course-rating-stats', course?.id],
    queryFn: async () => {
      const result = await elearningService.getCourseRatingStats((course as any)?.id || '')
      return result as any
    },
    enabled: !!course?.id,
  })

  // S'inscrire au cours
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!course?.id || !user?.id) throw new Error('Données manquantes')
      return elearningService.enrollInCourse(course.id, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-enrollment'] })
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      router.push(`/dashboard/elearning/courses/${slug}/learn`)
    },
  })

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return {
          label: 'Débutant',
          color: 'from-brand-blue to-brand-cyan',
          bgColor: 'bg-brand-blue/10',
          textColor: 'text-brand-blue',
          icon: Target
        }
      case 'intermediate':
        return {
          label: 'Intermédiaire',
          color: 'from-brand-blue to-brand-blue-dark',
          bgColor: 'bg-brand-blue/15',
          textColor: 'text-brand-blue-dark',
          icon: TrendingUp
        }
      case 'advanced':
        return {
          label: 'Avancé',
          color: 'from-brand-blue-dark to-brand-blue-darker',
          bgColor: 'bg-brand-blue/20',
          textColor: 'text-brand-blue-darker',
          icon: Sparkles
        }
      default:
        return {
          label: difficulty,
          color: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          icon: Target
        }
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="container mx-auto py-12 px-4 max-w-7xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-blue flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <GraduationCap className="h-8 w-8 text-white" />
                </motion.div>
              </div>
              <p className="text-gray-500">Chargement du cours...</p>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="container mx-auto py-12 px-4 max-w-7xl">
          <div className="text-center py-12">
            <GlassCard variant="premium" className="inline-block p-8">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Cours non trouvé</p>
              <Link href="/dashboard/elearning">
                <Button className="mt-4 bg-brand-blue hover:bg-brand-blue-dark">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour aux cours
                </Button>
              </Link>
            </GlassCard>
          </div>
        </div>
      </div>
    )
  }

  // Organiser les leçons par section
  const lessonsBySection: Record<string, any[]> = {}
  course.lessons?.forEach((lesson: any) => {
    const sectionId = lesson.section_id || 'no-section'
    if (!lessonsBySection[sectionId]) {
      lessonsBySection[sectionId] = []
    }
    lessonsBySection[sectionId].push(lesson)
  })

  const difficultyConfig = getDifficultyConfig(course.difficulty_level)
  const DifficultyIcon = difficultyConfig.icon

  const totalLessons = course.total_lessons || course.lessons?.length || 0
  const completedLessons = enrollment?.completed_lessons?.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Background with course cover */}
        <div className="absolute inset-0">
          {course.cover_image_url ? (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-blue-darker" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue-darker/30 to-brand-blue-dark/30" />
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-4 py-8 max-w-7xl">
          {/* Back button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link href="/dashboard/elearning">
              <Button
                variant="ghost"
                size="sm"
                className="mb-6 text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux cours
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end pb-8">
            {/* Course Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-2"
            >
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                  "bg-gradient-to-r shadow-lg backdrop-blur-sm",
                  difficultyConfig.color,
                  "text-white"
                )}>
                  <DifficultyIcon className="h-3.5 w-3.5" />
                  {difficultyConfig.label}
                </span>
                {course.is_featured && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm text-white border border-white/30 shadow-lg">
                    <Sparkles className="h-3.5 w-3.5" />
                    Populaire
                  </span>
                )}
                {enrollment && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm text-white border border-white/30">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Inscrit
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {course.title}
              </h1>

              {/* Short description */}
              {course.short_description && (
                <p className="text-lg text-white/80 mb-6 max-w-2xl">
                  {course.short_description}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-white/90">
                {ratingStats && ratingStats.total > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            star <= Math.round(ratingStats.average)
                              ? "text-brand-blue fill-brand-blue"
                              : "text-white/30"
                          )}
                        />
                      ))}
                    </div>
                    <span className="font-semibold">{ratingStats.average.toFixed(1)}</span>
                    <span className="text-white/60">({ratingStats.total} avis)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{course.total_students || 0} étudiants</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{totalLessons} leçons</span>
                </div>
                {course.estimated_duration_hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{course.estimated_duration_hours}h de contenu</span>
                  </div>
                )}
              </div>

              {/* Instructor */}
              {course.instructor && (
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-semibold border border-white/30">
                    {(course.instructor.full_name || course.instructor.email)?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Créé par</p>
                    <p className="text-white font-medium">
                      {course.instructor.full_name || course.instructor.email}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Quick Actions Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden lg:block"
            >
              <GlassCard variant="premium" className="p-6 backdrop-blur-xl bg-white/95 border-white/50">
                {enrollment ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-blue mb-3">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Vous êtes inscrit</h3>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progression</span>
                        <span className="font-semibold text-brand-blue">
                          {Math.round(enrollment.progress_percentage || 0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${enrollment.progress_percentage || 0}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full"
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        {completedLessons} / {totalLessons} leçons terminées
                      </p>
                    </div>

                    <Link href={`/dashboard/elearning/courses/${slug}/learn`} className="block">
                      <Button className="w-full bg-brand-blue hover:bg-brand-blue-dark shadow-lg shadow-brand-blue/25">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Continuer le cours
                      </Button>
                    </Link>

                    {enrollment.enrollment_status === 'completed' && (
                      <Button variant="outline" className="w-full border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5">
                        <Award className="h-4 w-4 mr-2" />
                        Télécharger le certificat
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-blue mb-3">
                        <GraduationCap className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Commencez à apprendre</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Accédez à toutes les leçons
                      </p>
                    </div>

                    <Button
                      className="w-full bg-brand-blue hover:bg-brand-blue-dark shadow-lg shadow-brand-blue/25"
                      onClick={() => enrollMutation.mutate()}
                      disabled={enrollMutation.isPending}
                    >
                      {enrollMutation.isPending ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="mr-2"
                          >
                            <GraduationCap className="h-4 w-4" />
                          </motion.div>
                          Inscription...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          S'inscrire gratuitement
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Quick stats */}
                <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{totalLessons}</div>
                    <div className="text-xs text-gray-500">Leçons</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {course.estimated_duration_hours || '—'}
                    </div>
                    <div className="text-xs text-gray-500">Heures</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Mobile CTA Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:hidden"
            >
              <GlassCard variant="premium" className="p-6">
                {enrollment ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-blue/10 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-brand-blue" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Vous êtes inscrit</p>
                          <p className="text-sm text-gray-500">
                            {Math.round(enrollment.progress_percentage || 0)}% complété
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/elearning/courses/${slug}/learn`}>
                        <Button className="bg-brand-blue hover:bg-brand-blue-dark">
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Continuer
                        </Button>
                      </Link>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full"
                        style={{ width: `${enrollment.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Prêt à apprendre ?</p>
                      <p className="text-sm text-gray-500">{totalLessons} leçons disponibles</p>
                    </div>
                    <Button
                      className="bg-brand-blue hover:bg-brand-blue-dark"
                      onClick={() => enrollMutation.mutate()}
                      disabled={enrollMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      S'inscrire
                    </Button>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Description */}
            {course.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <GlassCard variant="premium" className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-brand-blue rounded-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">À propos de ce cours</h2>
                  </div>
                  <div className="prose prose-brand-blue max-w-none text-gray-600">
                    <ReactMarkdown>{course.description}</ReactMarkdown>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Course Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <GlassCard variant="premium" className="overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-blue rounded-lg">
                        <Layers className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">Contenu du cours</h2>
                        <p className="text-sm text-gray-500">
                          {course.sections?.length || 0} sections • {totalLessons} leçons
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (course.sections?.length) {
                          setExpandedSections(
                            expandedSections.length === course.sections.length
                              ? []
                              : course.sections.map((s: any) => s.id)
                          )
                        }
                      }}
                      className="text-brand-blue hover:text-brand-blue-dark hover:bg-brand-blue/10"
                    >
                      {expandedSections.length === (course.sections?.length || 0)
                        ? 'Tout réduire'
                        : 'Tout développer'}
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {course.sections && course.sections.length > 0 ? (
                    course.sections.map((section: any, sectionIndex: number) => {
                      const sectionLessons = lessonsBySection[section.id] || []
                      const isExpanded = expandedSections.includes(section.id)
                      const completedInSection = enrollment?.completed_lessons?.filter(
                        (id: string) => sectionLessons.some((l: any) => l.id === id)
                      ).length || 0

                      return (
                        <div key={section.id}>
                          {/* Section Header */}
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm",
                                isExpanded
                                  ? "bg-brand-blue text-white"
                                  : "bg-brand-blue/10 text-brand-blue"
                              )}>
                                {sectionIndex + 1}
                              </div>
                              <div className="text-left">
                                <h3 className="font-semibold text-gray-900">{section.title}</h3>
                                <p className="text-sm text-gray-500">
                                  {sectionLessons.length} leçons
                                  {enrollment && completedInSection > 0 && (
                                    <span className="text-brand-blue ml-2">
                                      • {completedInSection}/{sectionLessons.length} terminées
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            </motion.div>
                          </button>

                          {/* Section Lessons */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-4 pr-4 pb-4 space-y-2">
                                  {sectionLessons.map((lesson: any, lessonIndex: number) => {
                                    const isCompleted = enrollment?.completed_lessons?.includes(lesson.id)

                                    return (
                                      <motion.div
                                        key={lesson.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2, delay: lessonIndex * 0.05 }}
                                        className={cn(
                                          "group flex items-center justify-between p-3 rounded-xl transition-all",
                                          "border",
                                          isCompleted
                                            ? "bg-brand-blue/5 border-brand-blue/20"
                                            : "bg-white border-gray-100 hover:border-brand-blue/30 hover:bg-brand-blue/5"
                                        )}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            isCompleted
                                              ? "bg-brand-blue text-white"
                                              : "bg-gray-100 text-gray-500 group-hover:bg-brand-blue/10 group-hover:text-brand-blue"
                                          )}>
                                            {isCompleted ? (
                                              <CheckCircle className="h-4 w-4" />
                                            ) : lesson.lesson_type === 'video' ? (
                                              <Video className="h-4 w-4" />
                                            ) : (
                                              <FileText className="h-4 w-4" />
                                            )}
                                          </div>
                                          <div>
                                            <h4 className={cn(
                                              "font-medium text-sm",
                                              isCompleted ? "text-brand-blue" : "text-gray-700"
                                            )}>
                                              {lesson.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                              {lesson.video_duration_minutes && (
                                                <span>{lesson.video_duration_minutes} min</span>
                                              )}
                                              {lesson.is_preview && (
                                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                                                  Aperçu gratuit
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {enrollment ? (
                                          <Link href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}>
                                            <Button
                                              size="sm"
                                              variant={isCompleted ? "outline" : "default"}
                                              className={cn(
                                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                                isCompleted
                                                  ? "border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10"
                                                  : "bg-brand-blue hover:bg-brand-blue-dark"
                                              )}
                                            >
                                              {isCompleted ? 'Revoir' : 'Commencer'}
                                            </Button>
                                          </Link>
                                        ) : lesson.is_preview ? (
                                          <Link href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="opacity-0 group-hover:opacity-100 transition-opacity border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10"
                                            >
                                              Aperçu
                                            </Button>
                                          </Link>
                                        ) : (
                                          <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <span>Inscrivez-vous</span>
                                            <ChevronRight className="h-3 w-3" />
                                          </div>
                                        )}
                                      </motion.div>
                                    )
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })
                  ) : course.lessons && course.lessons.length > 0 ? (
                    <div className="p-4 space-y-2">
                      {course.lessons.map((lesson: any, index: number) => {
                        const isCompleted = enrollment?.completed_lessons?.includes(lesson.id)

                        return (
                          <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className={cn(
                              "group flex items-center justify-between p-3 rounded-xl transition-all border",
                              isCompleted
                                ? "bg-brand-blue/5 border-brand-blue/20"
                                : "bg-white border-gray-100 hover:border-brand-blue/30 hover:bg-brand-blue/5"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                isCompleted
                                  ? "bg-brand-blue text-white"
                                  : "bg-gray-100 text-gray-500 group-hover:bg-brand-blue/10 group-hover:text-brand-blue"
                              )}>
                                {isCompleted ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : lesson.lesson_type === 'video' ? (
                                  <Video className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <h4 className={cn(
                                  "font-medium text-sm",
                                  isCompleted ? "text-brand-blue" : "text-gray-700"
                                )}>
                                  {lesson.title}
                                </h4>
                                {lesson.video_duration_minutes && (
                                  <span className="text-xs text-gray-500">
                                    {lesson.video_duration_minutes} min
                                  </span>
                                )}
                              </div>
                            </div>

                            {enrollment && (
                              <Link href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}>
                                <Button
                                  size="sm"
                                  variant={isCompleted ? "outline" : "default"}
                                  className={cn(
                                    "opacity-0 group-hover:opacity-100 transition-opacity",
                                    isCompleted
                                      ? "border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10"
                                      : "bg-brand-blue hover:bg-brand-blue-dark"
                                  )}
                                >
                                  {isCompleted ? 'Revoir' : 'Commencer'}
                                </Button>
                              </Link>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">Aucune leçon disponible pour le moment</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Reviews */}
            {course.reviews && course.reviews.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <GlassCard variant="premium" className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-blue rounded-lg">
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">Avis des étudiants</h2>
                        <p className="text-sm text-gray-500">{course.reviews.length} avis</p>
                      </div>
                    </div>
                    {ratingStats && ratingStats.total > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-brand-blue/10 rounded-xl">
                        <Star className="h-5 w-5 text-brand-blue fill-brand-blue" />
                        <span className="text-xl font-bold text-brand-blue">
                          {ratingStats.average.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {course.reviews.slice(0, 5).map((review: any, index: number) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="p-4 rounded-xl bg-gray-50/50 border border-gray-100"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {(review.student?.full_name || review.student?.email || 'U')?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium text-gray-900 truncate">
                                {review.student?.full_name || review.student?.email || 'Utilisateur'}
                              </span>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {formatDate(review.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    star <= (review.rating || 0)
                                      ? "text-brand-blue fill-brand-blue"
                                      : "text-gray-300"
                                  )}
                                />
                              ))}
                            </div>
                            {review.review_text && (
                              <p className="text-sm text-gray-600">{review.review_text}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Desktop only (mobile has card at top) */}
          <div className="hidden lg:block space-y-6">
            {/* Sticky enrollment card is in hero, show course info here */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="sticky top-6"
            >
              <GlassCard variant="premium" className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Ce cours comprend</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 bg-brand-blue/10 rounded-lg">
                      <BookOpen className="h-4 w-4 text-brand-blue" />
                    </div>
                    <span className="text-gray-600">{totalLessons} leçons</span>
                  </div>
                  {course.estimated_duration_hours && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 bg-brand-blue/10 rounded-lg">
                        <Clock className="h-4 w-4 text-brand-blue" />
                      </div>
                      <span className="text-gray-600">{course.estimated_duration_hours}h de contenu</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 bg-brand-blue/10 rounded-lg">
                      <Award className="h-4 w-4 text-brand-blue" />
                    </div>
                    <span className="text-gray-600">Certificat de complétion</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 bg-brand-blue/10 rounded-lg">
                      <Target className="h-4 w-4 text-brand-blue" />
                    </div>
                    <span className="text-gray-600">Niveau {difficultyConfig.label.toLowerCase()}</span>
                  </div>
                </div>

                {/* Share & Edit buttons */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                  <Link href={`/dashboard/elearning/courses/${slug}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </GlassCard>

              {/* Published info */}
              {course.published_at && (
                <GlassCard variant="subtle" className="p-4 mt-4">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Publié le {formatDate(course.published_at)}</span>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
