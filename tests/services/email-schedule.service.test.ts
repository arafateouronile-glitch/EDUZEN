/**
 * Tests unitaires pour EmailScheduleService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmailScheduleService } from '@/lib/services/email-schedule.service'

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('EmailScheduleService', () => {
  describe('getAllSchedules', () => {
    it('retourne un tableau vide quand aucune planification', async () => {
      const mockSupabase = createMockSupabase()
      const service = new EmailScheduleService(mockSupabase)

      const result = await service.getAllSchedules('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('email_schedules')
    })
  })
})
