'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Play, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default function CourseLearnPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)

  // Récupérer le cours
  const { data: course } = useQuery<{ id: string; [key: string]: any } | null>({
    queryKey: ['course', slug, user?.organization_id],
    queryFn: async () => {
      const result = await elearningService.getCourseBySlug(slug, user?.organization_id || '')
      return result as { id: string; [key: string]: any } | null
    },
    enabled: !!slug && !!user?.organization_id,
  })

  // Récupérer l'inscription
  const { data: enrollment } = useQuery({
    queryKey: ['course-enrollment', course?.id, user?.id],
    queryFn: async () => {
      if (!course?.id || !user?.id) return null
      const enrollments = await elearningService.getStudentEnrollments(user.id)
      return enrollments.find((e: any) => e.course_id === course.id)
    },
    enabled: !!course?.id && !!user?.id,
  })

  // Récupérer la progression des leçons
  const { data: lessonsProgress } = useQuery({
    queryKey: ['lessons-progress', course?.id, user?.id],
    queryFn: async () => {
      if (!course?.lessons || !user?.id) return {}
      const progressMap: Record<string, any> = {}
      for (const lesson of course.lessons) {
        const progress = await elearningService.getLessonProgress(lesson.id, user.id)
        if (progress) {
          progressMap[lesson.id] = progress
        }
      }
      return progressMap
    },
    enabled: !!course?.lessons && course.lessons.length > 0 && !!user?.id,
  })

  // Marquer une leçon comme complétée
  const markCompletedMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user?.id) throw new Error('Non authentifié')
      return elearningService.markLessonAsCompleted(lessonId, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-progress'] })
      queryClient.invalidateQueries({ queryKey: ['course-enrollment'] })
    },
  })

  // Mettre à jour la progression
  const updateProgressMutation = useMutation({
    mutationFn: async ({ lessonId, percentage }: { lessonId: string; percentage: number }) => {
      if (!user?.id) throw new Error('Non authentifié')
      return elearningService.updateLessonProgress(lessonId, user.id, {
        completion_percentage: percentage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-progress'] })
    },
  })

  // Rediriger vers la première leçon si aucune n'est sélectionnée
  useEffect(() => {
    if (course?.lessons && course.lessons.length > 0 && !(enrollment as any)?.last_accessed_lesson_id) {
      const firstLesson = course.lessons[0]
      router.push(`/dashboard/elearning/courses/${slug}/lessons/${firstLesson.slug}`)
    } else if ((enrollment as any)?.last_accessed_lesson_id) {
      const lessonIndex = course?.lessons?.findIndex(
        (l: any) => l.id === (enrollment as any).last_accessed_lesson_id
      )
      if (lessonIndex !== undefined && lessonIndex >= 0) {
        setCurrentLessonIndex(lessonIndex)
      }
    }
  }, [course, enrollment, slug, router])

  if (!course || !enrollment) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  const lessons = course.lessons || []
  const currentLesson = lessons[currentLessonIndex]
  const isLessonCompleted = (lessonId: string) => {
    return lessonsProgress?.[lessonId]?.is_completed || false
  }

  const handleNextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      const nextLesson = lessons[currentLessonIndex + 1]
      router.push(`/dashboard/elearning/courses/${slug}/lessons/${nextLesson.slug}`)
    }
  }

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      const previousLesson = lessons[currentLessonIndex - 1]
      router.push(`/dashboard/elearning/courses/${slug}/lessons/${previousLesson.slug}`)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href={`/dashboard/elearning/courses/${slug}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Retour au cours
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>Progression: {Math.round((enrollment as any)?.progress_percentage || 0)}%</span>
          <span>
            {(enrollment as any)?.completed_lessons?.length || 0} / {lessons.length} leçons complétées
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-3">
          {currentLesson ? (
            <Card>
              <CardHeader>
                <CardTitle>{currentLesson.title}</CardTitle>
                {currentLesson.description && (
                  <p className="text-sm text-muted-foreground">{currentLesson.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {currentLesson.video_url && (
                  <div className="mb-6">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={currentLesson.video_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {currentLesson.content && (
                  <div className="prose prose-sm max-w-none mb-6">
                    <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviousLesson}
                    disabled={currentLessonIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Leçon précédente
                  </Button>
                  <Button
                    onClick={() => {
                      if (!isLessonCompleted(currentLesson.id)) {
                        markCompletedMutation.mutate(currentLesson.id)
                      }
                      handleNextLesson()
                    }}
                    disabled={currentLessonIndex === lessons.length - 1}
                  >
                    {isLessonCompleted(currentLesson.id) ? 'Leçon suivante' : 'Marquer comme complété'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune leçon disponible
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Leçons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lessons.map((lesson: any, index: number) => {
                  const isCompleted = isLessonCompleted(lesson.id)
                  const isCurrent = index === currentLessonIndex

                  return (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}
                    >
                      <button
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-primary text-white'
                            : isCompleted
                            ? 'bg-green-50 text-green-800 hover:bg-green-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium">
                            {index + 1}. {lesson.title}
                          </span>
                        </div>
                        {lesson.video_duration_minutes && (
                          <p className="text-xs mt-1 opacity-70">
                            {lesson.video_duration_minutes} min
                          </p>
                        )}
                      </button>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}



function CourseLearnPage_DUPLICATE_1() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)

  // Récupérer le cours
  const { data: course } = useQuery<{ id: string; [key: string]: any } | null>({
    queryKey: ['course', slug, user?.organization_id],
    queryFn: async () => {
      const result = await elearningService.getCourseBySlug(slug, user?.organization_id || '')
      return result as { id: string; [key: string]: any } | null
    },
    enabled: !!slug && !!user?.organization_id,
  })

  // Récupérer l'inscription
  const { data: enrollment } = useQuery({
    queryKey: ['course-enrollment', course?.id, user?.id],
    queryFn: async () => {
      if (!course?.id || !user?.id) return null
      const enrollments = await elearningService.getStudentEnrollments(user.id)
      return enrollments.find((e: any) => e.course_id === course.id)
    },
    enabled: !!course?.id && !!user?.id,
  })

  // Récupérer la progression des leçons
  const { data: lessonsProgress } = useQuery({
    queryKey: ['lessons-progress', course?.id, user?.id],
    queryFn: async () => {
      if (!course?.lessons || !user?.id) return {}
      const progressMap: Record<string, any> = {}
      for (const lesson of course.lessons) {
        const progress = await elearningService.getLessonProgress(lesson.id, user.id)
        if (progress) {
          progressMap[lesson.id] = progress
        }
      }
      return progressMap
    },
    enabled: !!course?.lessons && course.lessons.length > 0 && !!user?.id,
  })

  // Marquer une leçon comme complétée
  const markCompletedMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user?.id) throw new Error('Non authentifié')
      return elearningService.markLessonAsCompleted(lessonId, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-progress'] })
      queryClient.invalidateQueries({ queryKey: ['course-enrollment'] })
    },
  })

  // Mettre à jour la progression
  const updateProgressMutation = useMutation({
    mutationFn: async ({ lessonId, percentage }: { lessonId: string; percentage: number }) => {
      if (!user?.id) throw new Error('Non authentifié')
      return elearningService.updateLessonProgress(lessonId, user.id, {
        completion_percentage: percentage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-progress'] })
    },
  })

  // Rediriger vers la première leçon si aucune n'est sélectionnée
  useEffect(() => {
    if (course?.lessons && course.lessons.length > 0 && !(enrollment as any)?.last_accessed_lesson_id) {
      const firstLesson = course.lessons[0]
      router.push(`/dashboard/elearning/courses/${slug}/lessons/${firstLesson.slug}`)
    } else if ((enrollment as any)?.last_accessed_lesson_id) {
      const lessonIndex = course?.lessons?.findIndex(
        (l: any) => l.id === (enrollment as any).last_accessed_lesson_id
      )
      if (lessonIndex !== undefined && lessonIndex >= 0) {
        setCurrentLessonIndex(lessonIndex)
      }
    }
  }, [course, enrollment, slug, router])

  if (!course || !enrollment) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  const lessons = course.lessons || []
  const currentLesson = lessons[currentLessonIndex]
  const isLessonCompleted = (lessonId: string) => {
    return lessonsProgress?.[lessonId]?.is_completed || false
  }

  const handleNextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      const nextLesson = lessons[currentLessonIndex + 1]
      router.push(`/dashboard/elearning/courses/${slug}/lessons/${nextLesson.slug}`)
    }
  }

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      const previousLesson = lessons[currentLessonIndex - 1]
      router.push(`/dashboard/elearning/courses/${slug}/lessons/${previousLesson.slug}`)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href={`/dashboard/elearning/courses/${slug}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Retour au cours
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>Progression: {Math.round((enrollment as any)?.progress_percentage || 0)}%</span>
          <span>
            {(enrollment as any)?.completed_lessons?.length || 0} / {lessons.length} leçons complétées
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-3">
          {currentLesson ? (
            <Card>
              <CardHeader>
                <CardTitle>{currentLesson.title}</CardTitle>
                {currentLesson.description && (
                  <p className="text-sm text-muted-foreground">{currentLesson.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {currentLesson.video_url && (
                  <div className="mb-6">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={currentLesson.video_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {currentLesson.content && (
                  <div className="prose prose-sm max-w-none mb-6">
                    <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviousLesson}
                    disabled={currentLessonIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Leçon précédente
                  </Button>
                  <Button
                    onClick={() => {
                      if (!isLessonCompleted(currentLesson.id)) {
                        markCompletedMutation.mutate(currentLesson.id)
                      }
                      handleNextLesson()
                    }}
                    disabled={currentLessonIndex === lessons.length - 1}
                  >
                    {isLessonCompleted(currentLesson.id) ? 'Leçon suivante' : 'Marquer comme complété'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune leçon disponible
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Leçons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lessons.map((lesson: any, index: number) => {
                  const isCompleted = isLessonCompleted(lesson.id)
                  const isCurrent = index === currentLessonIndex

                  return (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}
                    >
                      <button
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-primary text-white'
                            : isCompleted
                            ? 'bg-green-50 text-green-800 hover:bg-green-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium">
                            {index + 1}. {lesson.title}
                          </span>
                        </div>
                        {lesson.video_duration_minutes && (
                          <p className="text-xs mt-1 opacity-70">
                            {lesson.video_duration_minutes} min
                          </p>
                        )}
                      </button>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}



function CourseLearnPage_DUPLICATE_2() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)

  // Récupérer le cours
  const { data: course } = useQuery<{ id: string; [key: string]: any } | null>({
    queryKey: ['course', slug, user?.organization_id],
    queryFn: async () => {
      const result = await elearningService.getCourseBySlug(slug, user?.organization_id || '')
      return result as { id: string; [key: string]: any } | null
    },
    enabled: !!slug && !!user?.organization_id,
  })

  // Récupérer l'inscription
  const { data: enrollment } = useQuery({
    queryKey: ['course-enrollment', course?.id, user?.id],
    queryFn: async () => {
      if (!course?.id || !user?.id) return null
      const enrollments = await elearningService.getStudentEnrollments(user.id)
      return enrollments.find((e: any) => e.course_id === course.id)
    },
    enabled: !!course?.id && !!user?.id,
  })

  // Récupérer la progression des leçons
  const { data: lessonsProgress } = useQuery({
    queryKey: ['lessons-progress', course?.id, user?.id],
    queryFn: async () => {
      if (!course?.lessons || !user?.id) return {}
      const progressMap: Record<string, any> = {}
      for (const lesson of course.lessons) {
        const progress = await elearningService.getLessonProgress(lesson.id, user.id)
        if (progress) {
          progressMap[lesson.id] = progress
        }
      }
      return progressMap
    },
    enabled: !!course?.lessons && course.lessons.length > 0 && !!user?.id,
  })

  // Marquer une leçon comme complétée
  const markCompletedMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user?.id) throw new Error('Non authentifié')
      return elearningService.markLessonAsCompleted(lessonId, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-progress'] })
      queryClient.invalidateQueries({ queryKey: ['course-enrollment'] })
    },
  })

  // Mettre à jour la progression
  const updateProgressMutation = useMutation({
    mutationFn: async ({ lessonId, percentage }: { lessonId: string; percentage: number }) => {
      if (!user?.id) throw new Error('Non authentifié')
      return elearningService.updateLessonProgress(lessonId, user.id, {
        completion_percentage: percentage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons-progress'] })
    },
  })

  // Rediriger vers la première leçon si aucune n'est sélectionnée
  useEffect(() => {
    if (course?.lessons && course.lessons.length > 0 && !(enrollment as any)?.last_accessed_lesson_id) {
      const firstLesson = course.lessons[0]
      router.push(`/dashboard/elearning/courses/${slug}/lessons/${firstLesson.slug}`)
    } else if ((enrollment as any)?.last_accessed_lesson_id) {
      const lessonIndex = course?.lessons?.findIndex(
        (l: any) => l.id === (enrollment as any).last_accessed_lesson_id
      )
      if (lessonIndex !== undefined && lessonIndex >= 0) {
        setCurrentLessonIndex(lessonIndex)
      }
    }
  }, [course, enrollment, slug, router])

  if (!course || !enrollment) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  const lessons = course.lessons || []
  const currentLesson = lessons[currentLessonIndex]
  const isLessonCompleted = (lessonId: string) => {
    return lessonsProgress?.[lessonId]?.is_completed || false
  }

  const handleNextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      const nextLesson = lessons[currentLessonIndex + 1]
      router.push(`/dashboard/elearning/courses/${slug}/lessons/${nextLesson.slug}`)
    }
  }

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      const previousLesson = lessons[currentLessonIndex - 1]
      router.push(`/dashboard/elearning/courses/${slug}/lessons/${previousLesson.slug}`)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href={`/dashboard/elearning/courses/${slug}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Retour au cours
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>Progression: {Math.round((enrollment as any)?.progress_percentage || 0)}%</span>
          <span>
            {(enrollment as any)?.completed_lessons?.length || 0} / {lessons.length} leçons complétées
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-3">
          {currentLesson ? (
            <Card>
              <CardHeader>
                <CardTitle>{currentLesson.title}</CardTitle>
                {currentLesson.description && (
                  <p className="text-sm text-muted-foreground">{currentLesson.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {currentLesson.video_url && (
                  <div className="mb-6">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={currentLesson.video_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {currentLesson.content && (
                  <div className="prose prose-sm max-w-none mb-6">
                    <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviousLesson}
                    disabled={currentLessonIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Leçon précédente
                  </Button>
                  <Button
                    onClick={() => {
                      if (!isLessonCompleted(currentLesson.id)) {
                        markCompletedMutation.mutate(currentLesson.id)
                      }
                      handleNextLesson()
                    }}
                    disabled={currentLessonIndex === lessons.length - 1}
                  >
                    {isLessonCompleted(currentLesson.id) ? 'Leçon suivante' : 'Marquer comme complété'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucune leçon disponible
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Leçons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lessons.map((lesson: any, index: number) => {
                  const isCompleted = isLessonCompleted(lesson.id)
                  const isCurrent = index === currentLessonIndex

                  return (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/elearning/courses/${slug}/lessons/${lesson.slug}`}
                    >
                      <button
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-primary text-white'
                            : isCompleted
                            ? 'bg-green-50 text-green-800 hover:bg-green-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium">
                            {index + 1}. {lesson.title}
                          </span>
                        </div>
                        {lesson.video_duration_minutes && (
                          <p className="text-xs mt-1 opacity-70">
                            {lesson.video_duration_minutes} min
                          </p>
                        )}
                      </button>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


