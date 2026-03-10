/**
 * Tests unitaires pour TwoFactorAuthService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TwoFactorAuthService } from '@/lib/services/2fa.service'

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('TwoFactorAuthService', () => {
  describe('getConfig', () => {
    it('retourne null quand aucun enregistrement 2FA pour l\'utilisateur', async () => {
      const mockSupabase = createMockSupabase()
      const service = new TwoFactorAuthService(mockSupabase)

      const result = await service.getConfig('user-1')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('user_2fa')
    })
  })
})
