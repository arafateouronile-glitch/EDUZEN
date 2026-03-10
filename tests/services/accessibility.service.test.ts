/**
 * Tests unitaires pour AccessibilityService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => {
  const chain = {
    select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
  }
  return {
    createClient: () => ({ from: () => chain }),
  }
})

import { accessibilityService } from '@/lib/services/accessibility.service'

describe('AccessibilityService', () => {
  describe('getDisabilityTypes', () => {
    it('retourne un tableau vide quand aucun type', async () => {
      const result = await accessibilityService.getDisabilityTypes()
      expect(result).toEqual([])
    })
  })
})
