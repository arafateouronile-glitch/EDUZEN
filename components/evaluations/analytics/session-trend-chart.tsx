'use client'

import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn, formatDate } from '@/lib/utils'
import { ASSESSMENT_TYPE_LABELS, type EvaluationTrendPoint } from '@/lib/services/evaluation-analytics'
import { CHART_AXIS_TEXT, CHART_GRID, TYPE_SERIES_COLOR } from './chart-colors'

const SERIES_ORDER = ['overall', 'pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder']

function seriesLabel(key: string) {
  return key === 'overall' ? 'Note globale' : ASSESSMENT_TYPE_LABELS[key] ?? key
}

interface TooltipEntry {
  dataKey: string
  value: number | null
  color: string
  payload: { name: string; startDate: string }
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-900">{point.name}</p>
      <p className="text-gray-500 mb-1">{formatDate(point.startDate)}</p>
      {payload
        .filter((e) => e.value !== null && e.value !== undefined)
        .map((e) => (
          <p key={e.dataKey} className="flex items-center gap-2 text-gray-700">
            <span className="h-0.5 w-3 rounded" style={{ backgroundColor: e.color }} />
            {seriesLabel(e.dataKey)}
            <span className="ml-auto pl-3 font-semibold tabular-nums text-gray-900">{Number(e.value).toFixed(1)}</span>
          </p>
        ))}
    </div>
  )
}

/**
 * Évolution de la note /10 d'une session à l'autre pour la même formation.
 * La note globale est affichée par défaut ; chaque type s'active via la légende.
 */
export default function SessionTrendChart({ points, currentSessionId }: { points: EvaluationTrendPoint[]; currentSessionId: string }) {
  const [visible, setVisible] = useState<Set<string>>(() => new Set(['overall']))
  const [showTable, setShowTable] = useState(false)

  const series = useMemo(() => {
    const present = new Set<string>(['overall'])
    for (const p of points) for (const [k, v] of Object.entries(p.byType)) if (v !== null) present.add(k)
    return SERIES_ORDER.filter((k) => present.has(k))
  }, [points])

  const data = points.map((p) => ({
    name: p.name,
    startDate: p.startDate,
    sessionId: p.sessionId,
    overall: p.overall10,
    ...Object.fromEntries(series.filter((k) => k !== 'overall').map((k) => [k, p.byType[k] ?? null])),
  }))

  const toggle = (key: string) =>
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(key) && next.size > 1) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {series.map((key) => {
          const on = visible.has(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={on}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors',
                on ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-200 bg-gray-50 text-gray-400'
              )}
            >
              <span className="h-0.5 w-4 rounded" style={{ backgroundColor: on ? TYPE_SERIES_COLOR[key] : '#d1d5db' }} />
              {seriesLabel(key)}
            </button>
          )
        })}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis
              // Clé unique par session : deux sessions peuvent démarrer le même jour
              dataKey="sessionId"
              tickFormatter={(id: string) => {
                const p = points.find((pt) => pt.sessionId === id)
                return p ? new Date(p.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : ''
              }}
              tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }}
              axisLine={{ stroke: CHART_GRID }}
              tickLine={false}
            />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#9ca3af', strokeDasharray: '3 3' }} />
            {series
              .filter((key) => visible.has(key))
              .map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={TYPE_SERIES_COLOR[key]}
                  strokeWidth={2}
                  connectNulls
                  isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; payload?: { sessionId: string }; value?: number | null }) => {
                    const { cx, cy, payload, value } = props
                    if (cx == null || cy == null || value == null) return <g key={`${key}-${payload?.sessionId}`} />
                    const current = payload?.sessionId === currentSessionId
                    return (
                      <circle
                        key={`${key}-${payload?.sessionId}`}
                        cx={cx}
                        cy={cy}
                        r={current ? 6 : 4}
                        fill={current ? TYPE_SERIES_COLOR[key] : '#fff'}
                        stroke={TYPE_SERIES_COLOR[key]}
                        strokeWidth={2}
                      />
                    )
                  }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500">Le point plein correspond à cette session.</p>

      <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs text-brand-blue hover:underline">
        {showTable ? 'Masquer les données' : 'Voir les données'}
      </button>
      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1.5 pr-3 font-medium">Session</th>
                <th className="py-1.5 pr-3 font-medium">Début</th>
                {series.map((k) => (
                  <th key={k} className="py-1.5 pr-3 font-medium text-right">{seriesLabel(k)}</th>
                ))}
                <th className="py-1.5 font-medium text-right">Réponses</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.sessionId} className={cn('border-b border-gray-100', p.sessionId === currentSessionId && 'font-semibold')}>
                  <td className="py-1.5 pr-3 text-gray-900">{p.name}</td>
                  <td className="py-1.5 pr-3 text-gray-600 whitespace-nowrap">{formatDate(p.startDate)}</td>
                  {series.map((k) => {
                    const v = k === 'overall' ? p.overall10 : p.byType[k]
                    return <td key={k} className="py-1.5 pr-3 text-right tabular-nums">{v == null ? '—' : v.toFixed(1)}</td>
                  })}
                  <td className="py-1.5 text-right tabular-nums">{p.respondents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
