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
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Award,
  RotateCcw,
  Home,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

interface Question {
  id: string
  question: string
  type: 'multiple_choice' | 'true_false' | 'text'
  options?: string[]
  correct_answer: string | string[]
  points: number
  explanation?: string
}

export default function LearnerQuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.quizId as string
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<{
    score: number
    total: number
    passed: boolean
    answers: Record<string, { correct: boolean; correctAnswer: string | string[] }>
  } | null>(null)

  // Debug visible (même en production) pour vérifier que le bundle est à jour et que les events arrivent.
  const QUIZ_UI_VERSION = 'quiz-ui-2025-12-17-01'
  const [debugTapCount, setDebugTapCount] = useState(0)

  // Sur mobile/desktop, certains environnements déclenchent pointer + click (double).
  // On évite un double toggle en ignorant le click après un pointer.
  const ignoreNextClickRef = useRef(false)

  // Récupérer le quiz (si quizId est réellement un quiz.id)
  const { data: quiz, isLoading: isLoadingQuiz, error: quizError } = useQuery({
    queryKey: ['learner-quiz', quizId],
    queryFn: async () => {
      if (!supabase) return null
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          lessons(title, courses(title)),
          quiz_questions(*)
        `)
        .eq('id', quizId)
        .maybeSingle()
      
      if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST301') {
          logger.warn('Quiz not found or access denied', {
            quizId: maskId(quizId),
            error: sanitizeError(error),
          })
          return null
        }
        throw error
      }
      return data
    },
    enabled: !!quizId && !!supabase,
  })

  // Fallback: si quiz non trouvé (souvent parce qu'il n'existe pas en base),
  // on tente de traiter l'URL comme un lessonId et de parser `lessons.content` (blocs quiz).
  const { data: lessonQuizFallback, isLoading: isLoadingLessonFallback } = useQuery({
    queryKey: ['learner-quiz-fallback-lesson', quizId],
    queryFn: async () => {
      if (!supabase) return null

      const { data: lesson, error } = await supabase
        .from('lessons')
        .select('id, title, content')
        .eq('id', quizId)
        .maybeSingle()

      if (error || !lesson?.content) return null

      try {
        const parsed = JSON.parse(lesson.content)
        if (!Array.isArray(parsed)) return null

        const quizBlocks = parsed.filter((b: any) => b?.type === 'quiz')
        if (!quizBlocks.length) return null

        const questionsFromBlocks: Question[] = quizBlocks.map((block: any, idx: number) => {
          const qText = block?.data?.question || `Question ${idx + 1}`
          const opts = (block?.data?.options || [])
            .map((o: any) => String(o?.text ?? ''))
            .filter(Boolean)
          const correct = (block?.data?.options || [])
            .filter((o: any) => o?.isCorrect)
            .map((o: any) => String(o?.text ?? ''))
            .filter(Boolean)

          const correct_answer: string | string[] =
            correct.length > 1 ? correct : (correct[0] || '')

          return {
            id: String(block?.id || `block-${idx}`),
            question: qText,
            type: 'multiple_choice',
            options: opts,
            correct_answer,
            points: 1,
            explanation: block?.data?.explanation || undefined,
          }
        })

        return {
          lessonTitle: lesson.title,
          questions: questionsFromBlocks,
          isGraded: questionsFromBlocks.some((q) =>
            Array.isArray(q.correct_answer) ? q.correct_answer.length > 0 : !!q.correct_answer
          ),
        }
      } catch (_e) {
        return null
      }
    },
    enabled: !!quizId && !!supabase && !isLoadingQuiz && !quiz,
  })

  const isLoading = isLoadingQuiz || isLoadingLessonFallback

  // Mapper les questions DB -> format UI
  const questions: Question[] = quiz
    ? (quiz?.quiz_questions || [])
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        .map((q: any) => {
          const type = (q.question_type || q.type || 'multiple_choice') as Question['type']
          const question = q.question_text || q.question || ''
          const explanation = q.explanation || undefined
          const points = q.points || 1

          let options: string[] | undefined
          let correct_answer: string | string[] = q.correct_answer as any

          if (type === 'multiple_choice') {
            const rawOptions = q.options
            if (Array.isArray(rawOptions)) {
              // Supabase schema: [{ text, is_correct }, ...]
              if (rawOptions.length && typeof rawOptions[0] === 'object') {
                options = rawOptions.map((o: any) => String(o?.text ?? '')).filter(Boolean)
                const correct = rawOptions
                  .filter((o: any) => o?.is_correct)
                  .map((o: any) => String(o?.text ?? ''))
                  .filter(Boolean)
                if (correct.length === 1) correct_answer = correct[0]
                if (correct.length > 1) correct_answer = correct
              } else {
                // fallback: array of strings
                options = rawOptions.map((o: any) => String(o)).filter(Boolean)
              }
            }
          }

          if (type === 'true_false') {
            // Normaliser en 'vrai'/'faux' car l'UI utilise ces valeurs
            const ca = String(correct_answer ?? '').toLowerCase()
            if (['true', 'vrai', '1', 't', 'yes', 'oui'].includes(ca)) correct_answer = 'vrai'
            if (['false', 'faux', '0', 'f', 'no', 'non'].includes(ca)) correct_answer = 'faux'
          }

          // Default correct_answer fallback
          if (correct_answer == null) correct_answer = ''

          return {
            id: q.id,
            question,
            type,
            options,
            correct_answer,
            points,
            explanation,
          }
        })
        .filter((q: any) => q?.id) || []
    : (lessonQuizFallback?.questions || [])

  // Timer
  useEffect(() => {
    if (quiz?.time_limit_minutes && !showResults) {
      setTimeLeft(quiz.time_limit_minutes * 60) // Convertir en secondes
    }
  }, [quiz, showResults])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          handleSubmit()
          return 0
        }
        return prev ? prev - 1 : null
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, showResults])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).length

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }))
  }

  const selectOption = useCallback(
    (questionId: string, option: string, isMulti: boolean) => {
      if (!questionId) return
      if (!isMulti) {
        handleAnswer(questionId, option)
        return
      }
      setAnswers((prev) => {
        const prevVal = prev[questionId]
        const arr = Array.isArray(prevVal) ? [...prevVal] : []
        const idx = arr.indexOf(option)
        if (idx >= 0) arr.splice(idx, 1)
        else arr.push(option)
        return { ...prev, [questionId]: arr }
      })
    },
    [setAnswers]
  )

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      // Calculer le score
      let correctCount = 0
      let totalPoints = 0
      const answerResults: Record<string, { correct: boolean; correctAnswer: string | string[] }> = {}

      questions.forEach((q) => {
        totalPoints += q.points || 1
        const userAnswer = answers[q.id]
        const correctAnswer = q.correct_answer

        let isCorrect = false
        if (Array.isArray(correctAnswer)) {
          isCorrect = Array.isArray(userAnswer) 
            ? correctAnswer.every((a) => userAnswer.includes(a)) && userAnswer.length === correctAnswer.length
            : correctAnswer.includes(userAnswer as string)
        } else {
          isCorrect = userAnswer === correctAnswer
        }

        if (isCorrect) {
          correctCount += q.points || 1
        }

        answerResults[q.id] = {
          correct: isCorrect,
          correctAnswer,
        }
      })

      const hasGrading = questions.some((q) =>
        Array.isArray(q.correct_answer) ? q.correct_answer.length > 0 : !!q.correct_answer
      )
      const score = hasGrading ? Math.round((correctCount / totalPoints) * 100) : 0
      const passed = hasGrading ? score >= (quiz?.passing_score || 70) : true

      // Sauvegarder le résultat
      if (studentId && supabase) {
        try {
          await (supabase as any)
            .from('lesson_quiz_responses')
            .insert({
              student_id: studentId,
              lesson_id: quiz?.lesson_id,
              quiz_id: quizId,
              answers,
              score,
              passed,
              completed_at: new Date().toISOString(),
            })
        } catch (_e) {
          // Table potentiellement absente selon environnement, on n'empêche pas l'utilisateur de voir le résultat.
        }
      }

      setResults({
        score,
        total: totalPoints,
        passed,
        answers: answerResults,
      })
      setShowResults(true)

      addToast({
        type: passed ? 'success' : 'error',
        title: passed ? 'Félicitations !' : 'Quiz terminé',
        description: hasGrading
          ? passed
            ? `Vous avez réussi avec ${score}% !`
            : `Score: ${score}%. Le seuil de réussite est de ${quiz?.passing_score || 70}%.`
          : 'Quiz non noté : réponses enregistrées.',
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de soumettre le quiz.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setCurrentQuestionIndex(0)
    setShowResults(false)
    setResults(null)
    if (quiz?.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Chargement du quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz && !lessonQuizFallback) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Quiz introuvable</h2>
        <p className="text-sm text-gray-600 mb-6">
          Ce quiz n’existe pas encore, ou l’accès n’est pas autorisé côté apprenant. Vérifie qu’un quiz est bien créé pour
          la leçon, et que la migration `20251217000013_learner_header_access_quizzes.sql` est appliquée.
        </p>
        <Link href="/learner/evaluations">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux évaluations
          </Button>
        </Link>
      </div>
    )
  }

  // Écran de résultats
  if (showResults && results) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8">
        <GlassCard className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            {results.passed ? (
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <Award className="h-12 w-12 text-green-600" />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
            )}
          </motion.div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {results.passed ? 'Félicitations !' : 'Quiz terminé'}
          </h1>
          <p className="text-gray-500 mb-6">
            {quiz?.title || ''}
          </p>

          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className={`text-4xl font-bold ${results.passed ? 'text-green-600' : 'text-red-600'}`}>
                {results.score}%
              </div>
              <p className="text-sm text-gray-500">Votre score</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-400">
                {quiz?.passing_score || 70}%
              </div>
              <p className="text-sm text-gray-500">Score requis</p>
            </div>
          </div>

          {results.passed ? (
            <Badge className="bg-green-100 text-green-700 text-base px-4 py-2">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Quiz réussi
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 text-base px-4 py-2">
              <XCircle className="h-4 w-4 mr-2" />
              Score insuffisant
            </Badge>
          )}
        </GlassCard>

        {/* Résumé des réponses */}
        <GlassCard className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Résumé des réponses</h3>
          <div className="space-y-3">
            {questions.map((q, index) => {
              const result = results.answers[q.id]
              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl ${
                    result?.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result?.correct ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Question {index + 1}</p>
                      <p className="text-sm text-gray-600 mt-1">{q.question}</p>
                      {!result?.correct && (
                        <p className="text-sm text-green-600 mt-2">
                          Réponse correcte : {Array.isArray(result?.correctAnswer) 
                            ? result?.correctAnswer.join(', ') 
                            : result?.correctAnswer}
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-sm text-gray-500 mt-2 italic">{q.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Actions */}
        <div className="flex gap-4">
          {!results.passed && (
            <Button onClick={handleRetry} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          )}
          <Link href="/learner/evaluations" className="flex-1">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Retour aux évaluations
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/learner/evaluations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quitter
          </Button>
        </Link>
        {timeLeft !== null && (
          <Badge className={`text-base px-4 py-2 ${timeLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
            <Clock className="h-4 w-4 mr-2" />
            {formatTime(timeLeft)}
          </Badge>
        )}
      </div>

      {/* Debug bar */}
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>version: {QUIZ_UI_VERSION}</span>
        <span>taps: {debugTapCount}</span>
      </div>

      {/* Progress */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {currentQuestionIndex + 1} sur {totalQuestions}
          </span>
          <span className="text-sm text-gray-500">
            {answeredCount} répondu{answeredCount > 1 ? 'es' : 'e'}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-blue"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </GlassCard>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <GlassCard className="p-6">
            <div
              onPointerDownCapture={() => setDebugTapCount((c) => c + 1)}
              onClickCapture={() => setDebugTapCount((c) => c + 1)}
            >
            <h2 className="text-lg font-bold text-gray-900 mb-6">
              {currentQuestion?.question}
            </h2>

            {/* Options */}
            {currentQuestion?.type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isMulti = Array.isArray(currentQuestion.correct_answer)
                  const currentValue = answers[currentQuestion.id]
                  const isSelected = isMulti
                    ? Array.isArray(currentValue) && currentValue.includes(option)
                    : currentValue === option
                  return (
                    <button
                      key={index}
                      type="button"
                      onPointerDown={(e) => {
                        ignoreNextClickRef.current = true
                        e.preventDefault()
                        e.stopPropagation()
                        selectOption(currentQuestion.id, option, isMulti)
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (ignoreNextClickRef.current) {
                          ignoreNextClickRef.current = false
                          return
                        }
                        selectOption(currentQuestion.id, option, isMulti)
                      }}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-brand-blue text-white ring-2 ring-brand-blue'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-white bg-white' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <div className="w-3 h-3 rounded-full bg-brand-blue" />}
                        </div>
                        <span className="font-medium">{option}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {currentQuestion?.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4">
                {['Vrai', 'Faux'].map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.toLowerCase()
                  return (
                    <button
                      key={option}
                      type="button"
                      onPointerDown={(e) => {
                        ignoreNextClickRef.current = true
                        e.preventDefault()
                        e.stopPropagation()
                        handleAnswer(currentQuestion.id, option.toLowerCase())
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (ignoreNextClickRef.current) {
                          ignoreNextClickRef.current = false
                          return
                        }
                        handleAnswer(currentQuestion.id, option.toLowerCase())
                      }}
                      className={`p-6 rounded-xl text-center transition-all ${
                        isSelected
                          ? 'bg-brand-blue text-white ring-2 ring-brand-blue'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-lg font-semibold">{option}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Debug (DEV) */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-6 text-xs text-gray-500 break-all">
                <div>debug.questionId: {String(currentQuestion?.id || '')}</div>
                <div>debug.selected: {JSON.stringify(answers[currentQuestion?.id || ''] ?? null)}</div>
              </div>
            )}
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>

        {currentQuestionIndex < totalQuestions - 1 ? (
          <Button
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
          >
            Suivant
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || answeredCount < totalQuestions}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Envoi...' : 'Soumettre'}
            <CheckCircle2 className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Question navigation */}
      <GlassCard className="p-4">
        <p className="text-sm font-medium text-gray-600 mb-3">Navigation rapide</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, index) => {
            const isAnswered = !!answers[q.id]
            const isCurrent = index === currentQuestionIndex
            return (
              <button
                key={q.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setCurrentQuestionIndex(index)
                }}
                className={`w-10 h-10 rounded-lg font-medium transition-all ${
                  isCurrent
                    ? 'bg-brand-blue text-white'
                    : isAnswered
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}


