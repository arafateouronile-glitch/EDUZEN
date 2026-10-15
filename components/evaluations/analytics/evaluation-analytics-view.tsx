'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssessmentTypeStats, EvaluationAnalytics } from '@/lib/services/evaluation-analytics'
import { QuestionStatsCard, scoreTone } from './question-stats-card'

export interface EvaluationBatchFilter {
  subject?: string | null
  assessment_type?: string | null
  graded_at?: string | null
}

interface EvaluationAnalyticsViewProps {
  sessionId: string
  /** Restreint l'analyse à un lot d'évaluations (bouton « Analyse » de /dashboard/evaluations) */
  batch?: EvaluationBatchFilter
}

function ScoreBar({ score10 }: { score10: number | null }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={cn('h-full rounded-full', scoreTone(score10).bar)}
        style={{ width: `${score10 === null ? 0 : score10 * 10}%` }}
      />
    </div>
  )
}

/** Lignes du résumé : une par rubrique, ou par question notée hors rubrique */
function summaryRows(type: AssessmentTypeStats) {
  const rows: { key: string; label: string; score10: number | null }[] = []
  for (const template of type.templates) {
    for (const section of template.sections) {
      if (section.name) {
        if (section.score10 !== null) rows.push({ key: `${template.templateId}-${section.name}`, label: section.name, score10: section.score10 })
      } else {
        for (const q of section.questions) {
          if (q.score10 !== null) rows.push({ key: q.questionId, label: q.text, score10: q.score10 })
        }
      }
    }
  }
  return rows
}

function typeAnchor(type: string) {
  return `suivi-qualite-${type}`
}

export function EvaluationAnalyticsView({ sessionId, batch }: EvaluationAnalyticsViewProps) {
  const params = new URLSearchParams()
  if (batch?.subject) params.set('subject', batch.subject)
  if (batch?.assessment_type) params.set('assessment_type', batch.assessment_type)
  if (batch?.graded_at) params.set('graded_at', batch.graded_at)
  const qs = params.toString()

  const { data, isLoading, error } = useQuery<EvaluationAnalytics>({
    queryKey: ['evaluation-analytics', sessionId, qs],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/evaluation-analytics${qs ? `?${qs}` : ''}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur de chargement')
      return json
    },
    enabled: !!sessionId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement des résultats…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {(error as Error)?.message || 'Impossible de charger les résultats des évaluations.'}
      </div>
    )
  }

  if (data.types.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <BarChart3 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
        <p className="font-semibold text-gray-800">Aucune évaluation pour l&apos;instant</p>
        <p className="text-sm text-gray-500 mt-1">
          Les résultats apparaîtront ici dès que des évaluations avec questionnaire auront été attribuées et remplies.
        </p>
      </div>
    )
  }

  const overallTone = scoreTone(data.overallScore10)

  return (
    <div className="space-y-8">
      {/* Résumé */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-48 shrink-0">
            <p className="flex items-baseline gap-2">
              <span className={cn('text-7xl font-bold tabular-nums tracking-tight', overallTone.text)}>
                {data.overallScore10 === null ? '—' : data.overallScore10.toFixed(1)}
              </span>
              <span className={cn('text-2xl', overallTone.text)}>/ 10</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {data.totalRespondents} réponse{data.totalRespondents > 1 ? 's' : ''} sur {data.totalAssigned} évaluation
              {data.totalAssigned > 1 ? 's' : ''} attribuée{data.totalAssigned > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex-1 min-w-0 space-y-8">
            {data.types.map((type) => {
              const rows = summaryRows(type)
              return (
                <div key={type.assessmentType} className="border-t-2 border-gray-900 pt-3">
                  <a
                    href={`#${typeAnchor(type.assessmentType)}`}
                    className="flex items-start justify-between gap-4 group"
                  >
                    <span className="font-bold uppercase text-sm text-gray-900 group-hover:text-violet-700">
                      {type.label}
                      <span className="ml-2 normal-case font-normal text-xs text-gray-500">
                        {type.respondents}/{type.assigned} réponse{type.respondents > 1 ? 's' : ''}
                      </span>
                    </span>
                    <span className="text-lg font-semibold tabular-nums text-gray-900">
                      {type.score10 === null ? '—' : type.score10.toFixed(1)}
                    </span>
                  </a>
                  {rows.length === 0 ? (
                    <p className="text-xs text-gray-400 mt-1">
                      {type.respondents === 0 ? 'Aucune réponse pour l\'instant.' : 'Aucune question notée (réponses libres ou quiz).'}
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2.5">
                      {rows.map((row) => (
                        <div key={row.key}>
                          <p className="text-sm text-gray-800">
                            {row.label}
                            <span className={cn('ml-3 font-semibold tabular-nums', scoreTone(row.score10).text)}>
                              {row.score10?.toFixed(1)}
                            </span>
                          </p>
                          <ScoreBar score10={row.score10} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Détail par type d'évaluation */}
      {data.types.map((type) => (
        <section key={type.assessmentType} id={typeAnchor(type.assessmentType)} className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-semibold uppercase text-violet-700">{type.label}</h2>
          {type.templates.length === 0 && (
            <p className="text-sm text-gray-500">Ces évaluations n&apos;ont pas de questionnaire associé.</p>
          )}
          {type.templates.map((template) => (
            <div key={template.templateId} className="space-y-4">
              {type.templates.length > 1 && (
                <p className="text-sm font-semibold text-gray-700">
                  {template.name} · {template.respondents} réponse{template.respondents > 1 ? 's' : ''}
                </p>
              )}
              {template.sections.map((section) =>
                section.name ? (
                  <div key={section.name} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">{section.name}</h3>
                      {section.score10 !== null && (
                        <div className="flex items-center gap-3 w-full sm:w-64">
                          <ScoreBar score10={section.score10} />
                          <span className={cn('font-semibold tabular-nums whitespace-nowrap', scoreTone(section.score10).text)}>
                            {section.score10.toFixed(1)}
                            <span className="text-xs text-gray-400 font-normal"> / 10</span>
                          </span>
                        </div>
                      )}
                    </div>
                    {section.questions.map((q) => (
                      <QuestionStatsCard key={q.questionId} stats={q} />
                    ))}
                  </div>
                ) : (
                  <div key="__no_section" className="space-y-3">
                    {section.questions.map((q) => (
                      <QuestionStatsCard key={q.questionId} stats={q} />
                    ))}
                  </div>
                )
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
