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
})
