/**
 * Tests unitaires pour SessionChargesService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    then(r: (v: { data: unknown[]; error: null }) => void) {
      r({ data: [], error: null })
      return chain
    },
    catch: () => chain,
  }
  return {
    createClient: () => ({ from: () => chain }),
  }
})

import { sessionChargesService } from '@/lib/services/session-charges.service'

describe('SessionChargesService', () => {
  describe('getCategories', () => {
    it('retourne un tableau vide quand aucune catégorie', async () => {
      const result = await sessionChargesService.getCategories('org-1')
      expect(result).toEqual([])
    })
  })
})
