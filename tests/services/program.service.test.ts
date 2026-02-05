/**
 * Tests unitaires pour ProgramService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProgramService } from '@/lib/services/program.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Mock Supabase client
const createMockSupabaseClient = (): SupabaseClient<Database> => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  }

  return {
    from: vi.fn(() => mockQueryBuilder),
  } as unknown as SupabaseClient<Database>
}

describe('ProgramService', () => {
  let service: ProgramService
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    service = new ProgramService(mockSupabase)
    vi.clearAllMocks()
  })

  describe('getAllPrograms', () => {
    it('devrait récupérer tous les programmes d\'une organisation', async () => {
      const mockPrograms = [
        { id: '1', name: 'Program 1', organization_id: 'org-1', is_active: true },
        { id: '2', name: 'Program 2', organization_id: 'org-1', is_active: true },
      ]

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPrograms, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.getAllPrograms('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('programs')
      expect(result).toEqual(mockPrograms)
    })

    it('devrait filtrer par isActive', async () => {
      const mockPrograms = [
        { id: '1', name: 'Program 1', organization_id: 'org-1', is_active: true },
      ]

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPrograms, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await service.getAllPrograms('org-1', { isActive: true })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('devrait rechercher par texte', async () => {
      const mockPrograms: any[] = []

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPrograms, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await service.getAllPrograms('org-1', { search: 'test' })

      expect(mockQueryBuilder.or).toHaveBeenCalled()
    })

    it('devrait gérer les erreurs', async () => {
      const mockError = { message: 'Database error', code: 'PGRST_ERROR' }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.getAllPrograms('org-1')).rejects.toEqual(mockError)
    })
  })

  describe('getProgramById', () => {
    it('devrait récupérer un programme par son ID', async () => {
      const mockProgram = {
        id: '1',
        name: 'Program 1',
        organization_id: 'org-1',
        formations: [],
      }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProgram, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.getProgramById('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('programs')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockProgram)
    })

    it('devrait gérer les erreurs', async () => {
      const mockError = { message: 'Program not found', code: 'PGRST116' }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.getProgramById('1')).rejects.toEqual(mockError)
    })
  })

  describe('createProgram', () => {
    it('devrait créer un nouveau programme', async () => {
      const newProgram = {
        name: 'New Program',
        organization_id: 'org-1',
        is_active: true,
      }

      const createdProgram = {
        id: '1',
        ...newProgram,
        created_at: new Date().toISOString(),
      }

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdProgram, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.createProgram(newProgram)

      expect(mockSupabase.from).toHaveBeenCalledWith('programs')
      expect(result).toEqual(createdProgram)
    })

    it('devrait gérer les erreurs de création', async () => {
      const newProgram = {
        name: 'New Program',
        organization_id: 'org-1',
      }

      const mockError = { message: 'Creation failed', code: 'PGRST_ERROR' }

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.createProgram(newProgram)).rejects.toEqual(mockError)
    })
  })

  describe('updateProgram', () => {
    it('devrait mettre à jour un programme', async () => {
      const updates = { name: 'Updated Program' }
      const updatedProgram = {
        id: '1',
        name: 'Updated Program',
        organization_id: 'org-1',
      }

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedProgram, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.updateProgram('1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('programs')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedProgram)
    })

    it('devrait gérer les erreurs de mise à jour', async () => {
      const updates = { name: 'Updated Program' }
      const mockError = { message: 'Update failed', code: 'PGRST_ERROR' }

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.updateProgram('1', updates)).rejects.toEqual(mockError)
    })
  })

  describe('deleteProgram', () => {
    it('devrait supprimer un programme (soft delete)', async () => {
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', deleted_at: new Date() }, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await service.deleteProgram('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('programs')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })

    it('devrait gérer les erreurs de suppression', async () => {
      const mockError = { message: 'Delete failed', code: 'PGRST_ERROR' }

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.deleteProgram('1')).rejects.toEqual(mockError)
    })
  })

  describe('getFormationsByProgram', () => {
    it('devrait récupérer les formations d\'un programme', async () => {
      const programId = '1'
      const mockFormations = [
        { id: 'f1', name: 'Formation 1', program_id: programId },
        { id: 'f2', name: 'Formation 2', program_id: programId },
      ]

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockFormations, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.getFormationsByProgram(programId)

      expect(mockSupabase.from).toHaveBeenCalledWith('formations')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('program_id', programId)
      expect(result).toEqual(mockFormations)
    })

    it('devrait gérer les erreurs', async () => {
      const mockError = { message: 'Database error' }
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.getFormationsByProgram('1')).rejects.toEqual(mockError)
    })
  })

  describe('getGlobalStats', () => {
    it('devrait retourner les statistiques globales', async () => {
      const organizationId = 'org-1'
      const mockPrograms = [
        { id: '1', is_active: true, created_at: '2024-01-15T00:00:00Z' },
        { id: '2', is_active: true, created_at: '2024-02-01T00:00:00Z' },
        { id: '3', is_active: false, created_at: '2024-01-01T00:00:00Z' },
      ]

      const programsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPrograms, error: null }),
      }
      // getGlobalStats: 2) formations count, 3) formations ids, 4) sessions count, 5) formations ids, 6) sessions ids, 7) enrollments count
      const formationsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 2, error: null }),
      }
      const formationsIdsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 'f1' }], error: null }),
      }
      const sessionsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 3, error: null }),
      }
      const sessionsIdsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 's1' }], error: null }),
      }
      const enrollmentsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 5, error: null }),
      }

      let fromCallCount = 0
      ;(mockSupabase.from as any) = vi.fn(() => {
        fromCallCount++
        if (fromCallCount === 1) return programsChain
        if (fromCallCount === 2) return formationsCountChain // formations count
        if (fromCallCount === 3) return formationsIdsChain // formations ids pour sessions
        if (fromCallCount === 4) return sessionsCountChain // sessions count
        if (fromCallCount === 5) return formationsIdsChain // formations ids pour enrollments
        if (fromCallCount === 6) return sessionsIdsChain // sessions ids
        return enrollmentsCountChain
      })

      const result = await service.getGlobalStats(organizationId)

      expect(result).toMatchObject({
        total: 3,
        active: 2,
        inactive: 1,
        totalFormations: 2,
        totalSessions: 3,
        totalEnrollments: 5,
      })
      expect(result.statusData).toBeDefined()
      expect(result.monthlyData).toBeDefined()
    })

    it('devrait gérer une organisation sans programmes', async () => {
      const programsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => programsChain)

      const result = await service.getGlobalStats('org-empty')

      expect(result).toMatchObject({
        total: 0,
        active: 0,
        inactive: 0,
        totalFormations: 0,
        totalSessions: 0,
        totalEnrollments: 0,
      })
    })

    it('devrait gérer programmes avec formations vides (totalSessions 0, skip enrollments)', async () => {
      const mockPrograms = [
        { id: 'p1', is_active: true, created_at: '2024-01-15T00:00:00Z' },
      ]
      const programsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPrograms, error: null }),
      }
      const formationsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 0, error: null }),
      }
      const formationsEmptyChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      let fromCalls = 0
      ;(mockSupabase.from as any) = vi.fn(() => {
        fromCalls++
        if (fromCalls === 1) return programsChain
        if (fromCalls === 2) return formationsCountChain
        return formationsEmptyChain
      })

      const result = await service.getGlobalStats('org-1')

      expect(result.total).toBe(1)
      expect(result.active).toBe(1)
      expect(result.totalFormations).toBe(0)
      expect(result.totalSessions).toBe(0)
      expect(result.totalEnrollments).toBe(0)
    })

    it('devrait propager formationsError sur formations (sessions path)', async () => {
      const mockPrograms = [
        { id: 'p1', is_active: true, created_at: '2024-01-15T00:00:00Z' },
      ]
      const programsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPrograms, error: null }),
      }
      const formationsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 1, error: null }),
      }
      const formationsIdsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: { message: 'Formations fetch failed' } }),
      }
      let fromCalls = 0
      ;(mockSupabase.from as any) = vi.fn(() => {
        fromCalls++
        if (fromCalls === 1) return programsChain
        if (fromCalls === 2) return formationsCountChain
        return formationsIdsChain
      })

      await expect(service.getGlobalStats('org-1')).rejects.toMatchObject({
        message: 'Formations fetch failed',
      })
    })

    it('devrait propager sessionsError sur sessions count', async () => {
      const mockPrograms = [
        { id: 'p1', is_active: true, created_at: '2024-01-15T00:00:00Z' },
      ]
      const programsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPrograms, error: null }),
      }
      const formationsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 1, error: null }),
      }
      const formationsIdsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 'f1' }], error: null }),
      }
      const sessionsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: null, error: { message: 'Sessions count failed' } }),
      }
      let fromCalls = 0
      ;(mockSupabase.from as any) = vi.fn(() => {
        fromCalls++
        if (fromCalls === 1) return programsChain
        if (fromCalls === 2) return formationsCountChain
        if (fromCalls === 3) return formationsIdsChain
        return sessionsCountChain
      })

      await expect(service.getGlobalStats('org-1')).rejects.toMatchObject({
        message: 'Sessions count failed',
      })
    })

    it('devrait propager enrollmentsError sur enrollments count', async () => {
      const mockPrograms = [
        { id: 'p1', is_active: true, created_at: '2024-01-15T00:00:00Z' },
      ]
      const programsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPrograms, error: null }),
      }
      const formationsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 1, error: null }),
      }
      const formationsIdsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 'f1' }], error: null }),
      }
      const sessionsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 1, error: null }),
      }
      const sessionsIdsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 's1' }], error: null }),
      }
      const enrollmentsCountChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: null, error: { message: 'Enrollments count failed' } }),
      }
      let fromCalls = 0
      ;(mockSupabase.from as any) = vi.fn(() => {
        fromCalls++
        if (fromCalls === 1) return programsChain
        if (fromCalls === 2) return formationsCountChain
        if (fromCalls === 3) return formationsIdsChain
        if (fromCalls === 4) return sessionsCountChain
        if (fromCalls === 5) return formationsIdsChain
        if (fromCalls === 6) return sessionsIdsChain
        return enrollmentsCountChain
      })

      await expect(service.getGlobalStats('org-1')).rejects.toMatchObject({
        message: 'Enrollments count failed',
      })
    })
  })
})
