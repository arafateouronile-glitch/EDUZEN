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
})
