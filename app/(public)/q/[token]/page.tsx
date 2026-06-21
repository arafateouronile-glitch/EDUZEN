'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Star, CheckCircle, Loader2, AlertCircle, ClipboardList, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  id: string
  question_text: string
  question_type: string // 'rating' | 'text' | 'choice' | 'boolean'
  options: string[] | null
  order_index: number
  points: number | null
}

interface QuestionnaireData {
  student_name: string
  session_name: string
  assessment_type: string
  submitted_at: string | null
  template: { id: string; name: string; description: string | null }
  questions: Question[]
}

type Answers = Record<string, { rating?: number; text?: string; choice?: string[] }>

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className="p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <Star
            className={cn(
              'h-8 w-8 transition-colors',
              n <= (hovered ?? value ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
            )}
          />
        </button>
      ))}
      {value && (
        <span className="ml-2 self-center text-sm text-slate-500">{value}/5</span>
      )}
    </div>
  )
}

// ── Type label ────────────────────────────────────────────────────────────────

function typeLabel(type: string) {
  const map: Record<string, string> = {
    hot: 'à chaud', cold: 'à froid', pre_formation: 'pré-formation',
    manager: 'manager', instructor: 'formateur', funder: 'financeur',
  }
  return map[type] ?? type
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function QuestionnairePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<QuestionnaireData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/q/${token}`)
      .then(r => r.json())
      .then((d: QuestionnaireData & { error?: string }) => {
        if (d.error) { setError(d.error); return }
        setData(d)
        if (d.submitted_at) setSubmitted(true)
      })
      .catch(() => setError('Impossible de charger le questionnaire.'))
      .finally(() => setLoading(false))
  }, [token])

  const setAnswer = useCallback((questionId: string, value: Partial<Answers[string]>) => {
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], ...value } }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/q/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // ── Render error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Lien invalide</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  // ── Render submitted / merci ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Merci !</h1>
          <p className="text-slate-500">
            Vos réponses ont bien été enregistrées.
            {data && (
              <> Votre avis sur la session <strong>{data.session_name}</strong> contribue à l&apos;amélioration continue de notre organisme.</>
            )}
          </p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // ── Render form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium uppercase tracking-wide mb-1">
                Questionnaire de satisfaction {typeLabel(data.assessment_type)}
              </p>
              <h1 className="text-xl font-bold text-slate-800 leading-snug">{data.session_name}</h1>
              <p className="text-slate-500 text-sm mt-1">Bonjour {data.student_name}, merci de prendre quelques instants pour évaluer cette formation.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {data.questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Question {idx + 1}
              </p>
              <p className="text-base font-medium text-slate-800 mb-4">{q.question_text}</p>

              {q.question_type === 'rating' && (
                <StarRating
                  value={answers[q.id]?.rating}
                  onChange={v => setAnswer(q.id, { rating: v })}
                />
              )}

              {q.question_type === 'text' && (
                <Textarea
                  placeholder="Votre réponse..."
                  rows={3}
                  value={answers[q.id]?.text ?? ''}
                  onChange={e => setAnswer(q.id, { text: e.target.value })}
                  className="resize-none"
                />
              )}

              {q.question_type === 'choice' && Array.isArray(q.options) && (
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id]?.choice?.includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const prev = answers[q.id]?.choice ?? []
                          const next = selected ? prev.filter(c => c !== opt) : [...prev, opt]
                          setAnswer(q.id, { choice: next })
                        }}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-colors',
                          selected
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        )}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              )}

              {q.question_type === 'boolean' && (
                <div className="flex gap-3">
                  {['Oui', 'Non'].map(opt => {
                    const val = opt === 'Oui'
                    const selected = answers[q.id]?.choice?.includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(q.id, { choice: [opt] })}
                        className={cn(
                          'px-6 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors',
                          selected
                            ? val ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-400 bg-red-50 text-red-600'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        )}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Submit */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold rounded-xl"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <ChevronRight className="h-5 w-5 mr-2" />
              )}
              {submitting ? 'Envoi en cours…' : 'Envoyer mes réponses'}
            </Button>
            <p className="text-xs text-center text-slate-400 mt-3">
              Vos réponses sont anonymes et ne seront utilisées qu&apos;à des fins d&apos;amélioration.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
