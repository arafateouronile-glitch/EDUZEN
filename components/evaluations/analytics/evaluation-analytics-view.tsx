'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, FileDown, LayoutList, Loader2, Rows } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  sectionAnchorId,
  type AssessmentTypeStats,
  type EvaluationAnalyticsResponse,
  type EvaluationTrendPoint,
  type TemplateStats,
} from '@/lib/services/evaluation-analytics'
import { QuestionStatsCard, scoreTone } from './question-stats-card'
import { ResponseRateRings } from './response-rate-rings'
import { AttentionPoints } from './attention-points'
import { BeforeAfterChart } from './before-after-chart'
import { StackedDistribution } from './stacked-distribution'

// Recharts chargé uniquement quand un graphique est affiché
const SectionsRadar = dynamic(() => import('./sections-radar'), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> })
const SessionTrendChart = dynamic(() => import('./session-trend-chart'), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> })

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

function radarData(template: TemplateStats) {
  return template.sections
    .filter((s) => s.name && s.score10 !== null)
    .map((s) => ({ name: s.name as string, score10: s.score10 as number }))
}

function typeAnchor(type: string) {
  return `suivi-qualite-${type}`
}

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white p-5', className)}>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

function TemplateDetail({ template, compact, showName }: { template: TemplateStats; compact: boolean; showName: boolean }) {
  const radar = radarData(template)
  const textQuestions = template.sections.flatMap((s) => s.questions).filter((q) => q.kind !== 'rating' && !(q.kind === 'choice' && q.isScale))

  return (
    <div className="space-y-4">
      {showName && (
        <p className="text-sm font-semibold text-gray-700">
          {template.name} · {template.respondents} réponse{template.respondents > 1 ? 's' : ''}
        </p>
      )}

      {radar.length >= 3 && template.respondents > 0 && (
        <Card title="Notes par rubrique" subtitle="Chaque axe va de 0 (centre) à 10 (bord).">
          <SectionsRadar data={radar} />
        </Card>
      )}

      {compact ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <StackedDistribution sections={template.sections} />
          {textQuestions.length > 0 && (
            <p className="text-xs text-gray-500">
              {textQuestions.length} autre{textQuestions.length > 1 ? 's' : ''} question{textQuestions.length > 1 ? 's' : ''} (réponses libres, Oui/Non, quiz) visible{textQuestions.length > 1 ? 's' : ''} en vue détaillée.
            </p>
          )}
        </div>
      ) : (
        template.sections.map((section) =>
          section.name ? (
            <div
              key={section.name}
              id={sectionAnchorId(template.templateId, section.name)}
              className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 space-y-3 scroll-mt-24"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-base font-semibold text-gray-900">{section.name}</h4>
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
        )
      )}
    </div>
  )
}

function TypeDetail({ type }: { type: AssessmentTypeStats }) {
  const [compact, setCompact] = useState(false)
  return (
    <section id={typeAnchor(type.assessmentType)} className="space-y-4 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold uppercase text-violet-700">{type.label}</h2>
        {type.templates.length > 0 && type.respondents > 0 && (
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs" role="group" aria-label="Mode d'affichage">
            <button
              type="button"
              onClick={() => setCompact(true)}
              aria-pressed={compact}
              className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1', compact ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900')}
            >
              <Rows className="h-3.5 w-3.5" /> Vue compacte
            </button>
            <button
              type="button"
              onClick={() => setCompact(false)}
              aria-pressed={!compact}
              className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1', !compact ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900')}
            >
              <LayoutList className="h-3.5 w-3.5" /> Vue détaillée
            </button>
          </div>
        )}
      </div>
      {type.templates.length === 0 && (
        <p className="text-sm text-gray-500">Ces évaluations n&apos;ont pas de questionnaire associé.</p>
      )}
      {type.templates.map((template) => (
        <TemplateDetail key={template.templateId} template={template} compact={compact} showName={type.templates.length > 1} />
      ))}
    </section>
  )
}

export function EvaluationAnalyticsView({ sessionId, batch }: EvaluationAnalyticsViewProps) {
  const params = new URLSearchParams()
  if (batch?.subject) params.set('subject', batch.subject)
  if (batch?.assessment_type) params.set('assessment_type', batch.assessment_type)
  if (batch?.graded_at) params.set('graded_at', batch.graded_at)
  const qs = params.toString()

  const { data, isLoading, error } = useQuery<EvaluationAnalyticsResponse>({
    queryKey: ['evaluation-analytics', sessionId, qs],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/evaluation-analytics${qs ? `?${qs}` : ''}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur de chargement')
      return json
    },
    enabled: !!sessionId,
  })

  // Évolution entre sessions : vue session complète uniquement (pas pour un lot)
  const formationId = !batch ? data?.formationId : null
  const { data: trend } = useQuery<{ points: EvaluationTrendPoint[] }>({
    queryKey: ['evaluation-trend', formationId],
    queryFn: async () => {
      const res = await fetch(`/api/formations/${formationId}/evaluation-trend`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur de chargement')
      return json
    },
    enabled: !!formationId,
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
  const trendPoints = (trend?.points ?? []).filter((p) => p.overall10 !== null)
  const reportUrl = `/api/sessions/${sessionId}/evaluation-report${qs ? `?${qs}` : ''}`

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <a
          href={reportUrl}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FileDown className="h-4 w-4" /> Rapport qualité (PDF)
        </a>
      </div>

      {/* Résumé */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-56 shrink-0 space-y-6">
            <div>
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Taux de réponse</p>
              <ResponseRateRings types={data.types} />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-8">
            {data.types.map((type) => {
              const rows = summaryRows(type)
              return (
                <div key={type.assessmentType} className="border-t-2 border-gray-900 pt-3">
                  <a href={`#${typeAnchor(type.assessmentType)}`} className="flex items-start justify-between gap-4 group">
                    <span className="font-bold uppercase text-sm text-gray-900 group-hover:text-violet-700">{type.label}</span>
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

      <AttentionPoints points={data.attentionPoints} hasResponses={data.totalRespondents > 0} />

      {trendPoints.length >= 2 && (
        <Card
          title="Évolution entre sessions"
          subtitle="Note /10 des sessions de la même formation (12 dernières) — preuve d'amélioration continue (Qualiopi, indicateur 32)."
        >
          <SessionTrendChart points={trendPoints} currentSessionId={sessionId} />
        </Card>
      )}

      <BeforeAfterChart comparison={data.beforeAfter} />

      {/* Détail par type d'évaluation */}
      {data.types.map((type) => (
        <TypeDetail key={type.assessmentType} type={type} />
      ))}
    </div>
  )
}
