/**
 * Tests unitaires pour FeedbackService (audit - réduction services sans tests)
 * Couverture : getByOrganization (vide)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FeedbackService } from '@/lib/services/feedback.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown; count?: number }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({
      data: result.data,
      error: result.error,
      count: result.count ?? 0,
    }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('FeedbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getByOrganization', () => {
    it('retourne une liste vide quand aucun feedback', async () => {
      const mockSupabase = createMockSupabase({
        data: [],
        error: null,
        count: 0,
      })
      const service = new FeedbackService(mockSupabase)

      const result = await service.getByOrganization('org-1')

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
      expect(result.totalPages).toBe(0)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_feedback')
    })
  })
})
