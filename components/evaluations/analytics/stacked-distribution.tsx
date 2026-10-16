'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { questionAnchorId, type QuestionStats, type SectionStats } from '@/lib/services/evaluation-analytics'
import { levelColor, LEVEL_COLORS } from './chart-colors'
import { scoreTone } from './question-stats-card'

interface Segment {
  label: string
  count: number
  percent: number
  color: string
}

/** Questions qui se lisent sur une échelle (étoiles ou Totalement…Pas du tout) */
function isLevelQuestion(q: QuestionStats) {
  return q.kind === 'rating' || (q.kind === 'choice' && q.isScale)
}

function segmentsFor(q: QuestionStats): Segment[] {
  if (q.kind !== 'rating' && q.kind !== 'choice') return []
  return q.distribution
    .filter((d) => d.count > 0)
    .map((d) => ({
      label: q.kind === 'rating' ? `${d.label} étoile${Number(d.label) > 1 ? 's' : ''}` : d.label,
      count: d.count,
      percent: d.percent,
      color: levelColor(d.starValue),
    }))
}

function StackedBar({ q }: { q: QuestionStats }) {
  const [hover, setHover] = useState<Segment | null>(null)
  const segments = segmentsFor(q)
  return (
    <div className="relative">
      <div className="flex h-4 w-full gap-[2px] rounded-[4px] overflow-hidden bg-gray-100" onMouseLeave={() => setHover(null)}>
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full first:rounded-l-[4px] last:rounded-r-[4px] transition-opacity"
            style={{ width: `${(s.count / q.respondents) * 100}%`, backgroundColor: s.color, opacity: hover && hover !== s ? 0.45 : 1 }}
            onMouseEnter={() => setHover(s)}
            aria-label={`${s.label} : ${s.count} (${s.percent} %)`}
          />
        ))}
      </div>
      {hover && (
        <div className="absolute z-10 -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg pointer-events-none">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: hover.color }} />
          {hover.label} : <span className="font-semibold tabular-nums">{hover.count}</span> ({hover.percent} %)
        </div>
      )}
    </div>
  )
}

function Legend({ hasRating, scaleLabels }: { hasRating: boolean; scaleLabels: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      {hasRating &&
        [5, 4, 3, 2, 1].map((star) => (
          <span key={`star-${star}`} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LEVEL_COLORS[star] }} />
            {star} ★
          </span>
        ))}
      {scaleLabels.map((l) => (
        <span key={l.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
          {l.label}
        </span>
      ))}
    </div>
  )
}

/**
 * Vue compacte d'un questionnaire : une barre 100 % par question notée,
 * colorée du meilleur (bleu) au plus faible (rouge).
 */
export function StackedDistribution({ sections }: { sections: SectionStats[] }) {
  const questions = sections.flatMap((s) => s.questions.map((q) => ({ q, section: s.name }))).filter(({ q }) => isLevelQuestion(q))
  if (questions.length === 0) {
    return <p className="text-sm text-gray-500">Aucune question sur échelle dans ce questionnaire — passez en vue détaillée.</p>
  }

  const scaleLabels = new Map<string, string>()
  for (const { q } of questions) {
    if (q.kind === 'choice') for (const d of q.distribution) if (!scaleLabels.has(d.label)) scaleLabels.set(d.label, levelColor(d.starValue))
  }

  return (
    <div className="space-y-4">
      <Legend
        hasRating={questions.some(({ q }) => q.kind === 'rating')}
        scaleLabels={[...scaleLabels].map(([label, color]) => ({ label, color }))}
      />
      <div className="space-y-3">
        {questions.map(({ q, section }) => (
          <div key={q.questionId} id={questionAnchorId(q.questionId)} className="scroll-mt-24 grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_3.5rem] gap-x-4 gap-y-1 items-center">
            <p className="text-sm text-gray-800 leading-snug">
              {section && <span className="text-xs text-gray-400 block">{section}</span>}
              {q.text}
            </p>
            {q.respondents > 0 ? <StackedBar q={q} /> : <p className="text-xs text-gray-400 italic">Aucune réponse</p>}
            <span className={cn('text-sm font-semibold tabular-nums md:text-right', scoreTone(q.score10).text)}>
              {q.score10 === null ? '—' : q.score10.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
