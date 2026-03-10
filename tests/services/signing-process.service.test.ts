/**
 * Tests unitaires pour SigningProcessService (audit - réduction services sans tests)
 * Couverture : getProcessWithDetail (null), getSignUrl
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SigningProcessService } from '@/lib/services/signing-process.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(
  processResult: { data: unknown; error: unknown },
  signatoriesResult?: { data: unknown; error: unknown }
) {
  const signatoriesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(signatoriesResult ?? { data: [], error: null }),
  }
  const processChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(processResult),
  }
  const from = vi.fn((table: string) => {
    if (table === 'signatories') return signatoriesChain
    return processChain
  })
  return { from } as unknown as SupabaseClient
}

describe('SigningProcessService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProcessWithDetail', () => {
    it('retourne null quand le processus est introuvable', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })
      const service = new SigningProcessService(mockSupabase)

      const result = await service.getProcessWithDetail('process-inexistant')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('signing_processes')
    })
  })

  describe('getSignUrl', () => {
    it('retourne une URL contenant le token', () => {
      const mockSupabase = createMockSupabase({ data: null, error: null })
      const service = new SigningProcessService(mockSupabase)

      const url = service.getSignUrl('token-abc')

      expect(url).toContain('/sign/')
      expect(url).toContain('token-abc')
    })
  })
})
