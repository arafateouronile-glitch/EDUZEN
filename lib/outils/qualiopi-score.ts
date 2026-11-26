/**
 * Score d'auto-évaluation Qualiopi : Oui = 1, En partie = 0,5, Non = 0 ;
 * « Non concerné » est exclu du calcul.
 */

import { QUALIOPI_REFERENTIAL, type QualiopiIndicatorDefinition } from '@/lib/constants/qualiopi-referential'
import type { QualiopiAnswer } from '@/lib/outils/tools'

const WEIGHTS: Record<Exclude<QualiopiAnswer, 'na'>, number> = { oui: 1, partiel: 0.5, non: 0 }

export interface CriterionScore {
  number: number
  name: string
  /** Pourcentage, ou null si tous les indicateurs sont « non concernés » */
  score: number | null
  applicable: number
}

export interface QualiopiScore {
  score: number | null
  criteria: CriterionScore[]
  /** Indicateurs à travailler (Non puis En partie), dans l'ordre du référentiel */
  toImprove: Array<QualiopiIndicatorDefinition & { answer: 'non' | 'partiel'; criterion: number }>
  counts: Record<QualiopiAnswer, number>
}

function percent(points: number, applicable: number): number | null {
  return applicable > 0 ? Math.round((points / applicable) * 100) : null
}

export function computeQualiopiScore(answers: Record<number, QualiopiAnswer>): QualiopiScore {
  let points = 0
  let applicable = 0
  const counts: Record<QualiopiAnswer, number> = { oui: 0, partiel: 0, non: 0, na: 0 }
  const nonList: QualiopiScore['toImprove'] = []
  const partialList: QualiopiScore['toImprove'] = []

  const criteria = QUALIOPI_REFERENTIAL.map((criterion) => {
    let cPoints = 0
    let cApplicable = 0
    for (const indicator of criterion.indicators) {
      const answer = answers[indicator.number] ?? 'non'
      counts[answer]++
      if (answer === 'na') continue
      cApplicable++
      cPoints += WEIGHTS[answer]
      if (answer === 'non') nonList.push({ ...indicator, answer, criterion: criterion.number })
      if (answer === 'partiel') partialList.push({ ...indicator, answer, criterion: criterion.number })
    }
    points += cPoints
    applicable += cApplicable
    return { number: criterion.number, name: criterion.name, score: percent(cPoints, cApplicable), applicable: cApplicable }
  })

  return { score: percent(points, applicable), criteria, toImprove: [...nonList, ...partialList], counts }
}

export function scoreVerdict(score: number | null): string {
  if (score === null) return 'Aucun indicateur applicable'
  if (score >= 90) return 'Prêt pour l’audit'
  if (score >= 70) return 'Bonne base, quelques points à consolider'
  if (score >= 40) return 'Des écarts importants à corriger avant l’audit'
  return 'Risque élevé de non-conformités majeures'
}
