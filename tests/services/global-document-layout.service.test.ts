/**
 * Tests unitaires pour GlobalDocumentLayoutService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    }),
  }),
}))

import { globalDocumentLayoutService } from '@/lib/services/global-document-layout.service'

describe('GlobalDocumentLayoutService', () => {
  describe('getActiveLayout', () => {
    it('retourne null quand aucun layout actif', async () => {
      const result = await globalDocumentLayoutService.getActiveLayout('org-1')
      expect(result).toBeNull()
    })
  })
})
