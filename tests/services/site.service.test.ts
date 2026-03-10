/**
 * Tests unitaires pour SiteService (audit - réduction services sans tests)
 * Couverture : getAll (vide), getHeadquarters (null)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SiteService } from '@/lib/services/site.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve(result)
      return this as Promise<typeof result>
    },
    catch() {
      return this
    },
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('SiteService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('retourne un tableau vide quand aucun site pour l organisation', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new SiteService(mockSupabase)

      const result = await service.getAll('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('sites')
    })
  })

  describe('getHeadquarters', () => {
    it('retourne null quand aucun siège trouvé', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: null,
      })
      const service = new SiteService(mockSupabase)

      const result = await service.getHeadquarters('org-1')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('sites')
    })
  })
})
