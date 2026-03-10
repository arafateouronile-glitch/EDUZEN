/**
 * Tests unitaires pour ResourceLibraryService (audit - réduction services sans tests)
 * Couverture : getCategories (vide)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResourceLibraryService } from '@/lib/services/resource-library.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
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

describe('ResourceLibraryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCategories', () => {
    it('retourne un tableau vide quand aucune catégorie', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new ResourceLibraryService(mockSupabase as any)

      const result = await service.getCategories('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('resource_categories')
    })
  })
})
