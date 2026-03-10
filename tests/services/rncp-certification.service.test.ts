/**
 * Tests unitaires pour RNCPCertificationService (réduction services sans tests)
 * Couverture : getCertifications (vide)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RNCPCertificationService } from '@/lib/services/rncp-certification.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve(result)
      return this as Promise<typeof result>
    },
    catch: () => this,
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('RNCPCertificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCertifications', () => {
    it('retourne un tableau vide quand aucune certification', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new RNCPCertificationService(mockSupabase as any)

      const result = await service.getCertifications('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('rncp_certifications')
    })
  })
})
