'use client'

/** Questionnaire d'auto-évaluation : une réponse par indicateur Qualiopi, regroupés par critère */

import { QUALIOPI_REFERENTIAL } from '@/lib/constants/qualiopi-referential'
import { QUALIOPI_ANSWER_LABELS, type QualiopiAnswer } from '@/lib/outils/tools'
import { cn } from '@/lib/utils'

const ANSWERS: QualiopiAnswer[] = ['oui', 'partiel', 'non', 'na']
const TOTAL = QUALIOPI_REFERENTIAL.reduce((n, c) => n + c.indicators.length, 0)

export function QualiopiQuestionnaire({
  answers,
  onChange,
}: {
  answers: Record<string, QualiopiAnswer>
  onChange: (answers: Record<string, QualiopiAnswer>) => void
}) {
  const answered = Object.keys(answers).length

  return (
    <div className="space-y-8">
      <div className="sticky top-20 z-10 rounded-lg bg-white/95 py-2 backdrop-blur">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Votre organisme respecte-t-il chaque indicateur ?</span>
          <span className="font-medium">{answered} / {TOTAL}</span>
        </div>
        <div className="mt-2 h-1.5 rounded bg-gray-100">
          <div className="h-1.5 rounded bg-brand-blue transition-all" style={{ width: `${(answered / TOTAL) * 100}%` }} />
        </div>
      </div>

      {QUALIOPI_REFERENTIAL.map((criterion) => (
        <div key={criterion.number}>
          <h3 className="mb-3 text-base font-semibold text-gray-900">
            Critère {criterion.number} — {criterion.name}
          </h3>
          <div className="space-y-3">
            {criterion.indicators.map((indicator) => {
              const current = answers[String(indicator.number)]
              return (
                <div key={indicator.number} className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-900">
                    {indicator.number}. {indicator.name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{indicator.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ANSWERS.map((answer) => (
                      <button
                        key={answer}
                        type="button"
                        onClick={() => onChange({ ...answers, [String(indicator.number)]: answer })}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                          current === answer
                            ? 'border-brand-blue bg-brand-blue text-white'
                            : 'border-gray-200 text-gray-700 hover:border-brand-blue/50'
                        )}
                      >
                        {QUALIOPI_ANSWER_LABELS[answer]}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
