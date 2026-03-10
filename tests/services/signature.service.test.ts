/**
 * Tests unitaires pour SignatureService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SignatureService } from '@/lib/services/signature.service'

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('SignatureService', () => {
  describe('getSignaturesByDocument', () => {
    it('retourne un tableau vide quand aucune signature', async () => {
      const mockSupabase = createMockSupabase()
      const service = new SignatureService(mockSupabase)

      const result = await service.getSignaturesByDocument('doc-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('document_signatures')
    })
  })
})
