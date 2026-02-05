/**
 * Tests unitaires pour FormationService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FormationService } from '@/lib/services/formation.service'
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

describe('FormationService', () => {
  let service: FormationService
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    service = new FormationService(mockSupabase)
    vi.clearAllMocks()
  })

  describe('getAllFormations', () => {
    it('devrait récupérer toutes les formations d\'une organisation', async () => {
      const mockFormations = [
        { id: '1', name: 'Formation 1', organization_id: 'org-1', program_id: 'prog-1' },
        { id: '2', name: 'Formation 2', organization_id: 'org-1', program_id: 'prog-1' },
      ]

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockFormations, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.getAllFormations('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('formations')
      expect(result).toEqual(mockFormations)
    })

    it('devrait filtrer par programId', async () => {
      const mockFormations: any[] = []

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockFormations, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await service.getAllFormations('org-1', { programId: 'prog-1' })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('program_id', 'prog-1')
    })

    it('devrait filtrer par isActive', async () => {
      const mockFormations: any[] = []

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockFormations, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await service.getAllFormations('org-1', { isActive: true })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('devrait filtrer par isActive false', async () => {
      const mockFormations: any[] = []
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockFormations, error: null }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await service.getAllFormations('org-1', { isActive: false })

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', false)
    })

    it('devrait rechercher par texte', async () => {
      const mockFormations: any[] = []

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockFormations, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await service.getAllFormations('org-1', { search: 'test' })

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

      await expect(service.getAllFormations('org-1')).rejects.toEqual(mockError)
    })
  })

  describe('getFormationById', () => {
    it('devrait récupérer une formation par son ID', async () => {
      const mockFormation = {
        id: '1',
        name: 'Formation 1',
        organization_id: 'org-1',
        programs: [],
        sessions: [],
      }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockFormation, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.getFormationById('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('formations')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockFormation)
    })

    it('devrait gérer les erreurs', async () => {
      const mockError = { message: 'Formation not found', code: 'PGRST116' }

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.getFormationById('1')).rejects.toEqual(mockError)
    })
  })

  describe('createFormation', () => {
    it('devrait créer une nouvelle formation', async () => {
      const newFormation = {
        name: 'New Formation',
        organization_id: 'org-1',
        program_id: 'prog-1',
        is_active: true,
      }

      const createdFormation = {
        id: '1',
        ...newFormation,
        created_at: new Date().toISOString(),
      }

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdFormation, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.createFormation(newFormation)

      expect(mockSupabase.from).toHaveBeenCalledWith('formations')
      expect(result).toEqual(createdFormation)
    })

    it('devrait gérer les erreurs de création', async () => {
      const newFormation = {
        name: 'New Formation',
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

      await expect(service.createFormation(newFormation)).rejects.toEqual(mockError)
    })
  })

  describe('updateFormation', () => {
    it('devrait mettre à jour une formation', async () => {
      const updates = { name: 'Updated Formation' }
      const updatedFormation = {
        id: '1',
        name: 'Updated Formation',
        organization_id: 'org-1',
      }

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedFormation, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.updateFormation('1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('formations')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(updatedFormation)
    })

    it('devrait gérer les erreurs de mise à jour', async () => {
      const updates = { name: 'Updated Formation' }
      const mockError = { message: 'Update failed', code: 'PGRST_ERROR' }

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.updateFormation('1', updates)).rejects.toEqual(mockError)
    })
  })

  describe('deleteFormation', () => {
    it('devrait supprimer une formation (soft delete)', async () => {
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', deleted_at: new Date() }, error: null }),
      }

      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await service.deleteFormation('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('formations')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1')
    })
  })

  describe('getSessionsByFormation', () => {
    it('devrait récupérer les sessions d\'une formation (legacy)', async () => {
      const mockSessions = [
        { id: 's1', name: 'Session 1', formation_id: 'formation-1', start_date: '2024-01-01' },
      ]
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.getSessionsByFormation('formation-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('formation_id', 'formation-1')
      expect(result).toEqual(mockSessions)
    })

    it('devrait gérer les erreurs', async () => {
      const mockError = { message: 'DB error', code: 'PGRST_ERROR' }
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.getSessionsByFormation('formation-1')).rejects.toEqual(mockError)
    })
  })

  describe('getAllSessionsForFormation', () => {
    it('devrait récupérer toutes les sessions (N:N + directes)', async () => {
      const linkedSessions = [
        { session_id: 's1', order_index: 0, sessions: { id: 's1', name: 'Linked' } },
      ]
      const directSessions = [{ id: 's2', name: 'Direct' }]
      const formationSessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: linkedSessions, error: null }),
      }
      const sessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: directSessions, error: null }),
      }
      ;(mockSupabase.from as any)
        .mockReturnValueOnce(formationSessionsChain)
        .mockReturnValueOnce(sessionsChain)

      const result = await service.getAllSessionsForFormation('formation-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('formation_sessions')
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
      expect(result).toHaveLength(2)
      expect(result.map((s: { id: string }) => s.id)).toContain('s1')
      expect(result.map((s: { id: string }) => s.id)).toContain('s2')
    })

    it('devrait gérer les erreurs sur formation_sessions', async () => {
      const mockError = { message: 'DB error', code: 'PGRST_ERROR' }
      const formationSessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      ;(mockSupabase.from as any).mockReturnValueOnce(formationSessionsChain)

      await expect(service.getAllSessionsForFormation('formation-1')).rejects.toEqual(mockError)
    })

    it('devrait propager l\'erreur si la requête sessions (direct) échoue', async () => {
      const linkedSessions = [
        { session_id: 's1', order_index: 0, sessions: { id: 's1', name: 'Linked' } },
      ]
      const mockError = { message: 'Sessions DB error', code: 'PGRST_ERROR' }
      const formationSessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: linkedSessions, error: null }),
      }
      const sessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      ;(mockSupabase.from as any)
        .mockReturnValueOnce(formationSessionsChain)
        .mockReturnValueOnce(sessionsChain)

      await expect(service.getAllSessionsForFormation('formation-1')).rejects.toEqual(mockError)
    })

    it('devrait dédupliquer si une session est à la fois liée N:N et directe', async () => {
      const linkedSessions = [
        { session_id: 's1', order_index: 0, sessions: { id: 's1', name: 'Linked' } },
      ]
      const directSessions = [{ id: 's1', name: 'Direct' }]
      const formationSessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: linkedSessions, error: null }),
      }
      const sessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: directSessions, error: null }),
      }
      ;(mockSupabase.from as any)
        .mockReturnValueOnce(formationSessionsChain)
        .mockReturnValueOnce(sessionsChain)

      const result = await service.getAllSessionsForFormation('formation-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('s1')
    })

    it('devrait gérer directSessions null (fallback [])', async () => {
      const formationSessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      const sessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      ;(mockSupabase.from as any)
        .mockReturnValueOnce(formationSessionsChain)
        .mockReturnValueOnce(sessionsChain)

      const result = await service.getAllSessionsForFormation('formation-1')

      expect(result).toEqual([])
    })

    it('devrait exclure les lignes formation_sessions dont sessions est null', async () => {
      const linkedSessions = [
        { session_id: 's1', order_index: 0, sessions: null },
        { session_id: 's2', order_index: 1, sessions: { id: 's2', name: 'Valid' } },
      ]
      const directSessions: unknown[] = []
      const formationSessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: linkedSessions, error: null }),
      }
      const sessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: directSessions, error: null }),
      }
      ;(mockSupabase.from as any)
        .mockReturnValueOnce(formationSessionsChain)
        .mockReturnValueOnce(sessionsChain)

      const result = await service.getAllSessionsForFormation('formation-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('s2')
    })
  })

  describe('addSessionsToFormation', () => {
    it('devrait associer des sessions à une formation', async () => {
      const inserted = [
        { formation_id: 'formation-1', session_id: 's1', organization_id: 'org-1', order_index: 0 },
      ]
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: inserted, error: null }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.addSessionsToFormation('formation-1', ['s1'], 'org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('formation_sessions')
      expect(mockQueryBuilder.insert).toHaveBeenCalled()
      expect(result).toEqual(inserted)
    })

    it('devrait associer plusieurs sessions avec order_index', async () => {
      const inserted = [
        { formation_id: 'f1', session_id: 's1', organization_id: 'org-1', order_index: 0 },
        { formation_id: 'f1', session_id: 's2', organization_id: 'org-1', order_index: 1 },
      ]
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: inserted, error: null }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      const result = await service.addSessionsToFormation('f1', ['s1', 's2'], 'org-1')

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(inserted)
      expect(result).toEqual(inserted)
    })

    it('devrait gérer les erreurs', async () => {
      const mockError = { message: 'Insert failed', code: '23505' }
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => mockQueryBuilder)

      await expect(service.addSessionsToFormation('formation-1', ['s1'], 'org-1')).rejects.toEqual(mockError)
    })
  })

  describe('removeSessionFromFormation', () => {
    it('devrait retirer une session d\'une formation', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      }
      deleteChain.eq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: null })
      ;(mockSupabase.from as any) = vi.fn(() => deleteChain)

      const result = await service.removeSessionFromFormation('formation-1', 's1')

      expect(mockSupabase.from).toHaveBeenCalledWith('formation_sessions')
      expect(result).toBe(true)
    })

    it('devrait gérer les erreurs', async () => {
      const mockError = { message: 'Delete failed', code: 'PGRST_ERROR' }
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      }
      deleteChain.eq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: mockError })
      ;(mockSupabase.from as any) = vi.fn(() => deleteChain)

      await expect(service.removeSessionFromFormation('formation-1', 's1')).rejects.toEqual(mockError)
    })
  })

  describe('updateFormationSessions', () => {
    it('devrait remplacer les sessions associées', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ formation_id: 'formation-1', session_id: 's1' }], error: null }),
      }
      ;(mockSupabase.from as any)
        .mockReturnValueOnce(deleteChain)
        .mockReturnValueOnce(insertChain)

      const result = await service.updateFormationSessions('formation-1', ['s1'], 'org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('formation_sessions')
      expect(result).toEqual([{ formation_id: 'formation-1', session_id: 's1' }])
    })

    it('devrait retourner [] si aucune session', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => deleteChain)

      const result = await service.updateFormationSessions('formation-1', [], 'org-1')

      expect(result).toEqual([])
    })

    it('devrait propager l\'erreur si la suppression échoue', async () => {
      const mockError = { message: 'Delete failed', code: 'PGRST_ERROR' }
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      }
      ;(mockSupabase.from as any) = vi.fn(() => deleteChain)

      await expect(service.updateFormationSessions('formation-1', ['s1'], 'org-1')).rejects.toEqual(
        mockError
      )
    })
  })

  describe('getFormationWithAllSessions', () => {
    it('devrait retourner une formation avec toutes ses sessions', async () => {
      const mockFormation = { id: '1', name: 'Formation 1', organization_id: 'org-1' }
      const linkedSessions = [{ session_id: 's1', sessions: { id: 's1', name: 'S1' } }]
      const directSessions: any[] = []

      const formationChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockFormation, error: null }),
      }
      const formationSessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: linkedSessions, error: null }),
      }
      const sessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: directSessions, error: null }),
      }
      ;(mockSupabase.from as any)
        .mockReturnValueOnce(formationChain)
        .mockReturnValueOnce(formationSessionsChain)
        .mockReturnValueOnce(sessionsChain)

      const result = await service.getFormationWithAllSessions('1')

      expect(result).toHaveProperty('id', '1')
      expect(result).toHaveProperty('all_sessions')
      expect((result as any).all_sessions).toHaveLength(1)
    })

    it('devrait retourner null si formation introuvable', async () => {
      const formationChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      ;(mockSupabase.from as any).mockReturnValueOnce(formationChain)

      const result = await service.getFormationWithAllSessions('nonexistent')

      expect(result).toBeNull()
    })

    it('devrait propager l\'erreur si getAllSessionsForFormation échoue', async () => {
      const mockFormation = { id: '1', name: 'F1', organization_id: 'org-1' }
      const formationChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockFormation, error: null }),
      }
      const formationSessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      const mockError = { message: 'Sessions fetch failed', code: 'PGRST_ERROR' }
      const sessionsChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }
      ;(mockSupabase.from as any)
        .mockReturnValueOnce(formationChain)
        .mockReturnValueOnce(formationSessionsChain)
        .mockReturnValueOnce(sessionsChain)

      await expect(service.getFormationWithAllSessions('1')).rejects.toEqual(mockError)
    })
  })
})
