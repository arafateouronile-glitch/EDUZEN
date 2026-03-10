/**
 * Tests unitaires pour BPFService (audit P2 - priorité MOYENNE)
 * Couverture : getReport (null), getReports (vide)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BPFService } from '@/lib/services/bpf.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('BPFService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getReport', () => {
    it('retourne null quand rapport introuvable', async () => {
      const mockSupabase = createMockSupabase({ data: null, error: null })
      const service = new BPFService(mockSupabase)

      const result = await service.getReport('report-inexistant')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('bpf_reports')
    })
  })

  describe('getReports', () => {
    it('retourne un tableau vide quand aucun rapport', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new BPFService(mockSupabase)

      const result = await service.getReports('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('bpf_reports')
    })
  })
})
