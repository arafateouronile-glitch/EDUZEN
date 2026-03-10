/**
 * Tests unitaires pour SharedCalendarService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SharedCalendarService } from '@/lib/services/shared-calendar.service'

function createMockSupabase() {
  const thenable = { data: [] as unknown[], error: null }
  const calendarsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then(r: (v: typeof thenable) => void) {
      r(thenable)
      return this
    },
  }
  const sharesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then(r: (v: typeof thenable) => void) {
      r(thenable)
      return this
    },
  }
  const from = vi.fn((table: string) =>
    table === 'calendars' ? calendarsChain : sharesChain
  )
  return { from } as unknown as SupabaseClient
}

describe('SharedCalendarService', () => {
  describe('getCalendars', () => {
    it('retourne un tableau vide quand aucun calendrier ni partage', async () => {
      const mockSupabase = createMockSupabase()
      const service = new SharedCalendarService(mockSupabase)

      const result = await service.getCalendars('user-1', 'org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('calendars')
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_shares')
    })
  })
})
