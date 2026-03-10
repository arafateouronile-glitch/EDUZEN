/**
 * Tests unitaires pour AnomalyDetectionService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AnomalyDetectionService } from '@/lib/services/anomaly-detection.service'

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('AnomalyDetectionService', () => {
  describe('getAnomalyTypes', () => {
    it('retourne un tableau vide quand aucun type', async () => {
      const mockSupabase = createMockSupabase()
      const service = new AnomalyDetectionService(mockSupabase)

      const result = await service.getAnomalyTypes()

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('anomaly_types')
    })
  })
})
