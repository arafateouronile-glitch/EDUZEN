'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service'
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement du cours...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cours introuvable</h2>
          <p className="text-gray-500 mb-6">Ce cours n'existe pas ou a été supprimé.</p>
          <Link href="/dashboard/elearning">
            <Button className="bg-brand-blue hover:bg-brand-blue-dark text-white">
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
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Header Simple */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4">
            <Link href="/dashboard/elearning" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Retour au catalogue
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", difficultyConfig.color)}>
                    <DifficultyIcon className="h-3 w-3" />
                    {difficultyConfig.label}
                  </span>
                  {course.is_featured && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Sparkles className="h-3 w-3" />
                      Populaire
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{course.title}</h1>
                {course.short_description && (
                  <p className="text-gray-500 text-lg leading-relaxed">{course.short_description}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 pt-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{course.total_students || 0} étudiant{(course.total_students || 0) > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{course.estimated_duration_hours || 0}h de contenu</span>
                  </div>
                  {ratingStats && ratingStats.total > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-400">
                        <Star className="h-4 w-4 fill-current" />
                      </div>
                      <span className="font-medium text-gray-900">{ratingStats.average.toFixed(1)}</span>
                      <span className="text-gray-400">({ratingStats.total} avis)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit button for instructors */}
              <div className="flex-shrink-0">
                <Link href={`/dashboard/elearning/courses/${slug}/edit`}>
                  <Button variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Éditer le cours
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Colonne Gauche : Contenu (8/12) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Image Cover (si présente) */}
            {course.cover_image_url && (
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm">
                <img
                  src={course.cover_image_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Description détaillée */}
            {course.description && (
              <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  À propos de ce cours
                </h2>
                <div className="prose prose-sm md:prose-base prose-gray max-w-none">
                  <ReactMarkdown>{course.description}</ReactMarkdown>
                </div>
              </section>
            )}

            {/* Programme du cours */}
            <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-gray-400" />
                    Contenu du cours
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {course.sections?.length || 0} sections • {totalLessons} leçons
                  </p>
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
                  className="text-brand-blue hover:text-brand-blue-dark hover:bg-brand-blue/5"
                >
                  {expandedSections.length === (course.sections?.length || 0) ? 'Tout réduire' : 'Tout développer'}
                </Button>
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
                      <div key={section.id} className="group/section">
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 text-gray-500 font-medium text-sm flex items-center justify-center group-hover/section:bg-white group-hover/section:border group-hover/section:border-gray-200 transition-all">
                              {sectionIndex + 1}
                            </span>
                            <div className="text-left">
                              <h3 className="font-semibold text-gray-900 text-sm md:text-base">{section.title}</h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {sectionLessons.length} leçon{sectionLessons.length > 1 ? 's' : ''}
                                {enrollment && completedInSection > 0 && (
                                  <span className="text-emerald-600 font-medium ml-2">
                                    • {completedInSection} terminée{completedInSection > 1 ? 's' : ''}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <ChevronDown className={cn("h-5 w-5 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden bg-gray-50/30"
                            >
                              <div className="px-6 pb-4 pt-1 space-y-2">
                                {sectionLessons.map((lesson: any) => {
                                  const isCompleted = enrollment?.completed_lessons?.includes(lesson.id)
                                  return (
                                    <div
                                      key={lesson.id}
                                      className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border transition-all",
                                        isCompleted
                                          ? "bg-emerald-50/50 border-emerald-100"
                                          : "bg-white border-gray-200 hover:border-brand-blue/30 hover:shadow-sm"
                                      )}
                                    >
                                      <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={cn(
                                          "flex-shrink-0 p-1.5 rounded-md",
                                          isCompleted ? "text-emerald-600 bg-emerald-100" : "text-gray-400 bg-gray-100"
                                        )}>
                                          {isCompleted ? <CheckCircle className="h-4 w-4" /> : 
                                           lesson.lesson_type === 'video' ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                          <p className={cn("text-sm font-medium truncate", isCompleted ? "text-emerald-900" : "text-gray-700")}>
                                            {lesson.title}
                                          </p>
                                          {lesson.video_duration_minutes && (
                                            <p className="text-xs text-gray-400">{lesson.video_duration_minutes} min</p>
                                          )}
                                        </div>
                                      </div>

                                      {enrollment ? (
                                        <Link href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}>
                                          <Button size="sm" variant="ghost" className="h-8 text-xs">
                                            {isCompleted ? 'Revoir' : 'Lancer'}
                                          </Button>
                                        </Link>
                                      ) : lesson.is_preview ? (
                                        <Link href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}>
                                          <Button size="sm" variant="outline" className="h-8 text-xs border-brand-blue/30 text-brand-blue">
                                            Aperçu
                                          </Button>
                                        </Link>
                                      ) : (
                                        <LockIcon className="h-4 w-4 text-gray-300" />
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
                  })
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p>Le contenu de ce cours n'est pas encore disponible.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Avis */}
            {course.reviews && course.reviews.length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                    Avis des étudiants
                  </h2>
                  <div className="text-sm text-gray-500">
                    {course.reviews.length} avis
                  </div>
                </div>
                <div className="space-y-4">
                  {course.reviews.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-xs">
                            {(review.student?.full_name || review.student?.email || 'U')?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm text-gray-900">
                            {review.student?.full_name || review.student?.email || 'Utilisateur'}
                          </span>
                        </div>
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("h-3 w-3", i < (review.rating || 0) ? "fill-current" : "text-gray-300")} />
                          ))}
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="text-sm text-gray-600 pl-10">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Colonne Droite : Sidebar (4/12) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Carte d'inscription / Progression */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-6">
              {enrollment ? (
                <div className="space-y-6">
                  <div className="text-center pb-4 border-b border-gray-100">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-100">
                      <CheckCircle className="h-4 w-4" />
                      Inscrit
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">Progression</span>
                      <span className="text-gray-900 font-bold">{Math.round(enrollment.progress_percentage || 0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-blue rounded-full transition-all duration-500" 
                        style={{ width: `${enrollment.progress_percentage || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-right">{completedLessons}/{totalLessons} leçons</p>
                  </div>

                  <Link href={`/dashboard/elearning/courses/${slug}/learn`} className="block">
                    <Button className="w-full bg-brand-blue hover:bg-brand-blue-dark text-white font-medium py-6 text-base shadow-sm">
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Continuer la formation
                    </Button>
                  </Link>

                  {enrollment.enrollment_status === 'completed' && (
                    <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                      <Award className="h-4 w-4 mr-2" />
                      Télécharger le certificat
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-3xl font-bold text-gray-900 text-center">
                    {course.price && course.price > 0 ? (
                      <span>{course.price.toLocaleString()} {course.currency}</span>
                    ) : (
                      <span className="text-brand-blue">Gratuit</span>
                    )}
                  </div>

                  <Button 
                    className="w-full bg-brand-blue hover:bg-brand-blue-dark text-white font-medium py-6 text-base shadow-sm"
                    onClick={() => enrollMutation.mutate()}
                    disabled={enrollMutation.isPending}
                  >
                    {enrollMutation.isPending ? 'Inscription...' : 'Commencer maintenant'}
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Accès immédiat et illimité à vie
                  </p>
                </div>
              )}

              {/* Infos Sidebar */}
              <div className="mt-8 space-y-4 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Certification</p>
                    <p className="text-sm text-gray-900">Certificat de complétion</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Niveau</p>
                    <p className="text-sm text-gray-900">{difficultyConfig.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Dernière mise à jour</p>
                    <p className="text-sm text-gray-900">{course.updated_at ? formatDate(course.updated_at) : formatDate(course.created_at)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <Button variant="outline" className="w-full text-gray-600 border-gray-200 hover:bg-gray-50">
                  <Share2 className="h-4 w-4 mr-2" />
                  Partager ce cours
                </Button>
              </div>
            </div>

            {/* Instructeur Card */}
            {course.instructor && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Instructeur</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-lg">
                    {(course.instructor.full_name || course.instructor.email)?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{course.instructor.full_name || course.instructor.email}</p>
                    <p className="text-xs text-gray-500">Formateur expert</p>
                  </div>
                </div>
              </div>
            )}
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
