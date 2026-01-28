/**
 * Tests unitaires pour AttendanceService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AttendanceService } from '@/lib/services/attendance.service'

// Mock Supabase client
const { mockSupabase } = vi.hoisted(() => {
  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  
  const chainableMethods = ['from', 'select', 'eq', 'gte', 'lte', 'order', 'insert', 'update', 'delete']
  chainableMethods.forEach((method) => {
    mock[method].mockImplementation(() => mock)
  })
  
  mock.single.mockResolvedValue({ data: null, error: null })
  mock.maybeSingle.mockResolvedValue({ data: null, error: null })
  
  return { mockSupabase: mock }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

// Mock helpers
vi.mock('@/lib/utils/supabase-helpers', () => ({
  getAllByOrganization: vi.fn().mockResolvedValue({
    data: [],
    total: 0,
  }),
  getById: vi.fn().mockResolvedValue(null),
}))

// Mock error handler
vi.mock('@/lib/errors', () => ({
  errorHandler: {
    handleError: vi.fn((error) => {
      if (error instanceof Error) return error
      return new Error(String(error))
    }),
  },
  AppError: class AppError extends Error {},
}))

describe('AttendanceService', () => {
  let service: AttendanceService

  beforeEach(() => {
    vi.clearAllMocks()
    const chainableMethods = ['from', 'select', 'eq', 'gte', 'lte', 'order', 'insert', 'update', 'delete']
    chainableMethods.forEach((method) => {
      ;(mockSupabase as any)[method].mockImplementation(() => mockSupabase)
    })
    ;(mockSupabase as any).single.mockResolvedValue({ data: null, error: null })
    ;(mockSupabase as any).maybeSingle.mockResolvedValue({ data: null, error: null })
    service = new AttendanceService(mockSupabase as any)
  })

  describe('getAll', () => {
    it('devrait récupérer toutes les présences d\'une organisation', async () => {
      const organizationId = 'org-1'
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')

      const mockAttendances = [
        {
          id: 'attendance-1',
          student_id: 'student-1',
          session_id: 'session-1',
          date: '2024-01-15',
          status: 'present',
        },
      ]

      vi.mocked(getAllByOrganization).mockResolvedValueOnce({
        data: mockAttendances,
        total: 1,
      } as any)

      const result = await service.getAll(organizationId)

      expect(result.data).toEqual(mockAttendances)
      expect(getAllByOrganization).toHaveBeenCalledWith(
        mockSupabase,
        'attendance',
        organizationId,
        expect.any(Object)
      )
    })

    it('devrait filtrer par étudiant', async () => {
      const organizationId = 'org-1'
      const studentId = 'student-1'
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')

      vi.mocked(getAllByOrganization).mockResolvedValueOnce({
        data: [],
        total: 0,
      } as any)

      await service.getAll(organizationId, { studentId })

      expect(getAllByOrganization).toHaveBeenCalledWith(
        mockSupabase,
        'attendance',
        organizationId,
        expect.objectContaining({
          filters: expect.objectContaining({
            student_id: studentId,
          }),
        })
      )
    })

    it('devrait filtrer par session', async () => {
      const organizationId = 'org-1'
      const sessionId = 'session-1'
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')

      vi.mocked(getAllByOrganization).mockResolvedValueOnce({
        data: [],
        total: 0,
      } as any)

      await service.getAll(organizationId, { programSessionId: sessionId })

      expect(getAllByOrganization).toHaveBeenCalledWith(
        mockSupabase,
        'attendance',
        organizationId,
        expect.objectContaining({
          filters: expect.objectContaining({
            session_id: sessionId,
          }),
        })
      )
    })

    it('devrait filtrer par date', async () => {
      const organizationId = 'org-1'
      const date = '2024-01-15'
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')

      vi.mocked(getAllByOrganization).mockResolvedValueOnce({
        data: [],
        total: 0,
      } as any)

      await service.getAll(organizationId, { date })

      expect(getAllByOrganization).toHaveBeenCalledWith(
        mockSupabase,
        'attendance',
        organizationId,
        expect.objectContaining({
          filters: expect.objectContaining({
            date,
          }),
        })
      )
    })

    it('devrait filtrer par statut', async () => {
      const organizationId = 'org-1'
      const status = 'present'
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')

      vi.mocked(getAllByOrganization).mockResolvedValueOnce({
        data: [],
        total: 0,
      } as any)

      await service.getAll(organizationId, { status })

      expect(getAllByOrganization).toHaveBeenCalledWith(
        mockSupabase,
        'attendance',
        organizationId,
        expect.objectContaining({
          filters: expect.objectContaining({
            status,
          }),
        })
      )
    })
  })

  describe('getBySessionAndDate', () => {
    it('devrait récupérer les présences pour une session et une date', async () => {
      const sessionId = 'session-1'
      const date = '2024-01-15'
      const mockAttendances = [
        {
          id: 'attendance-1',
          student_id: 'student-1',
          session_id: sessionId,
          date,
          status: 'present',
        },
      ]

      const mockQueryChain = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockAttendances,
          error: null,
        }),
      }

      ;(mockSupabase as any).select.mockReturnValue(mockQueryChain)

      const result = await service.getBySessionAndDate(sessionId, date)

      expect(result).toEqual(mockAttendances)
      expect(mockSupabase.from).toHaveBeenCalledWith('attendance')
      expect(mockQueryChain.eq).toHaveBeenCalledWith('session_id', sessionId)
      expect(mockQueryChain.eq).toHaveBeenCalledWith('date', date)
    })
  })

  describe('upsert', () => {
    it('devrait créer ou mettre à jour une présence sans géolocalisation', async () => {
      const attendanceData = {
        organization_id: 'org-1',
        student_id: 'student-1',
        session_id: 'session-1',
        date: '2024-01-15',
        status: 'present' as const,
        // Pas de latitude/longitude pour éviter l'appel à validateLocation
      }

      const mockCreatedAttendance = {
        id: 'attendance-new',
        ...attendanceData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockUpsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreatedAttendance,
          error: null,
        }),
      }

      ;(mockSupabase as any).upsert = vi.fn().mockReturnValue(mockUpsertChain)

      const result = await service.upsert(attendanceData as any)

      expect(result).toHaveProperty('id', 'attendance-new')
      expect(mockSupabase.upsert).toHaveBeenCalled()
    })
  })
})
