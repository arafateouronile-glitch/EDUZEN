/**
 * Tests unitaires pour MobileMoneyService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MobileMoneyService } from '@/lib/services/mobile-money.service'

vi.mock('@/lib/services/payment.service', () => ({
  PaymentService: class MockPaymentService {},
}))

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('MobileMoneyService', () => {
  describe('getConfig', () => {
    it('retourne null quand aucune config pour l\'opérateur (PGRST116)', async () => {
      const mockSupabase = createMockSupabase()
      const service = new MobileMoneyService(mockSupabase)

      const result = await service.getConfig('org-1', 'mtn_mobile_money')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('mobile_money_configs')
    })
  })
})
