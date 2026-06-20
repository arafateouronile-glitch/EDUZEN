/**
 * Tests unitaires pour LearningPortfolioService (réduction services sans tests)
 * Couverture : getTemplates (vide) via singleton
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    or: () => chain,
    order: () => chain,
    then(r: (v: { data: unknown; error: unknown }) => void) {
      r({ data: [], error: null })
      return chain
    },
    catch: () => chain,
  }
  return {
    createClient: () => ({ from: () => chain }),
  }
})

import { learningPortfolioService } from '@/lib/services/learning-portfolio.service.client'

describe('LearningPortfolioService', () => {
  describe('getTemplates', () => {
    it('retourne un tableau vide quand aucun template', async () => {
      const result = await learningPortfolioService.getTemplates('org-1')
      expect(result).toEqual([])
    })
  })
})
