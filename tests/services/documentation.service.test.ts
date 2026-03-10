/**
 * Tests unitaires pour DocumentationService (audit - réduction services sans tests)
 * Couverture : getCategories (vide)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocumentationService } from '@/lib/services/documentation.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
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

describe('DocumentationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCategories', () => {
    it('retourne un tableau vide quand aucune catégorie', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new DocumentationService(mockSupabase as any)

      const result = await service.getCategories(undefined, true)

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('documentation_categories')
    })
  })
})
