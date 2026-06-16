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
  Calendar,
  FileText,
  Star,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

interface Question {
  id: string
  question: string
  type: 'multiple_choice' | 'true_false' | 'text' | 'short_answer' | 'essay' | 'numeric' | 'rating'
  options?: string[]
  correct_answer: string | string[]
  points: number
  explanation?: string
}

/** Grade enrichi avec template, instance et session (requêtes jointes / manuelles) */
type GradeEnriched = {
  id: string
  student_id?: string
  subject?: string
  template_id?: string
  evaluation_instance_id?: string
  evaluation_template?: { id: string; name?: string; description?: string; passing_score?: number; questions?: Question[] }
  sessions?: { name?: string }
  assessment_type?: string
  feedback?: string
  [key: string]: unknown
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
    answers: Record<string, { correct: boolean; correctAnswer: string | string[]; rating?: number }>
    isSatisfaction?: boolean
    avgRating?: number
  } | null>(null)
  /** Mode quiz pour une évaluation (grade) avec modèle : l'apprenant passe le quiz */
  const [gradeQuizMode, setGradeQuizMode] = useState(false)
  /** Mode entraînement : feedback immédiat après chaque réponse */
  const [immediateFeedback, setImmediateFeedback] = useState(false)
  /** ID de la question dont le feedback est actuellement affiché */
  const [feedbackQuestionId, setFeedbackQuestionId] = useState<string | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Fallback: si quiz non trouvé, vérifier si c'est un grade (évaluation)
  const { data: grade, isLoading: isLoadingGrade } = useQuery({
    queryKey: ['learner-grade', quizId],
    queryFn: async () => {
      if (!supabase) {
        logger.warn('[Learner Grade] Pas de supabase client')
        return null
      }
      
      logger.info('[Learner Grade] Tentative de récupération du grade', { quizId, studentId: studentData?.id })
      
      // Essayer d'abord sans relations pour éviter les problèmes RLS
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('id', quizId)
        .maybeSingle()
      
      if (error) {
        logger.error('[Learner Grade] Erreur lors de la récupération du grade', { 
          error: sanitizeError(error),
          quizId,
          errorCode: error.code,
          errorMessage: error.message 
        })
        
        if (error.code === 'PGRST116' || error.code === 'PGRST301') {
          return null
        }
        // Ne pas throw l'erreur, retourner null pour permettre l'affichage du message d'erreur approprié
        return null
      }
      
      if (!data) {
        logger.warn('[Learner Grade] Aucun grade trouvé', { quizId })
        return null
      }
      
      logger.info('[Learner Grade] Grade récupéré avec succès', { 
        gradeId: data.id,
        studentId: data.student_id,
        subject: data.subject,
        templateId: (data as GradeEnriched).template_id
      })
      
      // Si on a un session_id, essayer de récupérer les infos de session séparément
      if (data.session_id) {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('name')
          .eq('id', data.session_id)
          .maybeSingle()
        
        if (sessionData) {
          (data as { sessions?: unknown }).sessions = sessionData
        }
      }
      
      // Récupérer l'instance (id + template_id) pour lier le quiz et enregistrer les réponses
      const { data: instanceData, error: instanceError } = await supabase
        .from('evaluation_template_instances')
        .select('id, template_id')
        .eq('grade_id', data.id)
        .maybeSingle()
      
      // Logger les erreurs d'instance si nécessaire
      if (instanceError && instanceError.code !== 'PGRST116' && instanceError.code !== 'PGRST301') {
        logger.warn('[Learner Grade] Erreur lors de la récupération de l\'instance', { 
          error: sanitizeError(instanceError),
          gradeId: data.id,
          errorCode: instanceError.code,
          errorMessage: instanceError.message
        })
      }
      
      const templateId = instanceData?.template_id || (data as GradeEnriched).template_id
      
      if (templateId) {
        logger.info('[Learner Grade] Récupération du modèle d\'évaluation', { 
          templateId,
          fromInstance: !!instanceData,
          fromGrade: !!(data as GradeEnriched).template_id
        })
        
        // Récupérer le modèle
        const { data: templateData, error: templateError } = await supabase
          .from('evaluation_templates')
          .select('*')
          .eq('id', templateId)
          .maybeSingle()
        
        if (!templateError && templateData) {
          // Récupérer les questions du modèle
          const { data: questionsData, error: questionsError } = await supabase
            .from('evaluation_template_questions')
            .select('*')
            .eq('template_id', templateId)
            .order('order_index', { ascending: true })
          
          if (questionsError) {
            logger.warn('[Learner Grade] Erreur lors de la récupération des questions', { 
              error: sanitizeError(questionsError),
              templateId,
              errorCode: questionsError.code,
              errorMessage: questionsError.message
            })
          } else if (questionsData) {
            (templateData as { questions?: unknown }).questions = questionsData
          }
          
          (data as GradeEnriched).evaluation_template = templateData as GradeEnriched['evaluation_template']
          if (instanceData?.id) (data as GradeEnriched).evaluation_instance_id = instanceData.id
          logger.info('[Learner Grade] Modèle d\'évaluation récupéré', { 
            templateId: templateData.id,
            templateName: templateData.name,
            questionsCount: questionsData?.length || 0,
            hasDescription: !!templateData.description,
            descriptionLength: templateData.description?.length || 0,
            descriptionPreview: templateData.description?.substring(0, 100) || 'aucune'
          })
        } else if (templateError) {
          logger.warn('[Learner Grade] Erreur lors de la récupération du modèle', { 
            error: sanitizeError(templateError),
            templateId,
            errorCode: templateError.code,
            errorMessage: templateError.message
          })
        }
      } else {
        // Aucun template_id trouvé
        logger.info('[Learner Grade] Aucun template_id trouvé pour ce grade', { 
          gradeId: data.id,
          hasInstance: !!instanceData,
          instanceTemplateId: instanceData?.template_id,
          gradeTemplateId: (data as GradeEnriched).template_id
        })
      }
      
      return data
    },
    enabled: !!quizId && !!supabase && !isLoadingQuiz && !quiz,
  })

  // Récupérer les réponses de l'étudiant pour cette évaluation si elle a un template avec instance
  const { data: evaluationResponses } = useQuery({
    queryKey: ['learner-evaluation-responses', quizId, studentId],
    queryFn: async () => {
      if (!supabase || !studentId || !grade) return null
      const instanceId = (grade as GradeEnriched).evaluation_instance_id
      if (instanceId) {
        const { data: responses, error: responsesError } = await supabase
          .from('evaluation_responses')
          .select('*')
          .eq('instance_id', instanceId)
          .eq('student_id', studentId)
        if (responsesError) {
          logger.warn('[Learner Evaluation] Erreur récupération réponses', { error: sanitizeError(responsesError) })
          return null
        }
        return responses || []
      }
      // Fallback : récupérer l'instance par grade_id
      const { data: instance, error: instanceError } = await supabase
        .from('evaluation_template_instances')
        .select('id')
        .eq('grade_id', quizId)
        .maybeSingle()
      if (instanceError || !instance) return null
      const { data: responses, error: responsesError } = await supabase
        .from('evaluation_responses')
        .select('*')
        .eq('instance_id', instance.id)
        .eq('student_id', studentId)
      if (responsesError) return null
      return responses || []
    },
    enabled: !!quizId && !!supabase && !!studentId && !!grade && !isLoadingGrade,
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
    enabled: !!quizId && !!supabase && !isLoadingQuiz && !quiz && !isLoadingGrade && !grade,
  })

  const isLoading = isLoadingQuiz || isLoadingLessonFallback || isLoadingGrade
  
  // Déterminer si on doit afficher une erreur (seulement si toutes les requêtes sont terminées et qu'aucune donnée n'a été trouvée)
  const shouldShowError = !isLoading && !quiz && !lessonQuizFallback && !grade

  // Mapper les questions DB -> format UI (quiz, lesson fallback, ou évaluation grade avec modèle)
  const mapQuestionToUI = (q: any) => {
    // Normaliser le type : question_type depuis DB ou type depuis quiz
    let type = (q.question_type || q.type || 'multiple_choice') as Question['type']
    
    // Debug : log du type brut pour comprendre
    if (q.question_type && q.question_type !== type) {
      logger.debug('[Learner Quiz] Type question mappé', {
        raw: q.question_type,
        mapped: type,
        questionId: q.id,
      })
    }
    
    // S'assurer que 'rating' est bien reconnu (peut être stocké différemment)
    if (type === 'rating' || q.question_type === 'rating' || String(q.question_type).toLowerCase() === 'rating') {
      type = 'rating'
    }
    
    const question = q.question_text || q.question || ''
    const explanation = q.explanation || undefined
    const points = q.points || 1
    let options: string[] | undefined
    let correct_answer: string | string[] = q.correct_answer

    if (type === 'multiple_choice') {
      const rawOptions = q.options
      if (Array.isArray(rawOptions)) {
        if (rawOptions.length && typeof rawOptions[0] === 'object') {
          options = rawOptions.map((o: any) => String(o?.text ?? '')).filter(Boolean)
          const correct = rawOptions
            .filter((o: any) => o?.is_correct)
            .map((o: any) => String(o?.text ?? ''))
            .filter(Boolean)
          if (correct.length === 1) correct_answer = correct[0]
          if (correct.length > 1) correct_answer = correct
        } else {
          options = rawOptions.map((o: any) => String(o)).filter(Boolean)
        }
      }
    }

    if (type === 'true_false') {
      const ca = String(correct_answer ?? '').toLowerCase()
      if (['true', 'vrai', '1', 't', 'yes', 'oui'].includes(ca)) correct_answer = 'vrai'
      if (['false', 'faux', '0', 'f', 'no', 'non'].includes(ca)) correct_answer = 'faux'
    }

    // Pour rating et essay, pas de correct_answer nécessaire
    if (type === 'rating' || type === 'essay') {
      correct_answer = ''
    } else if (correct_answer == null) {
      correct_answer = ''
    }

    return {
      id: q.id,
      question,
      type,
      options,
      correct_answer,
      points,
      explanation,
    }
  }

  /** Évaluations satisfaction (pré/post formation) : uniquement étoiles + expression libre */
  const isSatisfactionEvaluation = !!grade && ['pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder'].includes((grade as GradeEnriched).assessment_type || '')

  const questions: Question[] = (() => {
    if (quiz) {
      return (
        (quiz?.quiz_questions || [])
          .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
          .map(mapQuestionToUI)
          .filter((q: any) => q?.id) || []
      )
    }
    if (lessonQuizFallback?.questions) return lessonQuizFallback.questions
    const templateQuestions =
      gradeQuizMode && (grade as GradeEnriched)?.evaluation_template?.questions
        ? (grade as GradeEnriched).evaluation_template!.questions
        : null
    if (templateQuestions) {
      const mapped = templateQuestions
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        .map(mapQuestionToUI)
        .filter((q: any) => q?.id) || []
      
      // Debug : log des questions mappées
      if (isSatisfactionEvaluation) {
        logger.info('[Learner Quiz] Questions mappées (satisfaction)', {
          totalQuestions: mapped.length,
          questions: mapped.map((q: Question) => ({
            id: q.id,
            type: q.type,
            question: q.question?.substring(0, 50),
          })),
          rawTypes: templateQuestions.map((q: any) => ({
            id: q.id,
            question_type: q.question_type,
            type: q.type,
          })),
          assessmentType: (grade as GradeEnriched)?.assessment_type,
        })
      }
      
      // Pour satisfaction : on garde TOUTES les questions mais on les affichera avec des étoiles
      // (sauf essay qui reste en texte libre)
      // Ne pas filtrer ici car le type peut ne pas être correctement mappé depuis la DB
      return mapped
      return mapped
    }
    return []
  })()

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleSubmit stable ref, timer only depends on timeLeft/showResults
  }, [timeLeft, showResults])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Nettoyage du timer feedback au démontage
  useEffect(() => {
    return () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).length

  // Debug : vérifier le type de question pour satisfaction
  useEffect(() => {
    if (isSatisfactionEvaluation && currentQuestion) {
      logger.info('[Learner Quiz] Question satisfaction', {
        questionId: currentQuestion.id,
        questionType: currentQuestion.type,
        questionText: currentQuestion.question?.substring(0, 50),
        isRating: currentQuestion.type === 'rating',
        isEssay: currentQuestion.type === 'essay',
      })
    }
  }, [currentQuestion, isSatisfactionEvaluation])

  // En mode quiz (grade) : la question courante est-elle répondue ? (pour désactiver "Suivant" et navigation linéaire)
  const hasCurrentAnswer = useMemo(() => {
    if (!currentQuestion) return false
    const a = answers[currentQuestion.id]
    if (a === undefined) return false
    if (currentQuestion.type === 'rating') return a !== '' && a !== undefined && Number(a) >= 0 && Number(a) <= 5
    if (Array.isArray(a)) return a.length > 0
    return String(a).trim() !== ''
  }, [currentQuestion, answers])

  // En mode quiz grade : index max atteignable = on ne peut aller qu'aux questions déjà atteintes (pas de saut en avant)
  const isGradeQuizLinear = !!grade && !quiz && !lessonQuizFallback && gradeQuizMode
  const canNavigateToQuestion = useCallback(
    (index: number) => {
      if (!isGradeQuizLinear) return true
      return index <= currentQuestionIndex
    },
    [isGradeQuizLinear, currentQuestionIndex]
  )

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    if (immediateFeedback && !isSatisfactionEvaluation) {
      setFeedbackQuestionId(questionId)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = setTimeout(() => {
        setFeedbackQuestionId(null)
        setCurrentQuestionIndex((prev) => Math.min(prev + 1, totalQuestions - 1))
      }, 1800)
    }
  }

  const selectOption = useCallback(
    (questionId: string, option: string, isMulti: boolean) => {
      if (!questionId) return
      if (feedbackQuestionId === questionId) return // locked while showing feedback
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feedbackQuestionId, setAnswers]
  )

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const instanceId = grade && (grade as GradeEnriched).evaluation_instance_id

      // Soumission pour une évaluation (grade) avec modèle : enregistrer dans evaluation_responses
      if (gradeQuizMode && instanceId && studentId && supabase && questions.length > 0) {
        const isSatisfactionSubmit = !!grade && ['pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder'].includes((grade as GradeEnriched).assessment_type || '')
        /** Valeurs d'étoiles envoyées au backend (pour afficher la moyenne même si l'API ne renvoie pas answer_rating) */
        const submittedStarValues: number[] = []
        const submittedRatingByQuestionId: Record<string, number> = {}
        for (const q of questions) {
          const userAnswer = answers[q.id]
          const payload: {
            answer_text?: string
            answer_choice?: string[]
            answer_boolean?: boolean
            answer_rating?: number
          } = {}
          const starValue = userAnswer != null && userAnswer !== '' ? parseInt(String(userAnswer), 10) : null
          const isStarAnswer = starValue != null && !Number.isNaN(starValue) && starValue >= 0 && starValue <= 5
          // Évaluation satisfaction : question expression libre → answer_text ; toute autre question avec valeur 0-5 → answer_rating
          if (isSatisfactionSubmit) {
            if (q.type === 'essay') {
              payload.answer_text = userAnswer != null ? String(userAnswer) : ''
            } else if (isStarAnswer) {
              payload.answer_rating = starValue
              submittedStarValues.push(starValue)
              submittedRatingByQuestionId[q.id] = starValue
            } else {
              payload.answer_rating = undefined
            }
          } else if (q.type === 'multiple_choice') {
            payload.answer_choice = Array.isArray(userAnswer) ? userAnswer : userAnswer ? [userAnswer] : []
          } else if (q.type === 'true_false') {
            payload.answer_boolean = userAnswer === 'vrai' || userAnswer === 'true' || userAnswer === '1'
          } else if (q.type === 'rating') {
            payload.answer_rating = isStarAnswer ? starValue : undefined
          } else {
            payload.answer_text = userAnswer != null ? String(userAnswer) : ''
          }
          const { error } = await supabase.from('evaluation_responses').upsert({
            instance_id: instanceId,
            question_id: q.id,
            student_id: studentId,
            ...payload,
          }, { onConflict: 'instance_id,question_id,student_id' })
          if (error) throw error
        }
        const { error: rpcCorrectError } = await supabase.rpc('auto_correct_evaluation_responses', { p_instance_id: instanceId })
        if (rpcCorrectError) logger.warn('[Learner Quiz] auto_correct_evaluation_responses', { error: rpcCorrectError })
        const { error: rpcGradeError } = await (supabase as unknown as { rpc: (fn: string, args: { p_instance_id: string }) => Promise<{ error: unknown }> }).rpc('update_grade_from_instance_for_learner', { p_instance_id: instanceId })
        if (rpcGradeError) logger.warn('[Learner Quiz] update_grade_from_instance_for_learner', { error: rpcGradeError })
        
        // Vérifier si c'est une évaluation satisfaction (pas de score, uniquement étoiles)
        const isSatisfactionType = grade && ['pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder'].includes((grade as GradeEnriched).assessment_type || '')
        
        // Récupérer les réponses avec answer_rating pour les questions rating
        const { data: allResponsesRaw } = await supabase
          .from('evaluation_responses')
          .select('question_id, is_correct, answer_rating')
          .eq('instance_id', instanceId)
          .eq('student_id', studentId)
        const allResponses = ((allResponsesRaw || []) as unknown) as Array<{ question_id: string; is_correct?: boolean; answer_rating?: number | null }>
        
        if (isSatisfactionType) {
          // Moyenne : 1) API, 2) valeurs envoyées dans la boucle (submittedStarValues), 3) answers en secours
          const ratingsFromApi = allResponses
            .map((r: { question_id: string; answer_rating?: number | null }) => r.answer_rating)
            .filter((v): v is number => v != null)
          const ratings = ratingsFromApi.length > 0
            ? ratingsFromApi
            : submittedStarValues.length > 0
              ? submittedStarValues
              : questions
                  .filter((q) => q.type !== 'essay')
                  .map((q) => {
                    const v = answers[q.id]
                    const n = v != null && v !== '' ? parseInt(String(v), 10) : NaN
                    return n >= 0 && n <= 5 && !Number.isNaN(n) ? n : null
                  })
                  .filter((x): x is number => x !== null)
          const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0

          if (ratings.length === 0) {
            logger.warn('[Learner Quiz] Satisfaction: aucune valeur d’étoile pour la moyenne', {
              ratingsFromApi: ratingsFromApi.length,
              submittedStarValues: submittedStarValues.length,
              answersKeys: Object.keys(answers).length,
            })
          }

          const answerResults: Record<string, { correct: boolean; correctAnswer: string | string[]; rating?: number }> = {}
          questions.forEach((q) => {
            const row = allResponses?.find((r: { question_id: string }) => r.question_id === q.id)
            const rating =
              row?.answer_rating != null ? row.answer_rating : submittedRatingByQuestionId[q.id] ?? (q.type !== 'essay' && answers[q.id] != null && answers[q.id] !== '' ? parseInt(String(answers[q.id]), 10) : undefined)
            answerResults[q.id] = {
              correct: true,
              correctAnswer: '',
              rating: rating !== undefined && !Number.isNaN(rating) ? rating : undefined,
            }
          })
          
          setResults({
            score: avgRating * 20, // Convertir en pourcentage pour compatibilité (0-5 -> 0-100)
            total: 5,
            passed: true, // Satisfaction : toujours "réussi" (pas de notion d'échec)
            answers: answerResults,
            isSatisfaction: true,
            avgRating: avgRating,
          })
          setShowResults(true)
          queryClient.invalidateQueries({ queryKey: ['learner-grade', quizId] })
          queryClient.invalidateQueries({ queryKey: ['learner-evaluation-responses', quizId, studentId] })
          addToast({
            type: 'success',
            title: 'Évaluation enregistrée',
            description: `Votre satisfaction : ${avgRating.toFixed(1)}/5.`,
          })
        } else {
          // Évaluation notée classique
          const { data: scoreRow } = await supabase.rpc('calculate_evaluation_score', { p_instance_id: instanceId })
          const totalScore = scoreRow?.[0]?.total_score ?? 0
          const maxScore = scoreRow?.[0]?.max_score ?? 1
          const percentage = maxScore > 0 ? Math.round((Number(totalScore) / Number(maxScore)) * 100) : 0
          const answerResults: Record<string, { correct: boolean; correctAnswer: string | string[] }> = {}
          questions.forEach((q) => {
            const row = allResponses.find((r) => r.question_id === q.id)
            answerResults[q.id] = {
              correct: row?.is_correct === true,
              correctAnswer: q.correct_answer,
            }
          })
          setResults({
            score: percentage,
            total: Number(maxScore),
            passed: percentage >= ((grade as GradeEnriched)?.evaluation_template?.passing_score ?? 70),
            answers: answerResults,
            isSatisfaction: false,
          })
          setShowResults(true)
          queryClient.invalidateQueries({ queryKey: ['learner-grade', quizId] })
          queryClient.invalidateQueries({ queryKey: ['learner-evaluation-responses', quizId, studentId] })
          addToast({
            type: 'success',
            title: 'Évaluation enregistrée',
            description: `Votre score : ${percentage}%.`,
          })
        }
        setIsSubmitting(false)
        return
      }

      // Quiz classique (lesson ou autre)
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

      if (studentId && supabase) {
        try {
          await (supabase as unknown as { from: (table: string) => { insert: (values: object) => Promise<{ error: unknown }> } })
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
          // Table potentiellement absente
        }
      }

      setResults({
        score,
        total: totalPoints,
        passed,
        answers: answerResults,
        isSatisfaction: false,
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
        description: (error as Error)?.message || 'Impossible de soumettre le quiz.',
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
          <p className="text-gray-500">Chargement de l'évaluation...</p>
        </div>
      </div>
    )
  }

  // Afficher l'erreur seulement si toutes les requêtes sont terminées et qu'aucune donnée n'a été trouvée
  if (shouldShowError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Évaluation introuvable</h2>
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

  // Afficher les détails du grade (évaluation) si c'est un grade, pas un quiz, et pas encore en mode "passer le quiz"
  if (grade && !quiz && !lessonQuizFallback && !gradeQuizMode) {
    const isSatisfactionType = ['pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder'].includes(grade.assessment_type || '')
    const hasGradedAt = grade.graded_at !== null && grade.graded_at !== undefined
    const hasScore = grade.score !== null && grade.score !== undefined
    const hasRating = grade.rating !== null && grade.rating !== undefined
    // Pour satisfaction : afficher la moyenne depuis les réponses si grade.rating est 0 ou null
    const satisfactionRatingsFromResponses = ((evaluationResponses || []) as Array<{ answer_rating?: number | null }>)
      .map((r) => r.answer_rating)
      .filter((v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 5)
    const displayRating: number | null = isSatisfactionType && satisfactionRatingsFromResponses.length > 0
      ? Math.round((satisfactionRatingsFromResponses.reduce((a, b) => a + b, 0) / satisfactionRatingsFromResponses.length) * 10) / 10
      : (grade.rating != null ? grade.rating : null)
    // Satisfaction : terminée si grade.rating renseigné ou réponses avec answer_rating présentes
    const isCompleted = isSatisfactionType ? (hasRating || satisfactionRatingsFromResponses.length > 0) : (hasScore && hasGradedAt)
    
    const percentage = grade.percentage !== null && grade.percentage !== undefined 
      ? grade.percentage 
      : (hasScore && grade.max_score ? Math.round(((grade.score ?? 0) / grade.max_score) * 100) : null)
    
    // Vérifier si l'évaluation a un modèle avec des questions
    const evaluationTemplate = (grade as GradeEnriched).evaluation_template
    const hasQuestions = evaluationTemplate?.questions && Array.isArray(evaluationTemplate.questions) && evaluationTemplate.questions.length > 0
    const hasResponses = evaluationResponses && evaluationResponses.length > 0
    const canComplete = hasQuestions && !isCompleted && !hasResponses
    
    // Log pour déboguer
    logger.info('[Learner Evaluation Display] État de l\'évaluation', {
      hasTemplate: !!evaluationTemplate,
      templateId: evaluationTemplate?.id,
      templateName: evaluationTemplate?.name,
      hasDescription: !!evaluationTemplate?.description,
      descriptionLength: evaluationTemplate?.description?.length || 0,
      descriptionPreview: evaluationTemplate?.description?.substring(0, 100) || 'aucune',
      hasQuestions,
      questionsCount: evaluationTemplate?.questions?.length || 0,
      hasResponses,
      isCompleted,
      canComplete
    })

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/learner/evaluations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux évaluations
            </Button>
          </Link>
        </div>

        {/* Détails de l'évaluation */}
        <GlassCard className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{grade.subject || 'Évaluation'}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {(grade as GradeEnriched).sessions?.name && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {(grade as GradeEnriched).sessions!.name}
                  </span>
                )}
                {grade.assessment_type && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
                    {grade.assessment_type}
                  </Badge>
                )}
                {grade.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(grade.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                )}
              </div>
            </div>
            {isCompleted ? (
              isSatisfactionType ? (
                <Badge className="text-base px-4 py-2 bg-amber-100 text-amber-700">
                  Satisfaction {displayRating != null ? displayRating : '—'}/5
                </Badge>
              ) : (
                <Badge className={`text-base px-4 py-2 ${
                  (percentage || 0) >= 80 ? 'bg-green-100 text-green-700' :
                  (percentage || 0) >= 60 ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {percentage !== null ? `${percentage}%` : 'Terminée'}
                </Badge>
              )
            ) : (
              <Badge className="bg-gray-100 text-gray-700 text-base px-4 py-2">
                En attente de correction
              </Badge>
            )}
          </div>

          {/* Score ou satisfaction selon le type */}
          {isCompleted && (
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              {isSatisfactionType ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Satisfaction</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {displayRating != null ? displayRating : (grade.rating ?? '—')} / 5
                    </p>
                  </div>
                  {grade.notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-1">Avis / Commentaire</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{grade.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Note</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {grade.score !== null ? grade.score : '-'}
                      {grade.max_score && ` / ${grade.max_score}`}
                    </p>
                  </div>
                  {percentage !== null && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Pourcentage</p>
                      <p className={`text-2xl font-bold ${
                        percentage >= 80 ? 'text-green-600' :
                        percentage >= 60 ? 'text-blue-600' :
                        'text-red-600'
                      }`}>
                        {percentage}%
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Description et notes : masquées tant que l'apprenant n'a pas commencé (pour ne rien dévoiler) */}
          {!canComplete && (evaluationTemplate?.description || grade.notes) && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {evaluationTemplate?.description ? 'Description de l\'évaluation' : 'Informations sur l\'évaluation'}
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {evaluationTemplate?.description || grade.notes}
                </p>
              </div>
            </div>
          )}

          {/* Questions : masquées tant que l'apprenant n'a pas cliqué sur "Commencer l'évaluation" (ou déjà terminé / réponses envoyées) */}
          {hasQuestions && evaluationTemplate.questions && (isCompleted || hasResponses) && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-4">
                Questions ({evaluationTemplate.questions.length})
              </h3>
              <div className="space-y-4">
                {evaluationTemplate.questions.map((question: any, index: number) => {
                  const showCorrectAnswers = isCompleted || hasResponses
                  return (
                    <div key={question.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-2">{question.question_text}</p>
                          <Badge variant="outline" className="text-xs">
                            {question.question_type === 'multiple_choice' && 'Choix multiple'}
                            {question.question_type === 'true_false' && 'Vrai/Faux'}
                            {question.question_type === 'short_answer' && 'Réponse courte'}
                            {question.question_type === 'essay' && 'Dissertation'}
                            {question.question_type === 'numeric' && 'Numérique'}
                            {question.question_type === 'rating' && 'Étoiles 0-5'}
                          </Badge>
                          {question.points && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({question.points} point{question.points > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                      </div>
                      {question.options && Array.isArray(question.options) && question.options.length > 0 && (
                        <div className="ml-11 space-y-2">
                          {question.options.map((option: any, optIndex: number) => (
                            <div
                              key={optIndex}
                              className={`p-2 rounded ${
                                showCorrectAnswers && option.is_correct
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {showCorrectAnswers && option.is_correct && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                )}
                                <span
                                  className={`text-sm ${
                                    showCorrectAnswers && option.is_correct
                                      ? 'text-green-900 font-medium'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  {option.text || option}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {showCorrectAnswers && question.explanation && (
                        <div className="mt-3 ml-11 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs font-medium text-blue-900 mb-1">Explication :</p>
                          <p className="text-xs text-blue-700">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes et feedback - seulement si on n'a pas déjà affiché les notes comme description */}
          {grade.notes && evaluationTemplate?.description && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{grade.notes}</p>
              </div>
            </div>
          )}

          {(grade as GradeEnriched).feedback && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Commentaires du formateur</h3>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{(grade as GradeEnriched).feedback}</p>
              </div>
            </div>
          )}

          {/* Date de notation - seulement si l'évaluation est vraiment corrigée */}
          {isCompleted && grade.graded_at && (
            <div className="text-sm text-gray-500">
              Corrigée le {new Date(grade.graded_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
          
          {/* Message si l'évaluation n'est pas encore corrigée */}
          {!isCompleted && (
            <div className="text-sm text-gray-500 italic mb-4">
              Cette évaluation est en attente de correction par le formateur.
            </div>
          )}
          
          {/* Si l'évaluation a un modèle avec des questions, afficher un message pour indiquer qu'elle peut être complétée */}
          {canComplete && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">
                Cette évaluation contient {evaluationTemplate.questions?.length ?? 0} question{(evaluationTemplate.questions?.length ?? 0) > 1 ? 's' : ''} à compléter.
              </p>
              <p className="text-sm text-blue-700 mb-3">
                Cliquez sur le bouton ci-dessous pour lancer le quiz et enregistrer vos réponses.
              </p>
              <Button 
                className="w-full bg-brand-blue hover:bg-brand-blue-dark text-white"
                onClick={() => setGradeQuizMode(true)}
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Commencer l'évaluation
              </Button>
            </div>
          )}
          
          {/* Si l'étudiant a déjà soumis des réponses */}
          {hasResponses && !isCompleted && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900 font-medium mb-2">
                Vous avez déjà soumis vos réponses à cette évaluation.
              </p>
              <p className="text-sm text-yellow-700">
                En attente de correction par le formateur.
              </p>
            </div>
          )}
          
          {/* Message si l'évaluation n'a pas de modèle (évaluation simple) */}
          {!evaluationTemplate && !isCompleted && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                Cette évaluation a été créée sans modèle d'évaluation structuré. 
                {grade.notes && ' Les informations sont disponibles ci-dessus.'}
                {!grade.notes && ' Contactez votre formateur pour plus d\'informations.'}
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    )
  }

  // Écran de résultats
  if (showResults && results) {
    const isSatisfaction = results.isSatisfaction === true
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8">
        <GlassCard className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            {isSatisfaction ? (
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
                <Star className="h-12 w-12 text-amber-600 fill-amber-600" />
              </div>
            ) : results.passed ? (
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
            {isSatisfaction ? 'Merci pour votre retour !' : results.passed ? 'Félicitations !' : 'Quiz terminé'}
          </h1>
          <p className="text-gray-500 mb-6">
            {quiz?.title || (grade as GradeEnriched)?.subject || 'Évaluation'}
          </p>

          {isSatisfaction ? (
            <div className="mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-amber-600 flex items-center justify-center gap-2">
                  {results.avgRating?.toFixed(1) ?? '—'}
                  <Star className="h-8 w-8 fill-amber-500 text-amber-500" />
                  <span className="text-2xl text-gray-400">/5</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Votre satisfaction moyenne</p>
              </div>
            </div>
          ) : (
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
          )}

          {isSatisfaction ? (
            <Badge className="bg-amber-100 text-amber-700 text-base px-4 py-2">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Évaluation enregistrée
            </Badge>
          ) : results.passed ? (
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
              const isRatingQuestion = q.type === 'rating'
              // Pour rating : utiliser answer_rating depuis la réponse enregistrée, sinon depuis answers local
              const userRating = isRatingQuestion
                ? (result?.rating != null ? String(result.rating) : answers[q.id] != null ? String(answers[q.id]) : null)
                : null
              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl ${
                    isRatingQuestion
                      ? 'bg-amber-50 border border-amber-200'
                      : result?.correct
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isRatingQuestion ? (
                      <span className="flex items-center gap-1 font-bold text-amber-600">
                        {userRating ?? '—'}/5
                        <Star className="h-5 w-5 fill-amber-500" />
                      </span>
                    ) : result?.correct ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Question {index + 1}</p>
                      <p className="text-sm text-gray-600 mt-1">{q.question}</p>
                      {!isRatingQuestion && !result?.correct && (
                        <p className="text-sm text-green-600 mt-2">
                          Réponse correcte : {Array.isArray(result?.correctAnswer)
                            ? result?.correctAnswer.join(', ')
                            : result?.correctAnswer}
                        </p>
                      )}
                      {q.explanation && !isRatingQuestion && (
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
          {!results.isSatisfaction && !results.passed && (
            <Button onClick={handleRetry} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          )}
          <Link href="/learner/evaluations" className={results.isSatisfaction || results.passed ? "flex-1" : "flex-1"}>
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Retour aux évaluations
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (totalQuestions === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Aucune question disponible.</p>
        <Link href="/learner/evaluations">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux évaluations
          </Button>
        </Link>
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

      {/* Progress */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {currentQuestionIndex + 1} sur {totalQuestions}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {answeredCount} répondu{answeredCount > 1 ? 'es' : 'e'}
            </span>
            {!isSatisfactionEvaluation && answeredCount === 0 && (
              <button
                type="button"
                onClick={() => setImmediateFeedback((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  immediateFeedback
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                {immediateFeedback ? 'Mode entraînement ✓' : 'Mode entraînement'}
              </button>
            )}
            {immediateFeedback && answeredCount > 0 && (
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
                Entraînement
              </span>
            )}
          </div>
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

            {/* Étoiles 0 à 5 (satisfaction) */}
            {/* Pour satisfaction : afficher les étoiles pour toutes les questions sauf essay */}
            {(currentQuestion?.type === 'rating' || (isSatisfactionEvaluation && currentQuestion?.type !== 'essay')) && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">Choisissez de 0 à 5 étoiles</p>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {[0, 1, 2, 3, 4, 5].map((n) => {
                    const currentAnswer = answers[currentQuestion.id]
                    const isSelected = currentAnswer !== undefined && Number(currentAnswer) === n
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          handleAnswer(currentQuestion.id, String(n))
                        }}
                        className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl transition-all font-medium min-w-[100px] ${
                          isSelected
                            ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400 shadow-md scale-105'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:shadow-sm'
                        }`}
                        title={n === 0 ? 'Aucune étoile' : `${n} étoile${n > 1 ? 's' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          {n === 0 ? (
                            <span className="text-2xl text-gray-400">—</span>
                          ) : (
                            Array.from({ length: n }).map((_, i) => (
                              <Star key={i} className="h-8 w-8 fill-amber-500 text-amber-500" />
                            ))
                          )}
                        </div>
                        <span className="text-sm font-semibold">{n}/5</span>
                      </button>
                    )
                  })}
                </div>
                {answers[currentQuestion.id] !== undefined && (
                  <p className="text-center text-sm text-gray-600 mt-2">
                    Vous avez sélectionné : <strong>{answers[currentQuestion.id]}/5 étoiles</strong>
                  </p>
                )}
              </div>
            )}

            {/* Expression libre : réponse courte, dissertation, numérique, texte */}
            {(currentQuestion?.type === 'text' ||
              currentQuestion?.type === 'short_answer' ||
              currentQuestion?.type === 'essay' ||
              currentQuestion?.type === 'numeric') && (
              <div className="space-y-2">
                <label htmlFor={`answer-${currentQuestion.id}`} className="sr-only">
                  Votre réponse
                </label>
                {currentQuestion.type === 'essay' ? (
                  <textarea
                    id={`answer-${currentQuestion.id}`}
                    value={(answers[currentQuestion.id] as string) ?? ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    placeholder="Rédigez votre réponse..."
                    rows={6}
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-gray-900 placeholder:text-gray-400 resize-y min-h-[120px]"
                  />
                ) : currentQuestion.type === 'numeric' ? (
                  <input
                    id={`answer-${currentQuestion.id}`}
                    type="number"
                    inputMode="decimal"
                    value={(answers[currentQuestion.id] as string) ?? ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    placeholder="Saisissez votre réponse (nombre)"
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                ) : (
                  <input
                    id={`answer-${currentQuestion.id}`}
                    type="text"
                    value={(answers[currentQuestion.id] as string) ?? ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    placeholder="Saisissez votre réponse..."
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                )}
              </div>
            )}

            {/* Feedback immédiat */}
            {immediateFeedback && feedbackQuestionId === currentQuestion?.id && (() => {
              const q = currentQuestion
              const userAnswer = answers[q.id]
              const correctAnswer = q.correct_answer
              const isRating = q.type === 'rating'
              if (isRating || !correctAnswer) return null
              let isCorrect = false
              if (Array.isArray(correctAnswer)) {
                isCorrect = Array.isArray(userAnswer)
                  ? correctAnswer.every((a) => (userAnswer as string[]).includes(a)) && (userAnswer as string[]).length === correctAnswer.length
                  : correctAnswer.includes(userAnswer as string)
              } else {
                isCorrect = userAnswer === correctAnswer
              }
              return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-4 rounded-xl border-2 ${
                    isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isCorrect
                      ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      : <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse'}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-gray-700 mt-0.5">
                          Réponse correcte : <strong>{Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}</strong>
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-sm text-gray-600 mt-1 italic">{q.explanation}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Passage à la question suivante...
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })()}
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
            disabled={isGradeQuizLinear && !hasCurrentAnswer}
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

      {/* Question navigation : en mode quiz grade (linéaire), seules les questions déjà atteintes sont cliquables */}
      <GlassCard className="p-4">
        <p className="text-sm font-medium text-gray-600 mb-3">Navigation rapide</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, index) => {
            const isAnswered = !!answers[q.id]
            const isCurrent = index === currentQuestionIndex
            const reachable = canNavigateToQuestion(index)
            return (
              <button
                key={q.id}
                type="button"
                disabled={!reachable}
                onClick={(e) => {
                  e.preventDefault()
                  if (!reachable) return
                  setCurrentQuestionIndex(index)
                }}
                className={`w-10 h-10 rounded-lg font-medium transition-all ${
                  !reachable
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isCurrent
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


