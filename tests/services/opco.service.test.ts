/**
 * Tests unitaires pour OPCOService (audit - priorité MOYENNE)
 * Couverture : getConfigurations (vide si table absente, données si ok)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OPCOService } from '@/lib/services/opco.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('OPCOService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConfigurations', () => {
    it('retourne un tableau vide quand la table est absente (42P01)', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: '42P01', message: 'relation "opco_configurations" does not exist' },
      })
      const service = new OPCOService(mockSupabase)

      const result = await service.getConfigurations('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('opco_configurations')
    })

    it('retourne les configurations quand la requête réussit', async () => {
      const configs = [
        { id: 'c1', organization_id: 'org-1', opco_name: 'OPCO 1', is_active: true },
      ]
      const mockSupabase = createMockSupabase({ data: configs, error: null })
      const service = new OPCOService(mockSupabase)

      const result = await service.getConfigurations('org-1')

      expect(result).toEqual(configs)
    })
  })
})
