'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DistributionEntry, QuestionStats } from '@/lib/services/evaluation-analytics'

/** Couleur d'une note /10 (vert ≥ 8, ambre ≥ 6, rouge sinon) */
export function scoreTone(score10: number | null) {
  if (score10 === null) return { text: 'text-gray-400', bar: 'bg-gray-300', pill: 'bg-gray-100 text-gray-500' }
  if (score10 >= 8) return { text: 'text-green-600', bar: 'bg-green-500', pill: 'bg-green-100 text-green-700' }
  if (score10 >= 6) return { text: 'text-amber-600', bar: 'bg-amber-500', pill: 'bg-amber-100 text-amber-700' }
  return { text: 'text-red-600', bar: 'bg-red-500', pill: 'bg-red-100 text-red-700' }
}

/** Couleur d'un niveau d'étoiles 0-5 (vert → rouge) */
function starTone(star: number | undefined) {
  if (star === undefined) return 'bg-violet-500'
  if (star >= 5) return 'bg-green-500'
  if (star >= 4) return 'bg-lime-400'
  if (star >= 3) return 'bg-amber-300'
  if (star >= 2) return 'bg-orange-300'
  return 'bg-red-300'
}

function DistributionBars({
  entries,
  colorBy,
  labelWidth = 'w-40',
}: {
  entries: DistributionEntry[]
  colorBy: 'star' | 'neutral'
  labelWidth?: string
}) {
  return (
    <div className="space-y-1.5 min-w-0 flex-1">
      {entries.map((e) => (
        <div key={e.label} className="flex items-center gap-3 text-sm">
          <span className={cn('shrink-0 max-w-[45%] text-right text-gray-700 leading-tight', labelWidth)}>
            {e.isCorrect && <Check className="inline h-3.5 w-3.5 mr-1 text-green-600" />}
            {e.label}
          </span>
          <div className="relative h-2.5 flex-1 min-w-[3rem] max-w-[12rem] rounded-full bg-gray-100 overflow-hidden">
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full',
                e.isCorrect ? 'bg-green-500' : colorBy === 'star' ? starTone(e.starValue) : 'bg-violet-500'
              )}
              style={{ width: `${e.percent}%` }}
            />
          </div>
          <span className="tabular-nums font-semibold text-violet-700 w-6 text-right">{e.count}</span>
          <span className="tabular-nums text-xs text-gray-400 w-10">{e.percent} %</span>
        </div>
      ))}
    </div>
  )
}

export function QuestionStatsCard({ stats }: { stats: QuestionStats }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="font-semibold text-gray-900 text-sm mb-3 whitespace-pre-line">{stats.text}</p>

      {stats.respondents === 0 ? (
        <p className="text-sm text-gray-400 italic">Aucune réponse pour l&apos;instant.</p>
      ) : stats.kind === 'rating' ? (
        <div className="flex flex-wrap items-center gap-6">
          <div className="w-24 shrink-0 border-r border-gray-200 pr-4">
            <p className="text-4xl font-bold text-violet-700 tabular-nums">{stats.average?.toFixed(1)}</p>
            <p className="text-sm text-gray-600">
              {stats.respondents} votant{stats.respondents > 1 ? 's' : ''}
            </p>
          </div>
          <DistributionBars entries={stats.distribution} colorBy="star" labelWidth="w-4" />
        </div>
      ) : stats.kind === 'choice' && stats.isScale ? (
        <div className="flex flex-wrap items-center gap-6">
          <div className="w-24 shrink-0">
            <span
              className={cn(
                'inline-flex h-16 w-16 items-center justify-center rounded-full text-base font-bold tabular-nums',
                scoreTone(stats.score10).pill
              )}
            >
              {stats.score10?.toFixed(1)}
              <span className="text-[10px] font-normal ml-0.5">/10</span>
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {stats.respondents} réponse{stats.respondents > 1 ? 's' : ''}
            </p>
          </div>
          <DistributionBars entries={stats.distribution} colorBy="star" labelWidth="w-32" />
        </div>
      ) : stats.kind === 'choice' || stats.kind === 'boolean' ? (
        <div className="space-y-2">
          <DistributionBars entries={stats.distribution} colorBy="neutral" labelWidth="w-56" />
          <p className="text-xs text-gray-500">
            {stats.respondents} réponse{stats.respondents > 1 ? 's' : ''}
            {stats.kind === 'choice' && stats.correctPercent !== null && (
              <> · <span className="font-semibold text-green-700">{stats.correctPercent} % de bonnes réponses</span></>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {stats.answers.map((a, i) => (
            <div key={`${a.studentId}-${i}`} className="rounded-lg border border-gray-200 px-3 py-2">
              <p className="text-xs font-semibold text-gray-800">{a.studentName}</p>
              <p className="text-sm text-violet-700 whitespace-pre-line">{a.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
