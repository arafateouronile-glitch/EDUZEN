'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, Clock, RotateCcw, Trophy, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuizContent, QuizQuestion, QuizAttemptAnswer, QuizAttempt } from '@/lib/types/quiz.types'

interface QuizPlayerProps {
  lessonId: string
  content: QuizContent
  studentId: string
  organizationId: string
  previousAttempts: QuizAttempt[]
  onComplete?: (passed: boolean, score: number) => void
}

type Phase = 'intro' | 'playing' | 'results'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function scoreAttempt(questions: QuizQuestion[], answers: QuizAttemptAnswer): { score: number; total: number; correct: number } {
  let score = 0
  let total = 0
  let correct = 0
  for (const q of questions) {
    total += q.points
    const ans = answers[q.id]
    if (q.type === 'true_false') {
      if (ans === q.correct) { score += q.points; correct++ }
    } else if (q.type === 'mcq' && q.options) {
      const correctOpt = q.options.find(o => o.correct)
      if (correctOpt && ans === correctOpt.id) { score += q.points; correct++ }
    }
  }
  return { score, total, correct }
}

export function QuizPlayer({
  lessonId, content, studentId, organizationId, previousAttempts, onComplete,
}: QuizPlayerProps) {
  const { settings, questions: rawQuestions } = content
  const [phase, setPhase] = useState<Phase>(previousAttempts.length > 0 ? 'results' : 'intro')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<QuizAttemptAnswer>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [startedAt] = useState(() => Date.now())
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(
    previousAttempts.length > 0 ? previousAttempts[previousAttempts.length - 1] : null
  )
  const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>(previousAttempts)

  const maxAttempts = settings.max_attempts
  const canRetake = maxAttempts === 0 || allAttempts.length < maxAttempts
  const bestAttempt = allAttempts.reduce<QuizAttempt | null>((best, a) => {
    if (!best) return a
    return (a.score_percentage ?? 0) > (best.score_percentage ?? 0) ? a : best
  }, null)

  const startQuiz = useCallback(() => {
    const qs = settings.shuffle_questions ? shuffle(rawQuestions) : rawQuestions
    setQuestions(qs)
    setAnswers({})
    setSubmitted(false)
    setPhase('playing')
  }, [rawQuestions, settings.shuffle_questions])

  const submitQuiz = useCallback(async () => {
    if (saving) return
    setSaving(true)
    const { score, total } = scoreAttempt(questions, answers)
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    const passed = pct >= settings.pass_threshold
    const timeSpent = Math.round((Date.now() - startedAt) / 1000)
    const attemptNumber = allAttempts.length + 1

    try {
      const res = await fetch('/api/elearning/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          student_id: studentId,
          organization_id: organizationId,
          attempt_number: attemptNumber,
          answers,
          score_percentage: pct,
          passed,
          time_spent_seconds: timeSpent,
          completed_at: new Date().toISOString(),
        }),
      })
      const json = await res.json()
      const attempt: QuizAttempt = json.attempt ?? {
        id: crypto.randomUUID(), lesson_id: lessonId, student_id: studentId,
        attempt_number: attemptNumber, answers, score_percentage: pct,
        passed, completed_at: new Date().toISOString(), created_at: new Date().toISOString(),
      }
      setLastAttempt(attempt)
      setAllAttempts(prev => [...prev, attempt])
      setSubmitted(true)
      setPhase('results')
      onComplete?.(passed, pct)
    } catch {
      // afficher quand même les résultats localement
      const attempt: QuizAttempt = {
        id: crypto.randomUUID(), lesson_id: lessonId, student_id: studentId,
        attempt_number: attemptNumber, answers, score_percentage: pct,
        passed, completed_at: new Date().toISOString(), created_at: new Date().toISOString(),
      }
      setLastAttempt(attempt)
      setAllAttempts(prev => [...prev, attempt])
      setSubmitted(true)
      setPhase('results')
      onComplete?.(passed, pct)
    } finally {
      setSaving(false)
    }
  }, [answers, questions, settings, allAttempts, lessonId, studentId, organizationId, saving, startedAt, onComplete])

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === questions.length

  // ── INTRO ──────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="p-4 bg-brand-blue/10 rounded-2xl mb-4">
          <Trophy className="h-10 w-10 text-brand-blue" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Quiz</h3>
        <div className="text-sm text-gray-500 space-y-1 mb-6">
          <p>{rawQuestions.length} question{rawQuestions.length !== 1 ? 's' : ''}</p>
          <p>Seuil de réussite : <strong>{settings.pass_threshold}%</strong></p>
          {maxAttempts > 0 && <p>Tentatives : <strong>{maxAttempts}</strong></p>}
          {settings.time_limit_minutes && <p>Durée : <strong>{settings.time_limit_minutes} min</strong></p>}
        </div>
        <button
          type="button"
          onClick={startQuiz}
          className="bg-brand-blue text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-blue/90 transition-colors"
        >
          Commencer le quiz
        </button>
      </div>
    )
  }

  // ── PLAYING ────────────────────────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-brand-blue h-1.5 rounded-full transition-all"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{answeredCount}/{questions.length}</span>
        </div>

        {/* Questions */}
        {questions.map((q, idx) => {
          const ans = answers[q.id]
          return (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <p className="text-sm font-medium text-gray-900 leading-relaxed">{q.question}</p>
              </div>

              {q.type === 'true_false' && (
                <div className="flex gap-3 ml-10">
                  {([true, false] as const).map(val => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: val }))}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                        ans === val
                          ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {val ? 'Vrai' : 'Faux'}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'mcq' && q.options && (
                <div className="space-y-2 ml-10">
                  {q.options.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.id }))}
                      className={cn(
                        'w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm transition-all',
                        ans === opt.id
                          ? 'border-brand-blue bg-brand-blue/10 text-brand-blue font-medium'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      )}
                    >
                      {opt.text || <span className="text-gray-400 italic">Option vide</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            {!allAnswered && `${questions.length - answeredCount} réponse${questions.length - answeredCount > 1 ? 's' : ''} manquante${questions.length - answeredCount > 1 ? 's' : ''}`}
          </p>
          <button
            type="button"
            onClick={submitQuiz}
            disabled={!allAnswered || saving}
            className="bg-brand-blue text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Envoi…' : 'Soumettre'}
          </button>
        </div>
      </div>
    )
  }

  // ── RESULTS ────────────────────────────────────────────────────────
  const displayAttempt = lastAttempt ?? bestAttempt
  const score = displayAttempt?.score_percentage ?? 0
  const passed = displayAttempt?.passed ?? false

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div className={cn(
        'rounded-2xl p-6 text-center',
        passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      )}>
        <div className="flex justify-center mb-3">
          {passed
            ? <CheckCircle2 className="h-12 w-12 text-green-500" />
            : <XCircle className="h-12 w-12 text-red-400" />
          }
        </div>
        <p className="text-3xl font-bold mb-1" style={{ color: passed ? '#16a34a' : '#ef4444' }}>
          {Math.round(score)}%
        </p>
        <p className={cn('text-sm font-semibold', passed ? 'text-green-700' : 'text-red-600')}>
          {passed ? '🎉 Réussi !' : `Échec — seuil requis : ${settings.pass_threshold}%`}
        </p>
        {allAttempts.length > 1 && (
          <p className="text-xs text-gray-500 mt-1">Tentative {allAttempts.length}/{maxAttempts > 0 ? maxAttempts : '∞'}</p>
        )}
      </div>

      {/* Correction */}
      {settings.show_correct_answers && submitted && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Correction</h4>
          {questions.map((q, idx) => {
            const userAns = displayAttempt?.answers[q.id]
            let isCorrect = false
            let correctLabel = ''
            if (q.type === 'true_false') {
              isCorrect = userAns === q.correct
              correctLabel = q.correct ? 'Vrai' : 'Faux'
            } else if (q.type === 'mcq' && q.options) {
              const correctOpt = q.options.find(o => o.correct)
              isCorrect = userAns === correctOpt?.id
              correctLabel = correctOpt?.text ?? ''
            }
            return (
              <div key={q.id} className={cn(
                'rounded-xl border p-4',
                isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              )}>
                <div className="flex items-start gap-2">
                  {isCorrect
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{idx + 1}. {q.question}</p>
                    {!isCorrect && (
                      <p className="text-xs text-green-700 mt-1">
                        Bonne réponse : <strong>{correctLabel}</strong>
                      </p>
                    )}
                    {q.explanation && (
                      <p className="text-xs text-gray-500 mt-1 italic">{q.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Retake */}
      {canRetake && !passed && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={startQuiz}
            className="flex items-center gap-2 text-sm text-brand-blue hover:underline"
          >
            <RotateCcw className="h-4 w-4" />
            Réessayer
            {maxAttempts > 0 && (
              <span className="text-gray-400">({maxAttempts - allAttempts.length} restante{maxAttempts - allAttempts.length > 1 ? 's' : ''})</span>
            )}
          </button>
        </div>
      )}
      {!canRetake && !passed && (
        <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
          <AlertCircle className="h-4 w-4" />
          Nombre maximum de tentatives atteint
        </div>
      )}
    </div>
  )
}
