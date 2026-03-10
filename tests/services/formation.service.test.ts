/**
 * Tests unitaires pour FormationService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FormationService } from '@/lib/services/formation.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function createMockSupabase(overrides: {
  data?: unknown
  error?: unknown
  count?: number
} = {}) {
  const { data = [], error = null, count = 0 } = overrides
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(function (this: typeof chain) {
      return Promise.resolve({ data, error, count })
    }),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>
}

describe('FormationService', () => {
  let service: FormationService
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllFormations', () => {
    it('devrait retourner un tableau de formations sans pagination', async () => {
      const mockFormations = [
        { id: 'f1', name: 'Formation A', organization_id: 'org-1', program_id: 'p1' },
      ]
      mockSupabase = createMockSupabase({ data: mockFormations })
      service = new FormationService(mockSupabase)

      const result = await service.getAllFormations('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('formations')
      expect(result).toEqual(mockFormations)
    })

    it('devrait retourner { data, count, hasMore } avec pagination', async () => {
      const mockFormations = [{ id: 'f1', name: 'Formation A' }]
      mockSupabase = createMockSupabase({ data: mockFormations, count: 10 })
      service = new FormationService(mockSupabase)

      const result = await service.getAllFormations('org-1', { limit: 5, offset: 0 })

      expect(result).toMatchObject({ data: mockFormations, count: 10, hasMore: true })
    })
  })

  describe('getFormationById', () => {
    it('devrait retourner une formation par id avec programme et sessions', async () => {
      const mockFormation = {
        id: 'f1',
        name: 'Formation Excel',
        organization_id: 'org-1',
        programs: { id: 'p1', name: 'Programme' },
        sessions: [],
      }
      mockSupabase = createMockSupabase({ data: mockFormation })
      service = new FormationService(mockSupabase)

      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.single.mockResolvedValue({ data: mockFormation, error: null })

      const result = await service.getFormationById('f1')

      expect(mockSupabase.from).toHaveBeenCalledWith('formations')
      expect(chain.eq).toHaveBeenCalledWith('id', 'f1')
      expect(result).toEqual(mockFormation)
    })
  })

  describe('getSessionsByFormation', () => {
    it('devrait retourner les sessions d\'une formation', async () => {
      const mockSessions = [
        { id: 's1', formation_id: 'f1', start_date: '2025-01-01' },
      ]
      mockSupabase = createMockSupabase({ data: mockSessions })
      service = new FormationService(mockSupabase)

      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.order.mockResolvedValue({ data: mockSessions, error: null })

      const result = await service.getSessionsByFormation('f1')

      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
      expect(chain.eq).toHaveBeenCalledWith('formation_id', 'f1')
      expect(result).toEqual(mockSessions)
    })
  })
})
