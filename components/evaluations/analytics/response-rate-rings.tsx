'use client'

import type { AssessmentTypeStats } from '@/lib/services/evaluation-analytics'
import { CHART_TRACK, SERIES_COLORS } from './chart-colors'

const SIZE = 76
const STROKE = 8
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Taux de réponse par type d'évaluation : un anneau « répondu / attribué » */
export function ResponseRateRings({ types }: { types: AssessmentTypeStats[] }) {
  if (types.length === 0) return null
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-4">
      {types.map((t) => {
        const filled = (t.responseRate / 100) * CIRCUMFERENCE
        return (
          <div
            key={t.assessmentType}
            className="flex flex-col items-center w-24"
            title={`${t.label} : ${t.respondents} réponse${t.respondents > 1 ? 's' : ''} sur ${t.assigned} (${t.responseRate} %)`}
          >
            <div className="relative" style={{ width: SIZE, height: SIZE }}>
              <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${t.label} : ${t.responseRate} % de réponses`}>
                <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={CHART_TRACK} strokeWidth={STROKE} />
                {t.respondents > 0 && (
                  <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={SERIES_COLORS[0]}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
                    transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-sm font-bold tabular-nums text-gray-900">{t.respondents}/{t.assigned}</span>
                <span className="text-[10px] text-gray-500 tabular-nums mt-0.5">{t.responseRate} %</span>
              </div>
            </div>
            <span className="mt-1.5 text-xs text-center text-gray-600 leading-tight">{t.label}</span>
          </div>
        )
      })}
    </div>
  )
}
