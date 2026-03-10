/**
 * Tests unitaires pour UserManagementService (audit P2 - priorité MOYENNE)
 * Couverture : getRoles (vide), getRoles avec organizationId
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserManagementService } from '@/lib/services/user-management.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue(result),
    is: vi.fn().mockResolvedValue(result),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('UserManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRoles', () => {
    it('retourne un tableau vide quand aucun role', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new UserManagementService(mockSupabase)

      const result = await service.getRoles()

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('roles')
    })

    it('retourne les roles quand organizationId fourni', async () => {
      const roles = [{ id: 'r1', name: 'Admin', code: 'admin', organization_id: 'org-1' }]
      const mockSupabase = createMockSupabase({ data: roles, error: null })
      const service = new UserManagementService(mockSupabase)

      const result = await service.getRoles('org-1')

      expect(result).toEqual(roles)
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.or).toHaveBeenCalled()
    })
  })
})
