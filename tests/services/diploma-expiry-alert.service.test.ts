/**
 * Tests unitaires pour DiplomaExpiryAlertService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DiplomaExpiryAlertService } from '@/lib/services/diploma-expiry-alert.service'

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then(r: (v: { data: unknown[]; error: null }) => void) {
      r({ data: [], error: null })
      return { catch: () => this }
    },
  }
  const from = vi.fn(() => chain)
  return { from } as unknown as SupabaseClient
}

describe('DiplomaExpiryAlertService', () => {
  describe('runDailyCheck', () => {
    it('retourne des stats à zéro quand aucun diplôme dans les fenêtres', async () => {
      const mockSupabase = createMockSupabase()
      const service = new DiplomaExpiryAlertService(mockSupabase)

      const result = await service.runDailyCheck()

      expect(result.warning_180d).toEqual({ checked: 0, sent: 0, skipped: 0, errors: 0 })
      expect(result.warning_90d).toEqual({ checked: 0, sent: 0, skipped: 0, errors: 0 })
      expect(result.critical_1d).toEqual({ checked: 0, sent: 0, skipped: 0, errors: 0 })
    })
  })
})
