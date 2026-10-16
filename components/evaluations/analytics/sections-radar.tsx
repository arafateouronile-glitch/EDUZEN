'use client'

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_AXIS_TEXT, CHART_GRID, SERIES_COLORS } from './chart-colors'

export interface RadarPoint {
  name: string
  score10: number
}

/** Coupe un libellé en 2 lignes max (~20 caractères) */
function wrapLabel(label: string, max = 20): string[] {
  const lines: string[] = ['']
  for (const word of label.split(/\s+/)) {
    const current = lines[lines.length - 1]
    if (current && `${current} ${word}`.length > max) {
      if (lines.length === 2) {
        lines[1] = `${lines[1]}…`
        break
      }
      lines.push(word)
    } else {
      lines[lines.length - 1] = current ? `${current} ${word}` : word
    }
  }
  return lines
}

interface AngleTickProps {
  x?: number
  y?: number
  cx?: number
  cy?: number
  textAnchor?: 'start' | 'middle' | 'end'
  payload?: { value: string }
  data: RadarPoint[]
}

/** Libellé d'axe sur 2 lignes + note, écarté du radar */
function AngleTick({ x = 0, y = 0, cx = 0, cy = 0, textAnchor = 'middle', payload, data }: AngleTickProps) {
  const name = payload?.value ?? ''
  const point = data.find((d) => d.name === name)
  const lines = [...wrapLabel(name), point ? point.score10.toFixed(1) : '']
  const lineHeight = 13
  const dy = y - cy
  // Au-dessus du centre le bloc remonte, en dessous il descend
  const startY = dy < -10 ? y - (lines.length - 1) * lineHeight - 4 : dy > 10 ? y + 8 : y - ((lines.length - 1) * lineHeight) / 2
  const dx = x - cx
  const anchor = Math.abs(dx) < 10 ? 'middle' : textAnchor
  return (
    <text x={x} y={startY} textAnchor={anchor} fill={CHART_AXIS_TEXT} fontSize={11}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight} fontWeight={i === lines.length - 1 ? 700 : 400} fill={i === lines.length - 1 ? '#111827' : undefined}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

/** Radar 0-10 des rubriques notées d'un questionnaire (≥ 3 rubriques) */
export default function SectionsRadar({ data }: { data: RadarPoint[] }) {
  return (
    <div className="h-80 w-full" role="img" aria-label={`Notes par rubrique : ${data.map((d) => `${d.name} ${d.score10}/10`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="62%" margin={{ top: 24, right: 48, bottom: 24, left: 48 }}>
          <PolarGrid stroke={CHART_GRID} />
          <PolarAngleAxis dataKey="name" tick={(props: Omit<AngleTickProps, 'data'>) => <AngleTick {...props} data={data} />} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            dataKey="score10"
            stroke={SERIES_COLORS[0]}
            strokeWidth={2}
            fill={SERIES_COLORS[0]}
            fillOpacity={0.18}
            dot={{ r: 4, fill: SERIES_COLORS[0], stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)} / 10`, 'Note']}
            contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: '#e5e7eb' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
