/**
 * Tests unitaires pour EvaluationService (audit - réduction services sans tests)
 * Couverture : getAll (vide)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => {
  const res = { data: [], error: null }
  const ch = {
    select: () => ch,
    eq: () => ch,
    ilike: () => ch,
    gte: () => ch,
    lte: () => ch,
    order: () => ch,
    then(r: (v: typeof res) => void) {
      r(res)
      return ch
    },
    catch: () => ch,
  }
  return { createClient: () => ({ from: () => ch }) }
})

import { evaluationService } from '@/lib/services/evaluation.service'

describe('EvaluationService', () => {
  describe('getAll', () => {
    it('retourne un tableau vide quand aucune évaluation', async () => {
      const result = await evaluationService.getAll('org-1')
      expect(result).toEqual([])
    })
  })
})
