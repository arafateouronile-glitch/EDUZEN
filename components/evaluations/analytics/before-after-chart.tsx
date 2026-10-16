'use client'

import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BeforeAfterComparison } from '@/lib/services/evaluation-analytics'
import { AFTER_COLOR, BEFORE_COLOR, CHART_TRACK } from './chart-colors'

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2" title={`${label} : ${value.toFixed(1)} / 10`}>
      <span className="w-12 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="relative h-3 flex-1 rounded-[4px]" style={{ backgroundColor: CHART_TRACK }}>
        <div className="absolute inset-y-0 left-0 rounded-[4px]" style={{ width: `${value * 10}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-900">{value.toFixed(1)}</span>
    </div>
  )
}

function Delta({ value, large = false }: { value: number; large?: boolean }) {
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-semibold tabular-nums',
        up ? 'text-green-700' : 'text-red-700',
        large ? 'text-3xl' : 'text-sm'
      )}
    >
      <Icon className={large ? 'h-6 w-6' : 'h-3.5 w-3.5'} />
      {up ? '+' : ''}
      {value.toFixed(1)}
      <span className={cn('font-normal text-gray-500', large ? 'text-base ml-1' : 'text-xs ml-0.5')}>pt{Math.abs(value) >= 2 ? 's' : ''}</span>
    </span>
  )
}

/** Comparaison préformation → à chaud / à froid sur les éléments appariés */
export function BeforeAfterChart({ comparison }: { comparison: BeforeAfterComparison }) {
  if (!comparison.hasBefore || !comparison.hasAfter) return null

  if (comparison.pairs.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
        <p>
          <span className="font-semibold text-gray-900">Avant / après formation</span> — aucun élément commun entre la
          préformation et l&apos;évaluation à chaud. Donnez le <strong>même nom de rubrique</strong> (ex. « Compétences
          sécurité ») ou la même question dans les deux questionnaires pour mesurer la progression du groupe.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Avant / après formation</h3>
          <p className="text-xs text-gray-500 mt-0.5">Préformation comparée à l&apos;évaluation à chaud / à froid, sur les rubriques et questions communes.</p>
        </div>
        {comparison.averageDelta !== null && (
          <div className="text-right">
            <Delta value={comparison.averageDelta} large />
            <p className="text-xs text-gray-500">progression moyenne /10</p>
          </div>
        )}
      </div>

      <div className="flex gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BEFORE_COLOR }} />Avant (préformation)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: AFTER_COLOR }} />Après</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {comparison.pairs.map((p) => (
          <div key={`${p.afterType}-${p.matchedBy}-${p.label}`} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-gray-800 leading-snug">
                {p.label}
                <span className="block text-xs text-gray-400">
                  {p.matchedBy === 'section' ? 'Rubrique' : 'Question'} · {p.afterTypeLabel}
                </span>
              </p>
              <Delta value={p.delta} />
            </div>
            <Bar value={p.before10} color={BEFORE_COLOR} label="Avant" />
            <Bar value={p.after10} color={AFTER_COLOR} label="Après" />
          </div>
        ))}
      </div>
    </div>
  )
}
