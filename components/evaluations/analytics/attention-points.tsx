'use client'

import { useState } from 'react'
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AttentionPoint } from '@/lib/services/evaluation-analytics'

const VISIBLE_BY_DEFAULT = 6

function scrollTo(targetId: string | null) {
  if (!targetId) return
  const el = document.getElementById(targetId)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('ring-2', 'ring-amber-400')
  setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 1800)
}

export function AttentionPoints({ points, hasResponses }: { points: AttentionPoint[]; hasResponses: boolean }) {
  const [expanded, setExpanded] = useState(false)
  if (!hasResponses) return null

  if (points.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Aucun point d&apos;attention : toutes les notes sont au-dessus de 7/10.
      </div>
    )
  }

  const critical = points.filter((p) => p.level === 'critical').length
  const shown = expanded ? points : points.slice(0, VISIBLE_BY_DEFAULT)

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-gray-900">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        Points d&apos;attention
        <span className="text-sm font-normal text-gray-600">
          {points.length} élément{points.length > 1 ? 's' : ''}
          {critical > 0 && <> dont {critical} critique{critical > 1 ? 's' : ''}</>}
        </span>
      </h3>
      <ul className="mt-3 space-y-2">
        {shown.map((p) => {
          const Icon = p.level === 'critical' ? AlertOctagon : AlertTriangle
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => scrollTo(p.targetId)}
                disabled={!p.targetId}
                className={cn(
                  'w-full text-left flex items-start gap-3 rounded-xl bg-white border px-3 py-2 transition-colors',
                  p.targetId ? 'hover:border-gray-300 cursor-pointer' : 'cursor-default',
                  p.level === 'critical' ? 'border-red-200' : 'border-amber-200'
                )}
              >
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', p.level === 'critical' ? 'text-red-600' : 'text-amber-600')} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-gray-900 leading-snug">{p.label}</span>
                  <span className="block text-xs text-gray-500">
                    {p.typeLabel} · {p.detail}
                  </span>
                </span>
                <span className={cn('text-xs font-semibold uppercase tracking-wide shrink-0', p.level === 'critical' ? 'text-red-700' : 'text-amber-700')}>
                  {p.level === 'critical' ? 'Critique' : 'À surveiller'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {points.length > VISIBLE_BY_DEFAULT && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 text-xs text-brand-blue hover:underline">
          {expanded ? 'Afficher moins' : `Afficher les ${points.length - VISIBLE_BY_DEFAULT} autres`}
        </button>
      )}
    </div>
  )
}
