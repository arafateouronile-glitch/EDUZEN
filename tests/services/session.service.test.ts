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
    it('devrait propager l\'erreur si la requête échoue', async () => {
      const organizationId = 'org-1'
      const mockError = { message: 'Database error', code: 'PGRST_ERROR' }
      ;(mockSupabase as any).order.mockResolvedValue({
        data: null,
        error: mockError,
      })

      await expect(service.getAllSessions(organizationId)).rejects.toEqual(mockError)
    })

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
    it('devrait créer une session sans formation_id (pas de vérification formation)', async () => {
      const sessionData = {
        name: 'Session autonome',
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        status: 'scheduled',
      }
      const mockCreatedSession = { id: 'session-new', ...sessionData }
      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedSession, error: null }),
      }
      ;(mockSupabase as any).from.mockReturnValue(mockSupabase)
      ;(mockSupabase as any).insert.mockReturnValue(mockInsertChain)

      const result = await service.createSession(sessionData as any)

      expect(result).toHaveProperty('id', 'session-new')
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
      expect(mockSupabase.from).not.toHaveBeenCalledWith('formations')
    })

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

      // 1) Vérification formation : from('formations').select().eq().single()
      const formationChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'formation-1', organization_id: organizationId },
          error: null,
        }),
      }
      // 2) Création session : from('sessions').insert().select().single()
      const mockInsertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreatedSession,
          error: null,
        }),
      }

      ;(mockSupabase as any).from
        .mockReturnValueOnce(formationChain)
        .mockReturnValue(mockSupabase)
      ;(mockSupabase as any).insert.mockReturnValue(mockInsertChain)

      const result = await service.createSession(sessionData as any)

      expect(result).toHaveProperty('id', 'session-new')
      expect(mockSupabase.from).toHaveBeenCalledWith('formations')
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
    })
  })

  describe('updateSession', () => {
    it('devrait mettre à jour une session', async () => {
      const sessionId = 'session-1'
      const updates = { name: 'Session Mise à jour', status: 'in_progress' }
      const existingSession = {
        formation_id: 'formation-1',
        teacher_id: null,
        formations: { organization_id: 'org-1' },
      }
      const updatedSession = { id: sessionId, ...updates }

      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingSession, error: null }),
      }
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedSession, error: null }),
      }
      ;(mockSupabase as any).from
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(selectChain) })
        .mockReturnValueOnce(updateChain)

      const result = await service.updateSession(sessionId, updates as any)

      expect(result).toHaveProperty('name', 'Session Mise à jour')
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
    })
  })

  describe('deleteSession', () => {
    it('devrait supprimer une session', async () => {
      const sessionId = 'session-1'
      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: sessionId }, error: null }),
      }
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      ;(mockSupabase as any).from
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(selectChain) })
        .mockReturnValueOnce(deleteChain)

      await service.deleteSession(sessionId)

      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
    })

    it('devrait propager l\'erreur si le delete échoue', async () => {
      const sessionId = 'session-1'
      const mockError = { message: 'Delete failed', code: 'PGRST_ERROR' }
      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: sessionId }, error: null }),
      }
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      }
      ;(mockSupabase as any).from
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(selectChain) })
        .mockReturnValueOnce(deleteChain)

      await expect(service.deleteSession(sessionId)).rejects.toEqual(mockError)
    })
  })

  describe('getSessionPrograms', () => {
    it('devrait récupérer les programmes d\'une session', async () => {
      const sessionId = 'session-1'
      const mockData = [
        { program_id: 'prog-1', programs: { id: 'prog-1', name: 'Programme 1' } },
      ]
      const eqChain = {
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }
      const selectChain = { select: vi.fn().mockReturnValue(eqChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      const result = await service.getSessionPrograms(sessionId)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('name', 'Programme 1')
      expect(mockSupabase.from).toHaveBeenCalledWith('session_programs')
    })

    it('devrait propager l\'erreur si la requête échoue', async () => {
      const sessionId = 'session-1'
      const mockError = { message: 'DB error', code: 'PGRST_ERROR' }
      const eqChain = {
        eq: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      const selectChain = { select: vi.fn().mockReturnValue(eqChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      await expect(service.getSessionPrograms(sessionId)).rejects.toEqual(mockError)
    })
  })

  describe('updateSessionPrograms', () => {
    it('devrait accepter une liste vide de programmes', async () => {
      const sessionId = 'session-1'
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      ;(mockSupabase as any).from.mockReturnValueOnce(deleteChain)

      const result = await service.updateSessionPrograms(sessionId, [], 'org-1')

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('session_programs')
    })

    it('devrait mettre à jour les programmes d\'une session', async () => {
      const sessionId = 'session-1'
      const programIds = ['prog-1', 'prog-2']
      const organizationId = 'org-1'

      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      const insertChain = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      ;(mockSupabase as any).from
        .mockReturnValueOnce(deleteChain)
        .mockReturnValueOnce(insertChain)

      const result = await service.updateSessionPrograms(sessionId, programIds, organizationId)

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('session_programs')
    })

    it('devrait propager l\'erreur si le delete échoue', async () => {
      const mockError = { message: 'Delete failed', code: 'PGRST_ERROR' }
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      }
      ;(mockSupabase as any).from.mockReturnValue(deleteChain)

      await expect(
        service.updateSessionPrograms('session-1', ['prog-1'], 'org-1')
      ).rejects.toEqual(mockError)
    })

    it('devrait propager l\'erreur si l\'insert échoue', async () => {
      const mockError = { message: 'Insert failed', code: '23505' }
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      const insertChain = {
        insert: vi.fn().mockResolvedValue({ error: mockError }),
      }
      ;(mockSupabase as any).from
        .mockReturnValueOnce(deleteChain)
        .mockReturnValueOnce(insertChain)

      await expect(
        service.updateSessionPrograms('session-1', ['prog-1'], 'org-1')
      ).rejects.toEqual(mockError)
    })
  })

  describe('getUpcomingSessions', () => {
    it('devrait récupérer les sessions à venir', async () => {
      const mockSessions = [
        { id: 's1', name: 'Prochaine', start_date: '2025-02-01', status: 'planned', formations: {} },
      ]
      const limitChain = {
        limit: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
      }
      const orderChain = { order: vi.fn().mockReturnValue(limitChain) }
      const eqStatusChain = { eq: vi.fn().mockReturnValue(orderChain) }
      const gteChain = { gte: vi.fn().mockReturnValue(eqStatusChain) }
      const eqOrgChain = { eq: vi.fn().mockReturnValue(gteChain) }
      const selectChain = { select: vi.fn().mockReturnValue(eqOrgChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      const result = await service.getUpcomingSessions('org-1', 5)

      expect(result).toEqual(mockSessions)
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
      expect(eqOrgChain.eq).toHaveBeenCalledWith('formations.organization_id', 'org-1')
      expect(gteChain.gte).toHaveBeenCalledWith('start_date', expect.any(String))
      expect(eqStatusChain.eq).toHaveBeenCalledWith('status', 'planned')
      expect(limitChain.limit).toHaveBeenCalledWith(5)
    })

    it('devrait utiliser limit 10 par défaut', async () => {
      const limitChain = { limit: vi.fn().mockResolvedValue({ data: [], error: null }) }
      const orderChain = { order: vi.fn().mockReturnValue(limitChain) }
      const eqStatusChain = { eq: vi.fn().mockReturnValue(orderChain) }
      const gteChain = { gte: vi.fn().mockReturnValue(eqStatusChain) }
      const eqOrgChain = { eq: vi.fn().mockReturnValue(gteChain) }
      const selectChain = { select: vi.fn().mockReturnValue(eqOrgChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      await service.getUpcomingSessions('org-1')

      expect(limitChain.limit).toHaveBeenCalledWith(10)
    })

    it('devrait propager l\'erreur si la requête échoue', async () => {
      const mockError = { message: 'DB error', code: 'PGRST_ERROR' }
      const limitChain = { limit: vi.fn().mockResolvedValue({ data: null, error: mockError }) }
      const orderChain = { order: vi.fn().mockReturnValue(limitChain) }
      const eqStatusChain = { eq: vi.fn().mockReturnValue(orderChain) }
      const gteChain = { gte: vi.fn().mockReturnValue(eqStatusChain) }
      const eqOrgChain = { eq: vi.fn().mockReturnValue(gteChain) }
      const selectChain = { select: vi.fn().mockReturnValue(eqOrgChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      await expect(service.getUpcomingSessions('org-1')).rejects.toEqual(mockError)
    })
  })

  describe('getOngoingSessions', () => {
    it('devrait récupérer les sessions en cours', async () => {
      const mockSessions = [
        { id: 's1', name: 'En cours', start_date: '2025-01-01', end_date: '2025-01-31', status: 'ongoing', formations: {} },
      ]
      const orderChain = {
        order: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
      }
      const eqStatusChain = { eq: vi.fn().mockReturnValue(orderChain) }
      const gteChain = { gte: vi.fn().mockReturnValue(eqStatusChain) }
      const lteChain = { lte: vi.fn().mockReturnValue(gteChain) }
      const eqOrgChain = { eq: vi.fn().mockReturnValue(lteChain) }
      const selectChain = { select: vi.fn().mockReturnValue(eqOrgChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      const result = await service.getOngoingSessions('org-1')

      expect(result).toEqual(mockSessions)
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
      expect(eqOrgChain.eq).toHaveBeenCalledWith('formations.organization_id', 'org-1')
      expect(lteChain.lte).toHaveBeenCalledWith('start_date', expect.any(String))
      expect(gteChain.gte).toHaveBeenCalledWith('end_date', expect.any(String))
      expect(eqStatusChain.eq).toHaveBeenCalledWith('status', 'ongoing')
    })

    it('devrait propager l\'erreur si la requête échoue', async () => {
      const mockError = { message: 'DB error', code: 'PGRST_ERROR' }
      const orderChain = { order: vi.fn().mockResolvedValue({ data: null, error: mockError }) }
      const eqStatusChain = { eq: vi.fn().mockReturnValue(orderChain) }
      const gteChain = { gte: vi.fn().mockReturnValue(eqStatusChain) }
      const lteChain = { lte: vi.fn().mockReturnValue(gteChain) }
      const eqOrgChain = { eq: vi.fn().mockReturnValue(lteChain) }
      const selectChain = { select: vi.fn().mockReturnValue(eqOrgChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      await expect(service.getOngoingSessions('org-1')).rejects.toEqual(mockError)
    })
  })

  describe('addSessionToFormations', () => {
    it('devrait associer une session à des formations', async () => {
      const sessionId = 'session-1'
      const formationIds = ['f1', 'f2']
      const organizationId = 'org-1'
      const inserted = [
        { session_id: sessionId, formation_id: 'f1', organization_id: organizationId, order_index: 0 },
        { session_id: sessionId, formation_id: 'f2', organization_id: organizationId, order_index: 1 },
      ]
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: inserted, error: null }),
      }
      ;(mockSupabase as any).from.mockReturnValue(insertChain)

      const result = await service.addSessionToFormations(sessionId, formationIds, organizationId)

      expect(result).toEqual(inserted)
      expect(mockSupabase.from).toHaveBeenCalledWith('formation_sessions')
      expect(insertChain.insert).toHaveBeenCalled()
    })

    it('devrait propager l\'erreur si l\'insert échoue', async () => {
      const mockError = { message: 'Insert failed', code: '23505' }
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      ;(mockSupabase as any).from.mockReturnValue(insertChain)

      await expect(
        service.addSessionToFormations('session-1', ['f1'], 'org-1')
      ).rejects.toEqual(mockError)
    })
  })

  describe('removeSessionFromFormation', () => {
    it('devrait retirer une session d\'une formation', async () => {
      const sessionId = 'session-1'
      const formationId = 'formation-1'
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      }
      deleteChain.eq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: null })
      ;(mockSupabase as any).from.mockReturnValue(deleteChain)

      const result = await service.removeSessionFromFormation(sessionId, formationId)

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('formation_sessions')
      expect(deleteChain.eq).toHaveBeenCalledWith('session_id', sessionId)
      expect(deleteChain.eq).toHaveBeenCalledWith('formation_id', formationId)
    })

    it('devrait propager l\'erreur si le delete échoue', async () => {
      const mockError = { message: 'Delete failed', code: 'PGRST_ERROR' }
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      }
      deleteChain.eq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: mockError })
      ;(mockSupabase as any).from.mockReturnValue(deleteChain)

      await expect(
        service.removeSessionFromFormation('session-1', 'formation-1')
      ).rejects.toEqual(mockError)
    })
  })

  describe('getSessionFormations', () => {
    it('devrait récupérer les formations d\'une session', async () => {
      const sessionId = 'session-1'
      const mockData = [
        { formation_id: 'f1', order_index: 0, formations: { id: 'f1', name: 'Formation 1' } },
        { formation_id: 'f2', order_index: 1, formations: { id: 'f2', name: 'Formation 2' } },
      ]
      const orderChain = { order: vi.fn().mockResolvedValue({ data: mockData, error: null }) }
      const eqChain = { eq: vi.fn().mockReturnValue(orderChain) }
      const selectChain = { select: vi.fn().mockReturnValue(eqChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      const result = await service.getSessionFormations(sessionId)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('name', 'Formation 1')
      expect(result[1]).toHaveProperty('name', 'Formation 2')
      expect(mockSupabase.from).toHaveBeenCalledWith('formation_sessions')
      expect(eqChain.eq).toHaveBeenCalledWith('session_id', sessionId)
    })

    it('devrait propager l\'erreur si la requête échoue', async () => {
      const sessionId = 'session-1'
      const mockError = { message: 'DB error', code: 'PGRST_ERROR' }
      const orderChain = { order: vi.fn().mockResolvedValue({ data: null, error: mockError }) }
      const eqChain = { eq: vi.fn().mockReturnValue(orderChain) }
      const selectChain = { select: vi.fn().mockReturnValue(eqChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      await expect(service.getSessionFormations(sessionId)).rejects.toEqual(mockError)
    })
  })

  describe('getFormationSessions', () => {
    it('devrait récupérer les sessions d\'une formation', async () => {
      const formationId = 'formation-1'
      const mockData = [
        { session_id: 's1', order_index: 0, sessions: { id: 's1', name: 'Session 1' } },
        { session_id: 's2', order_index: 1, sessions: { id: 's2', name: 'Session 2' } },
      ]
      const orderChain = { order: vi.fn().mockResolvedValue({ data: mockData, error: null }) }
      const eqChain = { eq: vi.fn().mockReturnValue(orderChain) }
      const selectChain = { select: vi.fn().mockReturnValue(eqChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      const result = await service.getFormationSessions(formationId)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('name', 'Session 1')
      expect(result[1]).toHaveProperty('name', 'Session 2')
      expect(mockSupabase.from).toHaveBeenCalledWith('formation_sessions')
      expect(eqChain.eq).toHaveBeenCalledWith('formation_id', formationId)
    })

    it('devrait propager l\'erreur si la requête échoue', async () => {
      const formationId = 'formation-1'
      const mockError = { message: 'DB error', code: 'PGRST_ERROR' }
      const orderChain = { order: vi.fn().mockResolvedValue({ data: null, error: mockError }) }
      const eqChain = { eq: vi.fn().mockReturnValue(orderChain) }
      const selectChain = { select: vi.fn().mockReturnValue(eqChain) }
      ;(mockSupabase as any).from.mockReturnValue(selectChain)

      await expect(service.getFormationSessions(formationId)).rejects.toEqual(mockError)
    })
  })

  describe('updateSessionFormations', () => {
    it('devrait remplacer les formations d\'une session', async () => {
      const sessionId = 'session-1'
      const formationIds = ['f1', 'f2']
      const organizationId = 'org-1'
      const inserted = [
        { session_id: sessionId, formation_id: 'f1', organization_id: organizationId, order_index: 0 },
        { session_id: sessionId, formation_id: 'f2', organization_id: organizationId, order_index: 1 },
      ]
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: inserted, error: null }),
      }
      ;(mockSupabase as any).from
        .mockReturnValueOnce(deleteChain)
        .mockReturnValueOnce(insertChain)

      const result = await service.updateSessionFormations(sessionId, formationIds, organizationId)

      expect(result).toEqual(inserted)
      expect(mockSupabase.from).toHaveBeenCalledWith('formation_sessions')
      expect(deleteChain.eq).toHaveBeenCalledWith('session_id', sessionId)
      expect(insertChain.insert).toHaveBeenCalled()
    })

    it('devrait retourner [] si formationIds vide', async () => {
      const sessionId = 'session-1'
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      ;(mockSupabase as any).from.mockReturnValue(deleteChain)

      const result = await service.updateSessionFormations(sessionId, [], 'org-1')

      expect(result).toEqual([])
      expect(deleteChain.eq).toHaveBeenCalledWith('session_id', sessionId)
    })

    it('devrait propager l\'erreur si la suppression échoue', async () => {
      const sessionId = 'session-1'
      const mockError = { message: 'Delete failed', code: 'PGRST_ERROR' }
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      }
      ;(mockSupabase as any).from.mockReturnValue(deleteChain)

      await expect(
        service.updateSessionFormations(sessionId, ['f1'], 'org-1')
      ).rejects.toEqual(mockError)
    })
  })

  describe('createIndependentSession', () => {
    it('devrait créer une session sans formation', async () => {
      const sessionData = {
        organization_id: 'org-1',
        name: 'Session autonome',
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        status: 'scheduled',
      }
      const mockCreated = { id: 'session-indep', ...sessionData, formation_id: null }
      const insertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreated, error: null }),
      }
      ;(mockSupabase as any).from.mockReturnValue({
        ...mockSupabase,
        insert: vi.fn().mockReturnValue(insertChain),
      })

      const result = await service.createIndependentSession(sessionData as any)

      expect(result).toHaveProperty('id', 'session-indep')
      expect(result).toHaveProperty('formation_id', null)
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
    })

    it('devrait appeler updateSessionPrograms quand programIds fourni (l.665)', async () => {
      const sessionData = {
        organization_id: 'org-1',
        name: 'Session + programmes',
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        status: 'scheduled',
      }
      const mockCreated = { id: 'sess-1', ...sessionData, formation_id: null }
      const insertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreated, error: null }),
      }
      ;(mockSupabase as any).from.mockReturnValue({
        ...mockSupabase,
        insert: vi.fn().mockReturnValue(insertChain),
      })
      const updateProgramsSpy = vi.spyOn(service, 'updateSessionPrograms').mockResolvedValue(undefined)

      await service.createIndependentSession(sessionData as any, ['prog-1', 'prog-2'])

      expect(updateProgramsSpy).toHaveBeenCalledWith('sess-1', ['prog-1', 'prog-2'], 'org-1')
      updateProgramsSpy.mockRestore()
    })

    it('devrait appeler addSessionToFormations quand formationIds fourni (l.670)', async () => {
      const sessionData = {
        organization_id: 'org-1',
        name: 'Session + formations',
        start_date: '2024-04-01',
        end_date: '2024-06-30',
        status: 'scheduled',
      }
      const mockCreated = { id: 'sess-2', ...sessionData, formation_id: null }
      const insertChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreated, error: null }),
      }
      ;(mockSupabase as any).from.mockReturnValue({
        ...mockSupabase,
        insert: vi.fn().mockReturnValue(insertChain),
      })
      const addFormationsSpy = vi.spyOn(service, 'addSessionToFormations').mockResolvedValue(undefined)

      await service.createIndependentSession(sessionData as any, undefined, ['form-1'])

      expect(addFormationsSpy).toHaveBeenCalledWith('sess-2', ['form-1'], 'org-1')
      addFormationsSpy.mockRestore()
    })
  })
})
