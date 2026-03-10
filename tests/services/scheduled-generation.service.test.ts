/**
 * Tests unitaires pour ScheduledGenerationService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ScheduledGenerationService } from '@/lib/services/scheduled-generation.service'

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('ScheduledGenerationService', () => {
  describe('getAll', () => {
    it('retourne un tableau vide quand aucune génération programmée', async () => {
      const mockSupabase = createMockSupabase()
      const service = new ScheduledGenerationService(mockSupabase)

      const result = await service.getAll('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_generations')
    })
  })
})
