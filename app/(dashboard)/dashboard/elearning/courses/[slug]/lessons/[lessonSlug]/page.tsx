'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { elearningService } from '@/lib/services/elearning.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  ChevronRight,
  ChevronLeft,
  Play,
  BookOpen,
  Type,
  Image as ImageIcon,
  Video,
  HelpCircle,
  BarChart3,
  Edit,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

// Types de blocs de contenu
type ContentBlockType = 'text' | 'media' | 'quiz' | 'poll'

interface ContentBlock {
  id: string
  type: ContentBlockType
  data: {
    content?: string
    mediaType?: 'image' | 'video' | 'audio' | 'file'
    mediaUrl?: string
    caption?: string
    question?: string
    options?: { id: string; text: string; isCorrect: boolean }[]
    explanation?: string
    points?: number
    pollQuestion?: string
    pollOptions?: { id: string; text: string }[]
  }
}

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const courseSlug = params.slug as string
  const lessonSlug = params.lessonSlug as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [pollVotes, setPollVotes] = useState<Record<string, string>>({})

  // Récupérer le cours
  const { data: course } = useQuery<{ id: string; [key: string]: any } | null>({
    queryKey: ['course', courseSlug, user?.organization_id],
    queryFn: async () => {
      const result = await elearningService.getCourseBySlug(courseSlug, user?.organization_id || '')
      return result as any
    },
    enabled: !!courseSlug && !!user?.organization_id,
  })

  // Récupérer la leçon
  const { data: lesson, isLoading: lessonLoading } = useQuery<{
    id: string;
    content?: string;
    [key: string]: any;
  } | null>({
    queryKey: ['lesson', courseSlug, lessonSlug],
    queryFn: async () => {
      if (!course?.id) throw new Error('Course ID manquant')
      const result = await elearningService.getLessonBySlug(lessonSlug, (course as any).id)
      return result as any
    },
    enabled: !!course?.id && !!lessonSlug,
  })

  // Parser le contenu JSON pour charger les blocs
  useEffect(() => {
    if (lesson?.content) {
      try {
        const parsedContent = JSON.parse(lesson.content)
        if (Array.isArray(parsedContent)) {
          setContentBlocks(parsedContent)
        } else {
          // Si ce n'est pas un tableau, créer un bloc texte avec le contenu brut
          setContentBlocks([
            {
              id: '1',
              type: 'text',
              data: { content: lesson.content },
            },
          ])
        }
      } catch (error) {
        // Si le parsing échoue, créer un bloc texte avec le contenu brut
        if (lesson.content) {
          setContentBlocks([
            {
              id: '1',
              type: 'text',
              data: { content: lesson.content },
            },
          ])
        }
      }
    }
  }, [lesson])

  // Récupérer la progression
  const { data: progress, refetch: refetchProgress } = useQuery<{
    quiz_responses?: Record<string, { answer: string }>;
    poll_votes?: Record<string, { option_id: string }>;
    [key: string]: any;
  } | null>({
    queryKey: ['lesson-progress', lesson?.id, user?.id],
    queryFn: async () => {
      const result = await elearningService.getLessonProgress((lesson as any)?.id || '', user?.id || '')
      return result as any
    },
    enabled: !!lesson?.id && !!user?.id,
  })

  // Charger les réponses existantes depuis la progression
  useEffect(() => {
    if (progress) {
      const quizResponses = (progress.quiz_responses as Record<string, { answer: string }>) || {}
      const pollVotes = (progress.poll_votes as Record<string, { option_id: string }>) || {}
      
      const loadedQuizAnswers: Record<string, string> = {}
      Object.entries(quizResponses).forEach(([blockId, response]) => {
        loadedQuizAnswers[blockId] = response.answer
      })
      setQuizAnswers(loadedQuizAnswers)

      const loadedPollVotes: Record<string, string> = {}
      Object.entries(pollVotes).forEach(([blockId, vote]) => {
        loadedPollVotes[blockId] = vote.option_id
      })
      setPollVotes(loadedPollVotes)
    }
  }, [progress])

  // Mettre à jour la progression
  const updateProgressMutation = useMutation({
    mutationFn: async (percentage: number) => {
      if (!lesson?.id || !user?.id) return
      return elearningService.updateLessonProgress(lesson.id, user.id, {
        completion_percentage: percentage,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] })
      queryClient.invalidateQueries({ queryKey: ['course-enrollment'] })
    },
  })

  // Marquer comme complété
  const markCompletedMutation = useMutation({
    mutationFn: async () => {
      if (!lesson?.id || !user?.id) return
      return elearningService.markLessonAsCompleted(lesson.id, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] })
      queryClient.invalidateQueries({ queryKey: ['course-enrollment'] })
    },
  })

  // Suivre la progression de la vidéo
  useEffect(() => {
    const video = videoRef.current
    if (!video || lesson?.lesson_type !== 'video') return

    const updateProgress = () => {
      if (video.duration) {
        const percentage = (video.currentTime / video.duration) * 100
        updateProgressMutation.mutate(percentage)
      }
    }

    video.addEventListener('timeupdate', updateProgress)
    return () => video.removeEventListener('timeupdate', updateProgress)
  }, [lesson, updateProgressMutation])

  // Trouver les leçons précédente et suivante
  const lessons = course?.lessons || []
  const currentIndex = lessons.findIndex((l: any) => l.id === lesson?.id)
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null

  const isCompleted = progress?.is_completed || false
  const canEdit = ['super_admin', 'admin', 'secretary', 'teacher'].includes(user?.role || '')
  const scoresEnabled = (course as any)?.scores_enabled !== false

  // Mutation pour sauvegarder les réponses
  const saveResponseMutation = useMutation({
    mutationFn: async ({ blockId, answer, type }: { blockId: string; answer: string; type: 'quiz' | 'poll' }) => {
      if (!lesson?.id) throw new Error('Lesson ID manquant')
      
      const response = await fetch(`/api/elearning/lessons/${lesson.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_id: blockId, answer, type }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la sauvegarde')
      }

      return response.json()
    },
    onSuccess: () => {
      refetchProgress()
      queryClient.invalidateQueries({ queryKey: ['lesson-progress', lesson?.id] })
    },
  })

  // Gérer les réponses aux quiz
  const handleQuizAnswer = (blockId: string, answer: string) => {
    setQuizAnswers({ ...quizAnswers, [blockId]: answer })
    saveResponseMutation.mutate({ blockId, answer, type: 'quiz' })
  }

  // Gérer les votes aux sondages
  const handlePollVote = (blockId: string, optionId: string) => {
    setPollVotes({ ...pollVotes, [blockId]: optionId })
    saveResponseMutation.mutate({ blockId, answer: optionId, type: 'poll' })
  }

  if (lessonLoading || !course) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Leçon introuvable</p>
          <Link href={`/dashboard/elearning/courses/${courseSlug}`}>
            <Button variant="outline">Retour au cours</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Fonction pour rendre un bloc de contenu
  const renderContentBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'text':
        return (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="prose prose-sm max-w-none mb-6 p-4 bg-gray-50 rounded-lg"
          >
            <ReactMarkdown>{block.data.content || ''}</ReactMarkdown>
          </motion.div>
        )

      case 'media':
        return (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="mb-6"
          >
            <GlassCard variant="premium" className="p-4">
              {block.data.mediaType === 'image' && block.data.mediaUrl && (
                <div>
                  <img
                    src={block.data.mediaUrl}
                    alt={block.data.caption || 'Média'}
                    className="w-full rounded-lg mb-2"
                  />
                  {block.data.caption && (
                    <p className="text-sm text-gray-600 italic text-center">{block.data.caption}</p>
                  )}
                </div>
              )}
              {block.data.mediaType === 'video' && block.data.mediaUrl && (
                <div>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    {block.data.mediaUrl.includes('youtube.com') || block.data.mediaUrl.includes('youtu.be') ? (
                      <iframe
                        src={block.data.mediaUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={block.data.mediaUrl}
                        controls
                        className="w-full h-full"
                      />
                    )}
                  </div>
                  {block.data.caption && (
                    <p className="text-sm text-gray-600 italic text-center mt-2">{block.data.caption}</p>
                  )}
                </div>
              )}
              {block.data.mediaType === 'audio' && block.data.mediaUrl && (
                <div>
                  <audio src={block.data.mediaUrl} controls className="w-full" />
                  {block.data.caption && (
                    <p className="text-sm text-gray-600 italic text-center mt-2">{block.data.caption}</p>
                  )}
                </div>
              )}
              {block.data.mediaType === 'file' && block.data.mediaUrl && (
                <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                  <FileText className="h-8 w-8 text-brand-blue" />
                  <div className="flex-1">
                    <p className="font-medium">{block.data.caption || 'Fichier'}</p>
                    <a
                      href={block.data.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-blue hover:underline"
                    >
                      Télécharger
                    </a>
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )

      case 'quiz':
        const selectedAnswer = quizAnswers[block.id]
        return (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="mb-6"
          >
            <GlassCard variant="premium" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="h-5 w-5 text-brand-blue" />
                <h3 className="text-lg font-bold text-gray-900">
                  {scoresEnabled ? 'Quiz (évaluable)' : 'Quiz'}
                </h3>
                {scoresEnabled && block.data.points && (
                  <span className="text-sm text-gray-500">({block.data.points} point{block.data.points > 1 ? 's' : ''})</span>
                )}
              </div>
              <p className="text-gray-700 mb-4 font-medium">{block.data.question}</p>
              <div className="space-y-2 mb-4">
                {block.data.options?.map((option) => {
                  const isSelected = selectedAnswer === option.id
                  const isCorrect = option.isCorrect
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleQuizAnswer(block.id, option.id)}
                      className={cn(
                        "w-full text-left p-3 border rounded-lg transition-all",
                        isSelected
                          ? scoresEnabled
                            ? isCorrect
                              ? "bg-green-50 border-green-500 text-green-900"
                              : "bg-red-50 border-red-500 text-red-900"
                            : "bg-brand-blue-ghost border-brand-blue text-brand-blue"
                          : "bg-white border-gray-200 hover:border-brand-blue hover:bg-brand-blue-ghost"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          isSelected
                            ? scoresEnabled
                              ? isCorrect
                                ? "border-green-500 bg-green-500"
                                : "border-red-500 bg-red-500"
                              : "border-brand-blue bg-brand-blue"
                            : "border-gray-300"
                        )}>
                          {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                        </div>
                        <span>{option.text}</span>
                        {scoresEnabled && isSelected && isCorrect && (
                          <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              {scoresEnabled && selectedAnswer && block.data.explanation && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Explication :</strong> {block.data.explanation}
                  </p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )

      case 'poll':
        const selectedVote = pollVotes[block.id]
        return (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="mb-6"
          >
            <GlassCard variant="premium" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-brand-blue" />
                <h3 className="text-lg font-bold text-gray-900">Sondage (non évaluable)</h3>
              </div>
              <p className="text-gray-700 mb-4 font-medium">{block.data.pollQuestion}</p>
              <div className="space-y-2">
                {block.data.pollOptions?.map((option) => {
                  const isSelected = selectedVote === option.id
                  return (
                    <button
                      key={option.id}
                      onClick={() => handlePollVote(block.id, option.id)}
                      disabled={!!selectedVote}
                      className={cn(
                        "w-full text-left p-3 border rounded-lg transition-all",
                        isSelected
                          ? "bg-brand-blue-ghost border-brand-blue text-brand-blue"
                          : "bg-white border-gray-200 hover:border-brand-blue hover:bg-brand-blue-ghost",
                        selectedVote && !isSelected && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2",
                          isSelected
                            ? "border-brand-blue bg-brand-blue"
                            : "border-gray-300"
                        )} />
                        <span>{option.text}</span>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-brand-blue ml-auto" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/dashboard/elearning/courses/${courseSlug}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au cours
          </Button>
        </Link>
        {canEdit && (
          <Link href={`/dashboard/elearning/courses/${courseSlug}/lessons/${lessonSlug}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-3">
          <GlassCard variant="premium" className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
                {lesson.description && (
                  <p className="text-gray-600">{lesson.description}</p>
                )}
              </div>
              {isCompleted && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Complété</span>
                </div>
              )}
            </div>

            {/* Vidéo principale (si présente) */}
            {lesson.video_url && (
              <div className="mb-8">
                <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                  {lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be') ? (
                    <iframe
                      src={lesson.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={lesson.video_url}
                      controls
                      className="w-full h-full"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Blocs de contenu */}
            <div className="space-y-6">
              {contentBlocks.length > 0 ? (
                contentBlocks.map((block, index) => renderContentBlock(block, index))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Aucun contenu disponible pour cette leçon</p>
                </div>
              )}
            </div>

            {/* Pièces jointes */}
            {lesson.attachments && Array.isArray(lesson.attachments) && lesson.attachments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold mb-4 text-gray-900">Ressources supplémentaires</h3>
                <div className="space-y-2">
                  {lesson.attachments.map((attachment: any, index: number) => (
                    <a
                      key={index}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-brand-blue" />
                      <span className="text-sm">{attachment.filename || 'Télécharger'}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
              <div>
                {previousLesson && (
                  <Link href={`/dashboard/elearning/courses/${courseSlug}/lessons/${previousLesson.slug}`}>
                    <Button variant="outline">
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Leçon précédente
                    </Button>
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isCompleted && (
                  <Button
                    onClick={() => markCompletedMutation.mutate()}
                    disabled={markCompletedMutation.isPending}
                    className="bg-brand-blue hover:bg-brand-blue/90 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marquer comme complété
                  </Button>
                )}
                {nextLesson && (
                  <Link href={`/dashboard/elearning/courses/${courseSlug}/lessons/${nextLesson.slug}`}>
                    <Button className="bg-brand-blue hover:bg-brand-blue/90 text-white">
                      Leçon suivante
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}
                {!nextLesson && (
                  <Link href={`/dashboard/elearning/courses/${courseSlug}`}>
                    <Button className="bg-brand-blue hover:bg-brand-blue/90 text-white">
                      Retour au cours
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar - Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Leçons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lessons.map((l: any, index: number) => {
                  const isCurrent = l.id === lesson.id
                  return (
                    <Link
                      key={l.id}
                      href={`/dashboard/elearning/courses/${courseSlug}/lessons/${l.slug}`}
                    >
                      <button
                        className={cn(
                          "w-full text-left p-2 rounded-lg transition-colors",
                          isCurrent
                            ? 'bg-brand-blue text-white'
                            : 'bg-gray-50 hover:bg-gray-100'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Circle className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">
                            {index + 1}. {l.title}
                          </span>
                        </div>
                        {l.video_duration_minutes && (
                          <p className="text-xs mt-1 opacity-70">{l.video_duration_minutes} min</p>
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
