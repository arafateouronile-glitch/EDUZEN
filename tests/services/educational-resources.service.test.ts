/**
 * Tests unitaires pour EducationalResourcesService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => Promise.resolve({ data: [], error: null }),
  }
  return {
    createClient: () => ({ from: () => chain }),
  }
})

import { educationalResourcesService } from '@/lib/services/educational-resources.service'

describe('EducationalResourcesService', () => {
  describe('getCategories', () => {
    it('retourne un tableau vide quand aucune catégorie', async () => {
      const result = await educationalResourcesService.getCategories('org-1')
      expect(result).toEqual([])
    })
  })
})
