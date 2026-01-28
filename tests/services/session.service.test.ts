/**
 * Tests unitaires pour SessionService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SessionService } from '@/lib/services/session.service'

// Mock Supabase client
const { mockSupabase } = vi.hoisted(() => {
  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  
  const chainableMethods = ['from', 'select', 'eq', 'gte', 'lte', 'ilike', 'order', 'insert', 'update', 'delete']
  chainableMethods.forEach((method) => {
    mock[method].mockImplementation(() => mock)
  })
  
  mock.single.mockResolvedValue({ data: null, error: null })
  
  return { mockSupabase: mock }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

vi.mock('@/lib/services/calendar.service', () => ({
  calendarService: {
    syncSession: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/services/videoconference.service', () => ({
  videoconferenceService: {
    createMeeting: vi.fn().mockResolvedValue({ id: 'meeting-123', url: 'https://meet.example.com' }),
  },
}))

describe('SessionService', () => {
  let service: SessionService

  beforeEach(() => {
    vi.clearAllMocks()
    const chainableMethods = ['from', 'select', 'eq', 'gte', 'lte', 'ilike', 'order', 'insert', 'update', 'delete']
    chainableMethods.forEach((method) => {
      ;(mockSupabase as any)[method].mockImplementation(() => mockSupabase)
    })
    ;(mockSupabase as any).single.mockResolvedValue({ data: null, error: null })
    service = new SessionService(mockSupabase as any)
  })

  describe('getAllSessions', () => {
    it('devrait récupérer toutes les sessions d\'une organisation', async () => {
      const organizationId = 'org-1'
      const mockSessions = [
        {
          id: 'session-1',
          name: 'Session Hiver 2024',
          formation_id: 'formation-1',
          status: 'scheduled',
          start_date: '2024-01-15',
          end_date: '2024-03-15',
        },
      ]

      ;(mockSupabase as any).order.mockResolvedValue({
        data: mockSessions,
        error: null,
      })

      const result = await service.getAllSessions(organizationId)

      expect(result).toEqual(mockSessions)
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
    })

    it('devrait filtrer par formation', async () => {
      const organizationId = 'org-1'
      const formationId = 'formation-1'

      ;(mockSupabase as any).order.mockResolvedValue({
        data: [],
        error: null,
      })

      await service.getAllSessions(organizationId, { formationId })

      expect(mockSupabase.eq).toHaveBeenCalledWith('formation_id', formationId)
    })

    it('devrait filtrer par statut', async () => {
      const organizationId = 'org-1'

      ;(mockSupabase as any).order.mockResolvedValue({
        data: [],
        error: null,
      })

      await service.getAllSessions(organizationId, { status: 'completed' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'completed')
    })

    it('devrait filtrer par dates', async () => {
      const organizationId = 'org-1'
      const startDate = '2024-01-01'
      const endDate = '2024-12-31'

      ;(mockSupabase as any).order.mockResolvedValue({
        data: [],
        error: null,
      })

      await service.getAllSessions(organizationId, { startDate, endDate })

      expect(mockSupabase.gte).toHaveBeenCalledWith('start_date', startDate)
      expect(mockSupabase.lte).toHaveBeenCalledWith('end_date', endDate)
    })

    it('devrait rechercher par nom', async () => {
      const organizationId = 'org-1'
      const search = 'Hiver'

      ;(mockSupabase as any).order.mockResolvedValue({
        data: [],
        error: null,
      })

      await service.getAllSessions(organizationId, { search })

      expect(mockSupabase.ilike).toHaveBeenCalledWith('name', '%Hiver%')
    })
  })

  describe('getSessionById', () => {
    it('devrait récupérer une session par son ID', async () => {
      const sessionId = 'session-1'
      const mockSession = {
        id: sessionId,
        name: 'Session Hiver 2024',
        formation_id: 'formation-1',
        formations: {
          id: 'formation-1',
          name: 'Formation Excel',
          programs: {
            id: 'program-1',
            name: 'Programme Excel',
          },
        },
      }

      // Créer une chaîne de mocks correcte pour la première requête
      const mockSingleChain = {
        single: vi.fn().mockResolvedValue({
          data: mockSession,
          error: null,
        }),
      }
      const mockEqChain = {
        eq: vi.fn().mockReturnValue(mockSingleChain),
      }
      const mockSelectChain = {
        select: vi.fn().mockReturnValue(mockEqChain),
      }

      // Mock pour la deuxième requête (session_programs)
      const mockProgramsEqChain = {
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }
      const mockProgramsSelectChain = {
        select: vi.fn().mockReturnValue(mockProgramsEqChain),
      }

      // Configurer les mocks
      ;(mockSupabase as any).from
        .mockReturnValueOnce(mockSelectChain) // Première requête: sessions
        .mockReturnValueOnce(mockProgramsSelectChain) // Deuxième requête: session_programs

      const result = await service.getSessionById(sessionId)

      expect(result).toHaveProperty('id', sessionId)
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
      expect(mockEqChain.eq).toHaveBeenCalledWith('id', sessionId)
    })

    it('devrait gérer les erreurs lors de la récupération', async () => {
      const sessionId = 'session-1'
      const mockError = { message: 'Session not found', code: 'PGRST116' }

      ;(mockSupabase as any).single.mockResolvedValue({
        data: null,
        error: mockError,
      })

      await expect(service.getSessionById(sessionId)).rejects.toEqual(mockError)
    })
  })

  describe('createSession', () => {
    it('devrait créer une nouvelle session', async () => {
      const organizationId = 'org-1'
      const sessionData = {
        formation_id: 'formation-1',
        name: 'Session Printemps 2024',
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        status: 'scheduled',
      }

      const mockCreatedSession = {
        id: 'session-new',
        ...sessionData,
        organization_id: organizationId,
      }

      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreatedSession,
          error: null,
        }),
      }

      ;(mockSupabase as any).insert.mockReturnValue(mockInsertChain)

      const result = await service.createSession(organizationId, sessionData as any)

      expect(result).toHaveProperty('id', 'session-new')
      expect(mockSupabase.insert).toHaveBeenCalled()
    })
  })
})
