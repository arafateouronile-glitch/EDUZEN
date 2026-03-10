/**
 * Tests unitaires pour PublicCatalogService (réduction services sans tests)
 * Couverture : getPublicFormations (vide)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PublicCatalogService } from '@/lib/services/public-catalog.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve(result)
      return this as Promise<typeof result>
    },
    catch: () => this,
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('PublicCatalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPublicFormations', () => {
    it('retourne un tableau vide quand aucune formation publique', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new PublicCatalogService(mockSupabase as any)

      const result = await service.getPublicFormations()

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('public_formations')
    })
  })
})
