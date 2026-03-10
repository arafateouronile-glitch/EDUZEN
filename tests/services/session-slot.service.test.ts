/**
 * Tests unitaires pour SessionSlotService (réduction services sans tests)
 * Couverture : getBySessionId (vide)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionSlotService } from '@/lib/services/session-slot.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve(result)
      return this as Promise<typeof result>
    },
    catch: () => this,
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('SessionSlotService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBySessionId', () => {
    it('retourne un tableau vide quand aucune seance pour la session', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new SessionSlotService(mockSupabase)

      const result = await service.getBySessionId('session-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('session_slots')
    })
  })
})
