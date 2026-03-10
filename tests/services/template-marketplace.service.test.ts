/**
 * Tests unitaires pour TemplateMarketplaceService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TemplateMarketplaceService } from '@/lib/services/template-marketplace.service'

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('TemplateMarketplaceService', () => {
  describe('getCategories', () => {
    it('retourne un tableau vide quand aucune catégorie', async () => {
      const mockSupabase = createMockSupabase()
      const service = new TemplateMarketplaceService(mockSupabase)

      const result = await service.getCategories()

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('marketplace_categories')
    })
  })
})
