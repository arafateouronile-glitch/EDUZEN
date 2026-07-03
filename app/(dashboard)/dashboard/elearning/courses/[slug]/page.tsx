'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service.client'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Play, CheckCircle, Star, Users, Clock, BookOpen, Award,
  GraduationCap, Target, TrendingUp, ChevronDown, Sparkles,
  PlayCircle, FileText, Video, Layers, Calendar, MessageSquare, Share2, Edit, AlertCircle
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
      return enrollments.find((e: any) => e.course_id === (course as any).id) ?? null
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
        return { label: 'Débutant', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: Target }
      case 'intermediate':
        return { label: 'Intermédiaire', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: TrendingUp }
      case 'advanced':
        return { label: 'Avancé', color: 'text-purple-600 bg-purple-50 border-purple-100', icon: Sparkles }
      default:
        return { label: difficulty, color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Target }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement du cours...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-brand-blue/60" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cours introuvable</h2>
          <p className="text-gray-500 mb-6">Ce cours n'existe pas ou a été supprimé.</p>
          <Link href="/dashboard/elearning">
            <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan text-white border-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au catalogue
            </Button>
          </Link>
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
    <div className="min-h-screen flex flex-col -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden min-h-[320px] flex flex-col">

        {/* Fond : image cover en full-bleed OU gradient light */}
        {course.cover_image_url ? (
          <>
            <img
              src={course.cover_image_url}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay : opaque à gauche, transparent à droite */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/75 to-slate-900/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-brand-cyan-ghost/40 to-brand-blue-ghost/60" />
            {/* Grid décoratif subtil */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#274472 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            {/* Orb accent */}
            <div className="absolute -top-20 right-0 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-brand-cyan/20 to-brand-blue/10 blur-3xl pointer-events-none" />
          </>
        )}

        {/* Contenu */}
        <div className={cn(
          "relative flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-10 flex flex-col",
          course.cover_image_url ? "text-white" : "text-gray-900"
        )}>

          {/* Breadcrumb + Edit */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/dashboard/elearning"
              className={cn(
                "inline-flex items-center gap-1.5 text-sm transition-colors",
                course.cover_image_url ? "text-white/50 hover:text-white" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au catalogue
            </Link>
            <Link href={`/dashboard/elearning/courses/${slug}/edit`}>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 backdrop-blur-sm",
                  course.cover_image_url
                    ? "border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30"
                    : "border-brand-blue/20 bg-white/80 text-brand-blue hover:bg-white hover:border-brand-blue/40"
                )}
              >
                <Edit className="h-3.5 w-3.5" />
                Éditer
              </Button>
            </Link>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm",
              course.cover_image_url
                ? "bg-white/15 border border-white/20 text-white"
                : "bg-brand-blue/10 border border-brand-blue/20 text-brand-blue"
            )}>
              <DifficultyIcon className="h-3 w-3" />
              {difficultyConfig.label}
            </span>
            {course.is_featured && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/20 border border-amber-400/30 text-amber-400 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" />
                Populaire
              </span>
            )}
            {course.is_published ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan backdrop-blur-sm">
                Publié
              </span>
            ) : (
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm",
                course.cover_image_url
                  ? "bg-white/10 border border-white/15 text-white/50"
                  : "bg-gray-100 border border-gray-200 text-gray-400"
              )}>
                Brouillon
              </span>
            )}
          </div>

          {/* Titre */}
          <h1 className={cn(
            "text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-snug mb-3 max-w-3xl",
            !course.cover_image_url && "bg-gradient-to-r from-gray-900 via-brand-blue to-brand-blue-dark bg-clip-text text-transparent"
          )}>
            {course.title}
          </h1>

          {/* Description */}
          {course.short_description && (
            <p className={cn(
              "text-base md:text-lg leading-relaxed max-w-2xl mb-6",
              course.cover_image_url ? "text-white/70" : "text-gray-500"
            )}>
              {course.short_description}
            </p>
          )}

          {/* Stats chips */}
          <div className="flex flex-wrap items-center gap-2 mt-auto">
            {[
              { icon: Users,    value: `${course.total_students || 0} étudiant${(course.total_students || 0) > 1 ? 's' : ''}` },
              { icon: Clock,    value: `${course.estimated_duration_hours || 0}h de contenu` },
              { icon: BookOpen, value: `${totalLessons} leçon${totalLessons > 1 ? 's' : ''}` },
              ...(ratingStats?.total > 0 ? [{ icon: Star, value: `${ratingStats.average.toFixed(1)} / 5 (${ratingStats.total} avis)` }] : []),
            ].map(({ icon: Icon, value }) => (
              <span
                key={value}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm",
                  course.cover_image_url
                    ? "bg-white/10 border border-white/15 text-white/80"
                    : "bg-white border border-gray-200 text-gray-600 shadow-sm"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", course.cover_image_url ? "text-brand-cyan" : "text-brand-blue")} />
                {value}
              </span>
            ))}
          </div>
        </div>

        {/* Ligne accent en bas */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-brand-blue via-brand-cyan to-transparent opacity-60" />
      </header>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main className="flex-1 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ── Colonne gauche (8/12) ─────────────────────────── */}
            <div className="lg:col-span-8 space-y-6">

              {/* Description */}
              {course.description && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
                >
                  <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5 text-white" />
                    </span>
                    À propos de ce cours
                  </h2>
                  <div className="prose prose-sm md:prose-base prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-brand-cyan">
                    <ReactMarkdown>{course.description}</ReactMarkdown>
                  </div>
                </motion.section>
              )}

              {/* Programme */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
              >
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5">
                  <div>
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center">
                        <Layers className="h-3.5 w-3.5 text-white" />
                      </span>
                      Contenu du cours
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5 ml-8">
                      {course.sections?.length || 0} section{(course.sections?.length || 0) > 1 ? 's' : ''} · {totalLessons} leçon{totalLessons > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (course.sections?.length) {
                        setExpandedSections(
                          expandedSections.length === course.sections.length
                            ? []
                            : course.sections.map((s: any) => s.id)
                        )
                      }
                    }}
                    className="text-xs font-semibold text-brand-blue hover:text-brand-blue-dark transition-colors"
                  >
                    {expandedSections.length === (course.sections?.length || 0) ? 'Tout réduire' : 'Tout développer'}
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {course.sections && course.sections.length > 0 ? (
                    <>
                      {course.sections.map((section: any, sectionIndex: number) => {
                        const sectionLessons = lessonsBySection[section.id] || []
                        const isExpanded = expandedSections.includes(section.id)
                        const completedInSection = enrollment?.completed_lessons?.filter(
                          (id: string) => sectionLessons.some((l: any) => l.id === id)
                        ).length || 0
                        const allDone = completedInSection === sectionLessons.length && sectionLessons.length > 0

                        return (
                          <div key={section.id}>
                            <button
                              onClick={() => toggleSection(section.id)}
                              className="w-full px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all",
                                  allDone
                                    ? "bg-gradient-to-br from-brand-blue to-brand-cyan text-white"
                                    : "bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 text-brand-blue"
                                )}>
                                  {allDone ? <CheckCircle className="h-3.5 w-3.5" /> : sectionIndex + 1}
                                </span>
                                <div className="text-left">
                                  <h3 className="font-semibold text-gray-900 text-sm">{section.title}</h3>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {sectionLessons.length} leçon{sectionLessons.length > 1 ? 's' : ''}
                                    {enrollment && completedInSection > 0 && (
                                      <span className="text-brand-cyan font-medium ml-1.5">
                                        · {completedInSection} terminée{completedInSection > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform shrink-0", isExpanded && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-6 pb-3 pt-1 space-y-1.5 bg-gray-50/40">
                                    {sectionLessons.map((lesson: any) => {
                                      const isCompleted = enrollment?.completed_lessons?.includes(lesson.id)
                                      return (
                                        <div
                                          key={lesson.id}
                                          className={cn(
                                            "flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all",
                                            isCompleted
                                              ? "bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5 border-brand-cyan/20"
                                              : "bg-white border-gray-100 hover:border-brand-blue/20 hover:shadow-sm"
                                          )}
                                        >
                                          <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                            <div className={cn(
                                              "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
                                              isCompleted
                                                ? "bg-gradient-to-br from-brand-blue to-brand-cyan"
                                                : "bg-gray-100"
                                            )}>
                                              {isCompleted
                                                ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                                                : lesson.lesson_type === 'video'
                                                  ? <Video className="h-3.5 w-3.5 text-gray-400" />
                                                  : <FileText className="h-3.5 w-3.5 text-gray-400" />}
                                            </div>
                                            <div className="min-w-0">
                                              <p className={cn("text-sm font-medium truncate", isCompleted ? "text-brand-blue" : "text-gray-700")}>
                                                {lesson.title}
                                              </p>
                                              {lesson.video_duration_minutes && (
                                                <p className="text-xs text-gray-400">{lesson.video_duration_minutes} min</p>
                                              )}
                                            </div>
                                          </div>
                                          {enrollment ? (
                                            <Link href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}>
                                              <button className={cn(
                                                "text-xs font-semibold px-3 py-1 rounded-full transition-all shrink-0",
                                                isCompleted
                                                  ? "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
                                                  : "bg-gradient-to-r from-brand-blue to-brand-cyan text-white shadow-sm hover:shadow-md"
                                              )}>
                                                {isCompleted ? 'Revoir' : 'Lancer'}
                                              </button>
                                            </Link>
                                          ) : lesson.is_preview ? (
                                            <Link href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}>
                                              <button className="text-xs font-semibold px-3 py-1 rounded-full border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5 transition-colors shrink-0">
                                                Aperçu
                                              </button>
                                            </Link>
                                          ) : (
                                            <LockIcon className="h-4 w-4 text-gray-300 shrink-0" />
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                      {(lessonsBySection['no-section'] || []).length > 0 && (
                        <div className="px-6 pb-3 pt-3 space-y-1.5">
                          {(lessonsBySection['no-section'] || []).map((lesson: any) => {
                            const isCompleted = enrollment?.completed_lessons?.includes(lesson.id)
                            return (
                              <div
                                key={lesson.id}
                                className={cn(
                                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all",
                                  isCompleted
                                    ? "bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5 border-brand-cyan/20"
                                    : "bg-white border-gray-100 hover:border-brand-blue/20 hover:shadow-sm"
                                )}
                              >
                                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                  <div className={cn(
                                    "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
                                    isCompleted ? "bg-gradient-to-br from-brand-blue to-brand-cyan" : "bg-gray-100"
                                  )}>
                                    {isCompleted ? <CheckCircle className="h-3.5 w-3.5 text-white" /> :
                                     lesson.lesson_type === 'video' ? <Video className="h-3.5 w-3.5 text-gray-400" /> : <FileText className="h-3.5 w-3.5 text-gray-400" />}
                                  </div>
                                  <p className={cn("text-sm font-medium truncate", isCompleted ? "text-brand-blue" : "text-gray-700")}>
                                    {lesson.title}
                                  </p>
                                </div>
                                {enrollment ? (
                                  <Link href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}>
                                    <button className={cn(
                                      "text-xs font-semibold px-3 py-1 rounded-full transition-all shrink-0",
                                      isCompleted
                                        ? "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
                                        : "bg-gradient-to-r from-brand-blue to-brand-cyan text-white shadow-sm"
                                    )}>
                                      {isCompleted ? 'Revoir' : 'Lancer'}
                                    </button>
                                  </Link>
                                ) : lesson.is_preview ? (
                                  <Link href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}>
                                    <button className="text-xs font-semibold px-3 py-1 rounded-full border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5 shrink-0">Aperçu</button>
                                  </Link>
                                ) : (
                                  <LockIcon className="h-4 w-4 text-gray-300 shrink-0" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="h-7 w-7 text-brand-blue/40" />
                      </div>
                      <p className="text-gray-400 text-sm">Le contenu de ce cours n'est pas encore disponible.</p>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Avis */}
              {course.reviews && course.reviews.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
                >
                  <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center">
                      <MessageSquare className="h-3.5 w-3.5 text-white" />
                    </span>
                    Avis des étudiants
                    <span className="ml-auto text-xs font-normal text-gray-400">{course.reviews.length} avis</span>
                  </h2>
                  <div className="space-y-3">
                    {course.reviews.slice(0, 5).map((review: any) => (
                      <div key={review.id} className="p-4 bg-gray-50/60 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-xs">
                              {(review.student?.full_name || review.student?.email || 'U')?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-sm text-gray-900">
                              {review.student?.full_name || review.student?.email || 'Utilisateur'}
                            </span>
                          </div>
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("h-3 w-3", i < (review.rating || 0) ? "fill-current" : "text-gray-200")} />
                            ))}
                          </div>
                        </div>
                        {review.review_text && (
                          <p className="text-sm text-gray-600 ml-10 leading-relaxed">{review.review_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>

            {/* ── Sidebar droite (4/12) ─────────────────────────── */}
            <div className="lg:col-span-4 space-y-5">

              {/* Carte inscription / progression */}
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-md sticky top-6"
              >
                {/* Bande décorative */}
                <div className="h-1.5 bg-gradient-to-r from-brand-blue to-brand-cyan" />

                <div className="p-6">
                  {enrollment ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Ma progression</span>
                        <span className="text-lg font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                          {Math.round(enrollment.progress_percentage || 0)}%
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${enrollment.progress_percentage || 0}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full"
                          />
                        </div>
                        <p className="text-xs text-gray-400 text-right">{completedLessons}/{totalLessons} leçons complétées</p>
                      </div>

                      <Link href={`/dashboard/elearning/courses/${slug}/learn`} className="block">
                        <button className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/25 hover:shadow-xl hover:shadow-brand-blue/30 transition-all active:scale-[0.98]">
                          <PlayCircle className="h-4.5 w-4.5" />
                          {(enrollment.progress_percentage || 0) > 0 ? 'Continuer la formation' : 'Commencer'}
                        </button>
                      </Link>

                      {enrollment.enrollment_status === 'completed' && (
                        <button className="w-full py-2.5 rounded-xl border border-brand-blue/20 text-brand-blue font-semibold text-sm flex items-center justify-center gap-2 hover:bg-brand-blue/5 transition-colors">
                          <Award className="h-4 w-4" />
                          Télécharger le certificat
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="text-center py-2">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Accès complet</p>
                        <div className="text-3xl font-bold">
                          {course.price && course.price > 0 ? (
                            <span className="text-gray-900">{course.price.toLocaleString()} <span className="text-lg">{course.currency}</span></span>
                          ) : (
                            <span className="bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">Gratuit</span>
                          )}
                        </div>
                      </div>

                      <button
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/40 transition-all active:scale-[0.98] disabled:opacity-60"
                        onClick={() => enrollMutation.mutate()}
                        disabled={enrollMutation.isPending}
                      >
                        {enrollMutation.isPending ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Inscription...</>
                        ) : (
                          <><Play className="h-4 w-4 fill-current" /> Commencer maintenant</>
                        )}
                      </button>

                      <p className="text-xs text-center text-gray-400">Accès immédiat et illimité</p>
                    </div>
                  )}

                  {/* Infos */}
                  <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                    {[
                      { icon: Award,    label: 'Certification',       value: 'Certificat de complétion' },
                      { icon: Target,   label: 'Niveau',              value: difficultyConfig.label },
                      { icon: Calendar, label: 'Dernière mise à jour', value: course.updated_at ? formatDate(course.updated_at) : formatDate(course.created_at) },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 flex items-center justify-center text-brand-blue shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                          <p className="text-sm text-gray-800 font-medium">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="mt-4 w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Partager ce cours
                  </button>
                </div>
              </motion.div>

              {/* Instructeur */}
              {course.instructor && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
                >
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Instructeur</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-base shrink-0">
                      {(course.instructor.full_name || course.instructor.email)?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{course.instructor.full_name || course.instructor.email}</p>
                      <p className="text-xs text-gray-400">Formateur expert</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
