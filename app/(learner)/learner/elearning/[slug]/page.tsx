'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  PlayCircle,
  BookOpen,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Lock,
  Award,
  FileText,
  Video,
  Image as ImageIcon,
  ListChecks,
  ArrowLeft,
  Download,
  Share2,
  RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export default function LearnerCourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Réponses aux quiz intégrés dans le contenu des leçons (blocs "quiz")
  // Format: { [lessonId]: { [blockId]: selectedOptionIdOrText } }
  const [inlineQuizAnswers, setInlineQuizAnswers] = useState<Record<string, Record<string, string>>>({})

  const inlineQuizStorageKey = useMemo(() => {
    if (!studentId) return null
    return `eduzen.inlineQuizAnswers.${studentId}`
  }, [studentId])

  const loadInlineAnswersFromStorage = (lessonId: string) => {
    if (!inlineQuizStorageKey) return null
    try {
      const raw = localStorage.getItem(inlineQuizStorageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const lessonAnswers = parsed?.[lessonId]
      if (lessonAnswers && typeof lessonAnswers === 'object') return lessonAnswers as Record<string, string>
      return null
    } catch {
      return null
    }
  }

  const saveInlineAnswersToStorage = (lessonId: string, lessonAnswers: Record<string, string>) => {
    if (!inlineQuizStorageKey) return
    try {
      const raw = localStorage.getItem(inlineQuizStorageKey)
      const parsed = raw ? JSON.parse(raw) : {}
      const next = { ...(parsed || {}), [lessonId]: lessonAnswers }
      localStorage.setItem(inlineQuizStorageKey, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  // Récupérer le cours
  const { data: course, isLoading: loadingCourse, refetch: refetchCourse } = useQuery({
    queryKey: ['learner-course', slug],
    queryFn: async () => {
      try {
        if (!supabase) return null
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            course_sections(
              id,
              title,
              description,
              order_index,
              lessons(
                id,
                title,
                description,
                content,
                lesson_type,
                video_duration_minutes,
                order_index,
                video_url,
                is_preview,
                quizzes(id)
              )
            )
          `)
          .eq('slug', slug)
          .maybeSingle()
        
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
            logger.warn('Course table or relations do not exist yet or invalid query', {
              slug: slug,
              error: sanitizeError(error),
            })
            return null
          }
          throw error
        }
        return data
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
          logger.warn('Course table or relations do not exist yet or invalid query', {
            slug: slug,
            error: sanitizeError(error),
          })
          return null
        }
        throw error
      }
    },
    enabled: !!slug && !!supabase,
  })

  const scoresEnabled = (course as any)?.scores_enabled !== false

  // Récupérer l'inscription de l'étudiant
  // Table course_enrollments n'existe pas
  const enrollment = null

  // Récupérer la progression des leçons
  const { data: lessonProgress } = useQuery({
    queryKey: ['learner-lesson-progress', course?.id, studentId],
    queryFn: async () => {
      if (!course?.id || !studentId || !supabase) return {}
      
      const { data } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('student_id', studentId)
      
      const progressMap: Record<string, any> = {}
      data?.forEach((p: any) => {
        progressMap[p.lesson_id] = p
      })
      
      return progressMap
    },
    enabled: !!course?.id && !!studentId && !!supabase,
  })

  // Fallback: si les sections ne sont pas visibles (RLS course_sections pas appliquée),
  // on charge les leçons directement via `lessons` pour permettre au candidat de démarrer.
  const { data: lessonsFallback } = useQuery({
    queryKey: ['learner-course-lessons-fallback', course?.id],
    queryFn: async () => {
      if (!supabase || !course?.id) return []
      if (course?.course_sections?.length) return [] // inutile si on a déjà sections+lessons

      const { data, error } = await supabase
        .from('lessons')
        .select(
          `
          id,
          title,
          description,
          content,
          lesson_type,
          video_duration_minutes,
          order_index,
          video_url,
          is_preview,
          course_id,
          section_id,
          section:course_sections(title),
          quizzes(id)
        `
        )
        .eq('course_id', course.id)
        .order('order_index', { ascending: true })

      if (error) {
        logger.warn('Error fetching lessons fallback', {
          courseId: maskId(course.id),
          error: sanitizeError(error),
        })
        return []
      }

      return data || []
    },
    enabled: !!supabase && !!course?.id,
  })

  // Organiser les leçons
  const allLessons =
    course?.course_sections?.length
      ? course.course_sections
          ?.sort((a: any, b: any) => a.order_index - b.order_index)
          .flatMap((section: any) =>
            (section.lessons || [])
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((lesson: any) => ({ ...lesson, sectionTitle: section.title }))
          ) || []
      : (lessonsFallback || []).map((lesson: any) => ({
          ...lesson,
          sectionTitle: lesson?.section?.title || 'Sans section',
        }))

  const currentLesson = allLessons[currentLessonIndex]
  const totalLessons = allLessons.length
  const completedLessons = Object.values(lessonProgress || {}).filter((p: any) => p.is_completed).length
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  // Recharger les réponses des quiz inline depuis localStorage à chaque changement de leçon
  useEffect(() => {
    if (!currentLesson?.id) return
    const stored = loadInlineAnswersFromStorage(currentLesson.id)
    if (!stored) return
    setInlineQuizAnswers((prev) => {
      if (prev[currentLesson.id] && Object.keys(prev[currentLesson.id]).length > 0) return prev
      return { ...prev, [currentLesson.id]: stored }
    })
  }, [currentLesson?.id, inlineQuizStorageKey])

  // Si le nombre de leçons change (RLS/migrations), s'assurer que l'index reste valide
  useEffect(() => {
    if (currentLessonIndex > 0 && currentLessonIndex >= totalLessons) {
      setCurrentLessonIndex(0)
    }
  }, [currentLessonIndex, totalLessons])

  // Mutation pour marquer une leçon comme terminée
  const completeLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!studentId || !supabase) throw new Error('Student not found')
      
      // IMPORTANT:
      // On évite `upsert/on_conflict` (409 selon l'état des contraintes/index).
      // Flow robuste: SELECT -> UPDATE si existe, sinon INSERT. Et si INSERT renvoie 409 (race), on UPDATE.
      const nowIso = new Date().toISOString()
      const payloadInsert = {
        student_id: studentId,
        lesson_id: lessonId,
        is_completed: true,
        completed_at: nowIso,
        completion_percentage: 100,
      }

      const payloadUpdate = {
        is_completed: true,
        completed_at: nowIso,
        completion_percentage: 100,
      }

      const { data: existing, error: existingError } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('student_id', studentId)
        .maybeSingle()

      if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 = no rows
        throw existingError
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('lesson_progress')
          .update(payloadUpdate)
          .eq('id', existing.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('lesson_progress')
          .insert(payloadInsert)

        if (insertError) {
          // Si conflit (ligne créée en parallèle), on retente en update.
          if (insertError.code === '23505' || insertError.message?.toLowerCase().includes('duplicate') || insertError.message?.toLowerCase().includes('conflict')) {
            const { error: updateError } = await supabase
              .from('lesson_progress')
              .update(payloadUpdate)
              .eq('lesson_id', lessonId)
              .eq('student_id', studentId)
            if (updateError) throw updateError
          } else {
            throw insertError
          }
        }
      }
      
      // Mettre à jour la progression globale du cours
      const newCompletedCount = completedLessons + 1
      const newProgress = Math.round((newCompletedCount / totalLessons) * 100)
      
      // NOTE: Table course_enrollments n'existe pas encore - désactivé pour l'instant
      // Fonctionnalité prévue - Nécessite création de la table course_enrollments dans Supabase
      /*
      await supabase
        // Table course_enrollments n'existe pas - désactivé
        // .from('course_enrollments')
        .update({
          progress_percentage: newProgress,
          status: newProgress >= 100 ? 'completed' : 'in_progress',
          completed_at: newProgress >= 100 ? new Date().toISOString() : null,
        })
        .eq('course_id', course?.id)
        .eq('student_id', studentData.id)
      */
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learner-lesson-progress'] })
      queryClient.invalidateQueries({ queryKey: ['learner-course-enrollment'] })
      addToast({
        type: 'success',
        title: 'Leçon terminée !',
        description: 'Votre progression a été enregistrée.',
      })
    },
    onError: (error: any) => {
      const msg = error?.message || ''
      addToast({
        type: 'error',
        title: 'Impossible d’enregistrer',
        description:
          msg.includes('401') || msg.toLowerCase().includes('unauthorized')
            ? "Accès non autorisé (RLS). Applique la migration '20251217000014_learner_write_lesson_progress.sql' puis réessaie."
            : msg.includes('409') || msg.toLowerCase().includes('conflict')
            ? "Conflit (409). Très souvent: la FK de `lesson_progress.student_id` pointe vers `auth.users` au lieu de `public.students`. Applique '20251217000016_fix_lesson_progress_student_fk.sql' (et éventuellement '20251217000015_lesson_progress_unique_index.sql'), puis réessaie."
            : 'Une erreur est survenue lors de l’enregistrement de votre progression.',
      })
    },
  })

  const handleNextLesson = () => {
    if (currentLessonIndex < totalLessons - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1)
    }
  }

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1)
    }
  }

  const handleCompleteLesson = () => {
    if (currentLesson) {
      completeLessonMutation.mutate(currentLesson.id)
    }
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />
      case 'quiz': return <ListChecks className="h-4 w-4" />
      case 'text': return <FileText className="h-4 w-4" />
      case 'image': return <ImageIcon className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress?.[lessonId]?.is_completed
  }

  const renderLessonContent = (content?: string | null, lessonId?: string) => {
    if (!content) return null

    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        return (
          <div className="space-y-4">
            {parsed.map((block: any, idx: number) => {
              if (!block?.type) return null

              if (block.type === 'text') {
                return (
                  <div key={block.id || idx} className="prose prose-sm max-w-none">
                    <ReactMarkdown>{block?.data?.content || ''}</ReactMarkdown>
                  </div>
                )
              }

              if (block.type === 'media') {
                const mediaType = block?.data?.mediaType
                const url = block?.data?.mediaUrl
                const caption = block?.data?.caption
                if (!url) return null

                if (mediaType === 'image') {
                  return (
                    <div key={block.id || idx} className="space-y-2">
                      <img src={url} alt={caption || 'Image'} className="w-full rounded-lg border border-gray-200" />
                      {caption ? <p className="text-sm text-gray-500 text-center italic">{caption}</p> : null}
                    </div>
                  )
                }

                if (mediaType === 'video') {
                  return (
                    <div key={block.id || idx} className="space-y-2">
                      <video src={url} controls className="w-full rounded-lg" />
                      {caption ? <p className="text-sm text-gray-500 text-center italic">{caption}</p> : null}
                    </div>
                  )
                }

                if (mediaType === 'audio') {
                  return (
                    <div key={block.id || idx} className="space-y-2">
                      <audio src={url} controls className="w-full" />
                      {caption ? <p className="text-sm text-gray-500 text-center italic">{caption}</p> : null}
                    </div>
                  )
                }

                // file
                return (
                  <div key={block.id || idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">{caption || 'Fichier'}</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-blue hover:underline">
                      Télécharger
                    </a>
                  </div>
                )
              }

              if (block.type === 'quiz') {
                const blockId = String(block?.id || `quiz-${idx}`)
                const selected =
                  (lessonId && inlineQuizAnswers?.[lessonId]?.[blockId]) || ''

                const options = (block?.data?.options || []).map((opt: any, optIdx: number) => ({
                  id: String(opt?.id || `${blockId}-opt-${optIdx}`),
                  text: String(opt?.text || ''),
                  isCorrect: !!opt?.isCorrect,
                }))

                const correctOptions = options.filter((o: any) => o.isCorrect)
                const selectedOption = options.find((o: any) => (o.id || o.text) === selected)
                const isAnswered = !!selected
                const isGraded = correctOptions.length > 0
                const isCorrect = isAnswered && isGraded ? !!selectedOption?.isCorrect : false

                return (
                  <div key={block.id || idx} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {scoresEnabled && isGraded ? 'Quiz (noté)' : 'Quiz'}
                      </h4>
                      {scoresEnabled && isGraded && (
                        <Badge className={isAnswered ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-gray-100 text-gray-700'}>
                          {isAnswered ? (isCorrect ? '1/1' : '0/1') : '0/1'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{block?.data?.question || ''}</p>

                    <div className="space-y-2">
                      {options.map((opt: any) => {
                        const value = opt.id || opt.text
                        const isSelected = selected === value
                        const isLocked = !!selected

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (!lessonId) return
                              if (isLocked) return
                              setInlineQuizAnswers((prev) => {
                                const nextLessonAnswers = {
                                  ...(prev[lessonId] || {}),
                                  [blockId]: value,
                                }
                                // Persistance immédiate: ne disparaît pas au refresh
                                saveInlineAnswersToStorage(lessonId, nextLessonAnswers)
                                return { ...prev, [lessonId]: nextLessonAnswers }
                              })
                            }}
                            disabled={isLocked}
                            className={`w-full text-left border rounded-md px-3 py-2 text-sm transition-colors ${
                              isSelected
                                ? 'border-brand-blue bg-brand-blue/10 text-gray-900'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            {opt.text}
                          </button>
                        )
                      })}
                    </div>

                    {/* Feedback si noté */}
                    {scoresEnabled && isAnswered && isGraded && (
                      <div className="mt-3 text-sm">
                        {isCorrect ? (
                          <p className="text-green-700 font-medium">Bonne réponse (+1)</p>
                        ) : (
                          <p className="text-red-700 font-medium">Mauvaise réponse (0)</p>
                        )}
                      </div>
                    )}

                    {selected && (
                      <p className="mt-2 text-xs text-gray-500">
                        Réponse verrouillée (vous ne pouvez plus la modifier).
                      </p>
                    )}
                  </div>
                )
              }

              if (block.type === 'poll') {
                return (
                  <div key={block.id || idx} className="p-4 border rounded-lg bg-white">
                    <h4 className="font-semibold text-gray-900 mb-2">Sondage</h4>
                    <p className="text-sm text-gray-700 mb-3">{block?.data?.pollQuestion || ''}</p>
                    <ul className="space-y-2">
                      {(block?.data?.pollOptions || []).map((opt: any) => (
                        <li key={opt.id} className="text-sm text-gray-600 border rounded-md px-3 py-2">
                          {opt.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }

              return null
            })}
          </div>
        )
      }
    } catch {
      // Not JSON
    }

    return (
      <div className="prose prose-sm max-w-none mt-6 pt-6 border-t">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    )
  }

  // Score global des quiz "inline" de la leçon courante (si des bonnes réponses existent).
  const inlineLessonScore = useMemo(() => {
    if (!currentLesson?.id || !currentLesson?.content) {
      return { total: 0, answered: 0, correct: 0, percentage: 0, graded: false }
    }

    try {
      const parsed = JSON.parse(currentLesson.content)
      if (!Array.isArray(parsed)) return { total: 0, answered: 0, correct: 0, percentage: 0, graded: false }

      const quizBlocks = parsed.filter((b: any) => b?.type === 'quiz')
      if (!quizBlocks.length) return { total: 0, answered: 0, correct: 0, percentage: 0, graded: false }

      const lessonAnswers = inlineQuizAnswers?.[currentLesson.id] || {}

      let total = 0
      let answered = 0
      let correct = 0

      for (let i = 0; i < quizBlocks.length; i++) {
        const block = quizBlocks[i]
        const blockId = String(block?.id || `quiz-${i}`)
        const selected = lessonAnswers[blockId]
        if (selected) answered += 1

        const options = (block?.data?.options || []).map((opt: any, optIdx: number) => ({
          id: String(opt?.id || `${blockId}-opt-${optIdx}`),
          text: String(opt?.text || ''),
          isCorrect: !!opt?.isCorrect,
        }))

        const correctOptions = options.filter((o: any) => o.isCorrect)
        if (!correctOptions.length) {
          // pas de correction => non noté
          continue
        }

        total += 1
        const selectedOption = options.find((o: any) => (o.id || o.text) === selected)
        if (selected && selectedOption?.isCorrect) correct += 1
      }

      const graded = total > 0
      const percentage = graded ? Math.round((correct / total) * 100) : 0
      return { total, answered, correct, percentage, graded }
    } catch {
      return { total: 0, answered: 0, correct: 0, percentage: 0, graded: false }
    }
  }, [currentLesson?.id, currentLesson?.content, inlineQuizAnswers])

  if (loadingCourse) {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
        <div className="h-12 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Cours introuvable</h2>
        <Link href="/learner/elearning">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux cours
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/learner/elearning">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 line-clamp-1">
            {course.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span>{progressPercentage}% complété</span>
            <span>•</span>
            <span>{completedLessons}/{totalLessons} leçons</span>
          </div>
        </div>
        {progressPercentage >= 100 && (
          <Badge className="bg-green-100 text-green-700">
            <Award className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-2 space-y-4">
          {currentLesson && (
            <GlassCard className="overflow-hidden">
              {/* Video/Content Area */}
              <div className="relative aspect-video bg-gray-900">
                {currentLesson.video_url ? (
                  <video
                    ref={videoRef}
                    src={currentLesson.video_url}
                    className="w-full h-full object-contain"
                    controls
                    onEnded={handleCompleteLesson}
                  />
                ) : currentLesson.lesson_type === 'quiz' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <ListChecks className="h-16 w-16 mb-4 text-brand-blue" />
                    <h3 className="text-xl font-semibold mb-2">Quiz interactif</h3>
                    <p className="text-gray-400 mb-4">Testez vos connaissances</p>
                    <Link
                      href={`/learner/evaluations/${currentLesson?.quizzes?.[0]?.id || currentLesson.id}`}
                    >
                      <Button>
                        <Play className="h-4 w-4 mr-2" />
                        Commencer le quiz
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 text-brand-blue" />
                      <p className="text-gray-400">Contenu textuel ci-dessous</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Info */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm text-brand-blue font-medium mb-1">
                      {currentLesson.sectionTitle}
                    </p>
                    <h2 className="text-xl font-bold text-gray-900">
                      {currentLesson.title}
                    </h2>
                    {scoresEnabled && inlineLessonScore.graded && (
                      <div className="mt-2">
                        <Badge className="bg-indigo-100 text-indigo-700">
                          Score quiz: {inlineLessonScore.correct}/{inlineLessonScore.total} ({inlineLessonScore.percentage}%)
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {currentLesson.video_duration_minutes && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {currentLesson.video_duration_minutes} min
                      </Badge>
                    )}
                    {isLessonCompleted(currentLesson.id) && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Terminé
                      </Badge>
                    )}
                  </div>
                </div>

                {currentLesson.description && (
                  <p className="text-gray-600 mb-4">{currentLesson.description}</p>
                )}

                {/* Contenu de la leçon */}
                {renderLessonContent(currentLesson.content, currentLesson.id)}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevLesson}
                    disabled={currentLessonIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Précédent
                  </Button>

                  {!isLessonCompleted(currentLesson.id) && (
                    <Button
                      onClick={handleCompleteLesson}
                      disabled={completeLessonMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marquer comme terminé
                    </Button>
                  )}

                  <Button
                    onClick={handleNextLesson}
                    disabled={currentLessonIndex >= totalLessons - 1}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {!currentLesson && (
            <GlassCard className="p-6 border border-amber-200 bg-amber-50/40">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Impossible de démarrer le cours</h3>
              <p className="text-sm text-gray-700 mb-4">
                Ce cours ne contient pas encore de leçons, ou l’accès aux sections/leçons n’est pas encore autorisé.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => refetchCourse()}
                  className="bg-brand-blue hover:bg-brand-blue/90"
                >
                  Réessayer
                </Button>
                <Link href="/learner/elearning">
                  <Button variant="outline">Retour aux cours</Button>
                </Link>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Sidebar - Liste des leçons */}
        <div className="space-y-4">
          <GlassCard className="p-4">
            <h3 className="font-bold text-gray-900 mb-4">Contenu du cours</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {course.course_sections?.length ? course.course_sections
                ?.sort((a: any, b: any) => a.order_index - b.order_index)
                .map((section: any) => (
                  <div key={section.id} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 px-2">
                      {section.title}
                    </h4>
                    <div className="space-y-1">
                      {section.lessons
                        .sort((a: any, b: any) => a.order_index - b.order_index)
                        .map((lesson: any, idx: number) => {
                          const globalIndex = allLessons.findIndex((l: any) => l.id === lesson.id)
                          const isActive = globalIndex === currentLessonIndex
                          const isComplete = isLessonCompleted(lesson.id)
                          
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setCurrentLessonIndex(globalIndex)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                                isActive
                                  ? 'bg-brand-blue text-white shadow-lg'
                                  : isComplete
                                  ? 'bg-green-50 text-gray-700 hover:bg-green-100'
                                  : 'hover:bg-gray-50 text-gray-600'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg ${
                                isActive ? 'bg-white/20' : isComplete ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                {isComplete ? (
                                  <CheckCircle2 className={`h-4 w-4 ${isActive ? 'text-white' : 'text-green-600'}`} />
                                ) : (
                                  getLessonIcon(lesson.lesson_type)
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                  isActive ? 'text-white' : ''
                                }`}>
                                  {lesson.title}
                                </p>
                                {lesson.video_duration_minutes && (
                                  <p className={`text-xs ${
                                    isActive ? 'text-white/70' : 'text-gray-400'
                                  }`}>
                                  {lesson.video_duration_minutes} min
                                  </p>
                                )}
                              </div>
                              {isActive && (
                                <PlayCircle className="h-5 w-5 text-white" />
                              )}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )) : allLessons.length ? (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 px-2">Leçons</h4>
                    <div className="space-y-1">
                      {allLessons.map((lesson: any) => {
                        const globalIndex = allLessons.findIndex((l: any) => l.id === lesson.id)
                        const isActive = globalIndex === currentLessonIndex
                        const isComplete = isLessonCompleted(lesson.id)

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setCurrentLessonIndex(globalIndex)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                              isActive
                                ? 'bg-brand-blue text-white shadow-lg'
                                : isComplete
                                ? 'bg-green-50 text-gray-700 hover:bg-green-100'
                                : 'hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <div
                              className={`p-1.5 rounded-lg ${
                                isActive ? 'bg-white/20' : isComplete ? 'bg-green-100' : 'bg-gray-100'
                              }`}
                            >
                              {isComplete ? (
                                <CheckCircle2 className={`h-4 w-4 ${isActive ? 'text-white' : 'text-green-600'}`} />
                              ) : (
                                getLessonIcon(lesson.lesson_type)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : ''}`}>
                                {lesson.title}
                              </p>
                              {lesson.video_duration_minutes && (
                                <p className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                                  {lesson.video_duration_minutes} min
                                </p>
                              )}
                            </div>
                            {isActive && <PlayCircle className="h-5 w-5 text-white" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg border">
                    Aucune section/leçon visible pour le moment. Si le cours est bien assigné, applique la migration RLS
                    pour `course_sections` puis réessaye.
                  </div>
                )}
            </div>
          </GlassCard>

          {/* Certificate */}
          {progressPercentage >= 100 && (
            <GlassCard className="p-4 bg-gradient-to-br from-brand-cyan-pale to-brand-cyan-ghost/50 border-brand-cyan-pale">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Félicitations !</h4>
                  <p className="text-sm text-gray-600">Cours terminé avec succès</p>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-3">
                <Download className="h-4 w-4 mr-2" />
                Télécharger le certificat
              </Button>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}


