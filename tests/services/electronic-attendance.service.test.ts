/**
 * Tests unitaires pour ElectronicAttendanceService
 * Couverture : getAttendanceSessionById, getAttendanceSessionsBySession, getAttendanceSessionsByOrganization (audit P2-13)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ElectronicAttendanceService } from '@/lib/services/electronic-attendance.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function createChain(result: { data: unknown; error: unknown }, terminal: 'single' | 'order' = 'order') {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnValue(terminal === 'order' ? Promise.resolve(result) : undefined),
    single: vi.fn().mockResolvedValue(result),
  }
  if (terminal === 'order') {
    chain.order.mockResolvedValue(result)
  }
  return chain
}

function createMockSupabase(result: { data: unknown; error: unknown }, useSingle = false) {
  const chain = createChain(result, useSingle ? 'single' : 'order')
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>
}

describe('ElectronicAttendanceService', () => {
  let service: ElectronicAttendanceService
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAttendanceSessionById', () => {
    it('devrait retourner une session d\'émargement par id', async () => {
      const mockSession = {
        id: 'eas-1',
        organization_id: 'org-1',
        session_id: 'sess-1',
        title: 'Émargement matin',
        status: 'draft',
        date: '2026-02-28',
      }
      mockSupabase = createMockSupabase({ data: mockSession, error: null }, true)
      service = new ElectronicAttendanceService(mockSupabase)

      const result = await service.getAttendanceSessionById('eas-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('electronic_attendance_sessions')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('id', 'eas-1')
      expect(chain.single).toHaveBeenCalled()
      expect(result).toEqual(mockSession)
    })

    it('devrait lever une erreur si session absente (PGRST116)', async () => {
      mockSupabase = createMockSupabase({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      }, true)
      service = new ElectronicAttendanceService(mockSupabase)

      await expect(service.getAttendanceSessionById('inexistant')).rejects.toThrow(/introuvable/i)
    })
  })

  describe('getAttendanceSessionsBySession', () => {
    it('devrait retourner les sessions d\'émargement pour une session de formation', async () => {
      const mockSessions = [
        { id: 'eas-1', session_id: 'sess-1', title: 'Émargement 1', date: '2026-02-28' },
      ]
      mockSupabase = createMockSupabase({ data: mockSessions, error: null })
      service = new ElectronicAttendanceService(mockSupabase)

      const result = await service.getAttendanceSessionsBySession('sess-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('electronic_attendance_sessions')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('session_id', 'sess-1')
      expect(chain.order).toHaveBeenCalledWith('date', { ascending: false })
      expect(result).toEqual(mockSessions)
    })

    it('devrait retourner un tableau vide si erreur non levée', async () => {
      mockSupabase = createMockSupabase({ data: null, error: null })
      service = new ElectronicAttendanceService(mockSupabase)

      const result = await service.getAttendanceSessionsBySession('sess-1')

      expect(result).toEqual([])
    })
  })

  describe('getAttendanceSessionsByOrganization', () => {
    it('devrait retourner les sessions d\'émargement d\'une organisation', async () => {
      const mockSessions = [
        { id: 'eas-1', organization_id: 'org-1', title: 'Émargement', status: 'active' },
      ]
      mockSupabase = createMockSupabase({ data: mockSessions, error: null })
      service = new ElectronicAttendanceService(mockSupabase)

      const result = await service.getAttendanceSessionsByOrganization('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('electronic_attendance_sessions')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(chain.order).toHaveBeenCalledWith('date', { ascending: false })
      expect(result).toEqual(mockSessions)
    })

    it('devrait appliquer les filtres status, date, sessionId si fournis', async () => {
      mockSupabase = createMockSupabase({ data: [], error: null })
      service = new ElectronicAttendanceService(mockSupabase)

      await service.getAttendanceSessionsByOrganization('org-1', {
        status: 'active',
        date: '2026-02-28',
        sessionId: 'sess-1',
      })

      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(chain.eq).toHaveBeenCalledWith('status', 'active')
      expect(chain.eq).toHaveBeenCalledWith('date', '2026-02-28')
      expect(chain.eq).toHaveBeenCalledWith('session_id', 'sess-1')
    })
  })
})
