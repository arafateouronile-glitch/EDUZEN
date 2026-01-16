'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Play, CheckCircle, Circle, Star, Users, Clock, BookOpen, Award, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Récupérer le cours
  const { data: course } = useQuery<{ id: string; [key: string]: any } | null>({
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Débutant'
      case 'intermediate':
        return 'Intermédiaire'
      case 'advanced':
        return 'Avancé'
      default:
        return difficulty
    }
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">Chargement...</div>
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href="/dashboard/elearning">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux cours
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-2">
          {/* En-tête du cours */}
          <Card className="mb-6">
            {course.cover_image_url && (
              <div className="h-64 w-full overflow-hidden rounded-t-lg">
                <img
                  src={course.cover_image_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
                  {course.description && (
                    <p className="text-muted-foreground mb-4">{course.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span
                      className={`px-2 py-1 rounded ${getDifficultyColor(course.difficulty_level)}`}
                    >
                      {getDifficultyLabel(course.difficulty_level)}
                    </span>
                    {course.estimated_duration_hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.estimated_duration_hours} heures</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.total_students || 0} étudiants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.total_lessons || 0} leçons</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {course.description && <ReactMarkdown>{course.description}</ReactMarkdown>}
              </div>
            </CardContent>
          </Card>

          {/* Contenu du cours */}
          <Card>
            <CardHeader>
              <CardTitle>Contenu du cours</CardTitle>
            </CardHeader>
            <CardContent>
              {course.sections && course.sections.length > 0 ? (
                <div className="space-y-6">
                  {course.sections.map((section: any) => {
                    const sectionLessons = lessonsBySection[section.id] || []
                    return (
                      <div key={section.id}>
                        <h3 className="font-semibold text-lg mb-3">{section.title}</h3>
                        {section.description && (
                          <p className="text-sm text-muted-foreground mb-3">{section.description}</p>
                        )}
                        <div className="space-y-2">
                          {sectionLessons.map((lesson: any) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {lesson.lesson_type === 'video' ? (
                                  <Play className="h-5 w-5 text-primary" />
                                ) : (
                                  <BookOpen className="h-5 w-5 text-primary" />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium">{lesson.title}</h4>
                                  {lesson.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {lesson.description}
                                    </p>
                                  )}
                                  {lesson.video_duration_minutes && (
                                    <span className="text-xs text-muted-foreground">
                                      {lesson.video_duration_minutes} min
                                    </span>
                                  )}
                                </div>
                              </div>
                              {lesson.is_preview && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                  Aperçu
                                </span>
                              )}
                              {enrollment && (
                                <Link
                                  href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}
                                >
                                  <Button size="sm" variant="outline">
                                    {enrollment.completed_lessons?.includes(parseInt(lesson.id)) ? (
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    ) : (
                                      <Play className="h-4 w-4 mr-2" />
                                    )}
                                    {enrollment.completed_lessons?.includes(parseInt(lesson.id))
                                      ? 'Revoir'
                                      : 'Commencer'}
                                  </Button>
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : course.lessons && course.lessons.length > 0 ? (
                <div className="space-y-2">
                  {course.lessons.map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {lesson.lesson_type === 'video' ? (
                          <Play className="h-5 w-5 text-primary" />
                        ) : (
                          <BookOpen className="h-5 w-5 text-primary" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{lesson.title}</h4>
                          {lesson.video_duration_minutes && (
                            <span className="text-xs text-muted-foreground">
                              {lesson.video_duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      {enrollment && (
                        <Link
                          href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}
                        >
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4 mr-2" />
                            Commencer
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune leçon disponible
                </div>
              )}
            </CardContent>
          </Card>

          {/* Avis */}
          {course.reviews && course.reviews.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Avis des étudiants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.reviews.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (review.rating || 0)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">
                          {review.student?.full_name || review.student?.email || 'Utilisateur'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      {review.review_text && (
                        <p className="text-sm text-muted-foreground">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollment ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progression</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(enrollment.progress_percentage || 0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                  <Link href={`/dashboard/elearning/courses/${slug}/learn`}>
                    <Button className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Continuer le cours
                    </Button>
                  </Link>
                  {enrollment.enrollment_status === 'completed' && (
                    <Button variant="outline" className="w-full">
                      <Award className="h-4 w-4 mr-2" />
                      Télécharger le certificat
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? 'Inscription...' : 'S\'inscrire au cours'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Informations */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {course.instructor && (
                <div>
                  <span className="text-muted-foreground">Instructeur:</span>
                  <p className="font-medium">
                    {course.instructor.full_name || course.instructor.email}
                  </p>
                </div>
              )}
              {course.published_at && (
                <div>
                  <span className="text-muted-foreground">Publié le:</span>
                  <p className="font-medium">{formatDate(course.published_at)}</p>
                </div>
              )}
              {ratingStats && ratingStats.total > 0 && (
                <div>
                  <span className="text-muted-foreground">Note moyenne:</span>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{ratingStats.average.toFixed(1)} / 5</span>
                    <span className="text-muted-foreground">({ratingStats.total} avis)</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}



function CourseDetailPage_DUPLICATE_1() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Récupérer le cours
  const { data: course } = useQuery<{ id: string; [key: string]: any } | null>({
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Débutant'
      case 'intermediate':
        return 'Intermédiaire'
      case 'advanced':
        return 'Avancé'
      default:
        return difficulty
    }
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">Chargement...</div>
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href="/dashboard/elearning">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux cours
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-2">
          {/* En-tête du cours */}
          <Card className="mb-6">
            {course.cover_image_url && (
              <div className="h-64 w-full overflow-hidden rounded-t-lg">
                <img
                  src={course.cover_image_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
                  {course.description && (
                    <p className="text-muted-foreground mb-4">{course.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span
                      className={`px-2 py-1 rounded ${getDifficultyColor(course.difficulty_level)}`}
                    >
                      {getDifficultyLabel(course.difficulty_level)}
                    </span>
                    {course.estimated_duration_hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.estimated_duration_hours} heures</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.total_students || 0} étudiants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.total_lessons || 0} leçons</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {course.description && <ReactMarkdown>{course.description}</ReactMarkdown>}
              </div>
            </CardContent>
          </Card>

          {/* Contenu du cours */}
          <Card>
            <CardHeader>
              <CardTitle>Contenu du cours</CardTitle>
            </CardHeader>
            <CardContent>
              {course.sections && course.sections.length > 0 ? (
                <div className="space-y-6">
                  {course.sections.map((section: any) => {
                    const sectionLessons = lessonsBySection[section.id] || []
                    return (
                      <div key={section.id}>
                        <h3 className="font-semibold text-lg mb-3">{section.title}</h3>
                        {section.description && (
                          <p className="text-sm text-muted-foreground mb-3">{section.description}</p>
                        )}
                        <div className="space-y-2">
                          {sectionLessons.map((lesson: any) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {lesson.lesson_type === 'video' ? (
                                  <Play className="h-5 w-5 text-primary" />
                                ) : (
                                  <BookOpen className="h-5 w-5 text-primary" />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium">{lesson.title}</h4>
                                  {lesson.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {lesson.description}
                                    </p>
                                  )}
                                  {lesson.video_duration_minutes && (
                                    <span className="text-xs text-muted-foreground">
                                      {lesson.video_duration_minutes} min
                                    </span>
                                  )}
                                </div>
                              </div>
                              {lesson.is_preview && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                  Aperçu
                                </span>
                              )}
                              {enrollment && (
                                <Link
                                  href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}
                                >
                                  <Button size="sm" variant="outline">
                                    {enrollment.completed_lessons?.includes(parseInt(lesson.id)) ? (
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    ) : (
                                      <Play className="h-4 w-4 mr-2" />
                                    )}
                                    {enrollment.completed_lessons?.includes(parseInt(lesson.id))
                                      ? 'Revoir'
                                      : 'Commencer'}
                                  </Button>
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : course.lessons && course.lessons.length > 0 ? (
                <div className="space-y-2">
                  {course.lessons.map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {lesson.lesson_type === 'video' ? (
                          <Play className="h-5 w-5 text-primary" />
                        ) : (
                          <BookOpen className="h-5 w-5 text-primary" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{lesson.title}</h4>
                          {lesson.video_duration_minutes && (
                            <span className="text-xs text-muted-foreground">
                              {lesson.video_duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      {enrollment && (
                        <Link
                          href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}
                        >
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4 mr-2" />
                            Commencer
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune leçon disponible
                </div>
              )}
            </CardContent>
          </Card>

          {/* Avis */}
          {course.reviews && course.reviews.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Avis des étudiants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.reviews.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (review.rating || 0)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">
                          {review.student?.full_name || review.student?.email || 'Utilisateur'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      {review.review_text && (
                        <p className="text-sm text-muted-foreground">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollment ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progression</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(enrollment.progress_percentage || 0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                  <Link href={`/dashboard/elearning/courses/${slug}/learn`}>
                    <Button className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Continuer le cours
                    </Button>
                  </Link>
                  {enrollment.enrollment_status === 'completed' && (
                    <Button variant="outline" className="w-full">
                      <Award className="h-4 w-4 mr-2" />
                      Télécharger le certificat
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? 'Inscription...' : 'S\'inscrire au cours'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Informations */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {course.instructor && (
                <div>
                  <span className="text-muted-foreground">Instructeur:</span>
                  <p className="font-medium">
                    {course.instructor.full_name || course.instructor.email}
                  </p>
                </div>
              )}
              {course.published_at && (
                <div>
                  <span className="text-muted-foreground">Publié le:</span>
                  <p className="font-medium">{formatDate(course.published_at)}</p>
                </div>
              )}
              {ratingStats && ratingStats.total > 0 && (
                <div>
                  <span className="text-muted-foreground">Note moyenne:</span>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{ratingStats.average.toFixed(1)} / 5</span>
                    <span className="text-muted-foreground">({ratingStats.total} avis)</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}



function CourseDetailPage_DUPLICATE_2() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Récupérer le cours
  const { data: course } = useQuery<{ id: string; [key: string]: any } | null>({
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Débutant'
      case 'intermediate':
        return 'Intermédiaire'
      case 'advanced':
        return 'Avancé'
      default:
        return difficulty
    }
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">Chargement...</div>
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href="/dashboard/elearning">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux cours
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-2">
          {/* En-tête du cours */}
          <Card className="mb-6">
            {course.cover_image_url && (
              <div className="h-64 w-full overflow-hidden rounded-t-lg">
                <img
                  src={course.cover_image_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
                  {course.description && (
                    <p className="text-muted-foreground mb-4">{course.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span
                      className={`px-2 py-1 rounded ${getDifficultyColor(course.difficulty_level)}`}
                    >
                      {getDifficultyLabel(course.difficulty_level)}
                    </span>
                    {course.estimated_duration_hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.estimated_duration_hours} heures</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.total_students || 0} étudiants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.total_lessons || 0} leçons</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {course.description && <ReactMarkdown>{course.description}</ReactMarkdown>}
              </div>
            </CardContent>
          </Card>

          {/* Contenu du cours */}
          <Card>
            <CardHeader>
              <CardTitle>Contenu du cours</CardTitle>
            </CardHeader>
            <CardContent>
              {course.sections && course.sections.length > 0 ? (
                <div className="space-y-6">
                  {course.sections.map((section: any) => {
                    const sectionLessons = lessonsBySection[section.id] || []
                    return (
                      <div key={section.id}>
                        <h3 className="font-semibold text-lg mb-3">{section.title}</h3>
                        {section.description && (
                          <p className="text-sm text-muted-foreground mb-3">{section.description}</p>
                        )}
                        <div className="space-y-2">
                          {sectionLessons.map((lesson: any) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {lesson.lesson_type === 'video' ? (
                                  <Play className="h-5 w-5 text-primary" />
                                ) : (
                                  <BookOpen className="h-5 w-5 text-primary" />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium">{lesson.title}</h4>
                                  {lesson.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {lesson.description}
                                    </p>
                                  )}
                                  {lesson.video_duration_minutes && (
                                    <span className="text-xs text-muted-foreground">
                                      {lesson.video_duration_minutes} min
                                    </span>
                                  )}
                                </div>
                              </div>
                              {lesson.is_preview && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                  Aperçu
                                </span>
                              )}
                              {enrollment && (
                                <Link
                                  href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}
                                >
                                  <Button size="sm" variant="outline">
                                    {enrollment.completed_lessons?.includes(parseInt(lesson.id)) ? (
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    ) : (
                                      <Play className="h-4 w-4 mr-2" />
                                    )}
                                    {enrollment.completed_lessons?.includes(parseInt(lesson.id))
                                      ? 'Revoir'
                                      : 'Commencer'}
                                  </Button>
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : course.lessons && course.lessons.length > 0 ? (
                <div className="space-y-2">
                  {course.lessons.map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {lesson.lesson_type === 'video' ? (
                          <Play className="h-5 w-5 text-primary" />
                        ) : (
                          <BookOpen className="h-5 w-5 text-primary" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{lesson.title}</h4>
                          {lesson.video_duration_minutes && (
                            <span className="text-xs text-muted-foreground">
                              {lesson.video_duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      {enrollment && (
                        <Link
                          href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}
                        >
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4 mr-2" />
                            Commencer
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune leçon disponible
                </div>
              )}
            </CardContent>
          </Card>

          {/* Avis */}
          {course.reviews && course.reviews.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Avis des étudiants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.reviews.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= (review.rating || 0)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">
                          {review.student?.full_name || review.student?.email || 'Utilisateur'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      {review.review_text && (
                        <p className="text-sm text-muted-foreground">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollment ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progression</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(enrollment.progress_percentage || 0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                  <Link href={`/dashboard/elearning/courses/${slug}/learn`}>
                    <Button className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Continuer le cours
                    </Button>
                  </Link>
                  {enrollment.enrollment_status === 'completed' && (
                    <Button variant="outline" className="w-full">
                      <Award className="h-4 w-4 mr-2" />
                      Télécharger le certificat
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? 'Inscription...' : 'S\'inscrire au cours'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Informations */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {course.instructor && (
                <div>
                  <span className="text-muted-foreground">Instructeur:</span>
                  <p className="font-medium">
                    {course.instructor.full_name || course.instructor.email}
                  </p>
                </div>
              )}
              {course.published_at && (
                <div>
                  <span className="text-muted-foreground">Publié le:</span>
                  <p className="font-medium">{formatDate(course.published_at)}</p>
                </div>
              )}
              {ratingStats && ratingStats.total > 0 && (
                <div>
                  <span className="text-muted-foreground">Note moyenne:</span>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{ratingStats.average.toFixed(1)} / 5</span>
                    <span className="text-muted-foreground">({ratingStats.total} avis)</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


