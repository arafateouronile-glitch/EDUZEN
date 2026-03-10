/**
 * Tests unitaires pour KnowledgeBaseService (audit - réduction services sans tests)
 * Couverture : getCategories (table absente → défaut), searchArticles (vide si 42P01)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KnowledgeBaseService } from '@/lib/services/knowledge-base.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  const thenable = {
    ...chain,
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve(result)
      return this as Promise<typeof result>
    },
    catch() {
      return this
    },
  }
  return { from: vi.fn(() => thenable) } as unknown as SupabaseClient
}

describe('KnowledgeBaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCategories', () => {
    it('retourne les catégories par défaut quand la table est absente (42P01)', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      })
      const service = new KnowledgeBaseService(mockSupabase)

      const result = await service.getCategories()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(mockSupabase.from).toHaveBeenCalledWith('knowledge_base_categories')
    })

    it('retourne un tableau vide quand la requête réussit sans données', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new KnowledgeBaseService(mockSupabase)

      const result = await service.getCategories()

      expect(result).toEqual([])
    })
  })

  describe('searchArticles', () => {
    it('retourne un tableau vide quand la table est absente (42P01)', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      })
      const service = new KnowledgeBaseService(mockSupabase)

      const result = await service.searchArticles('test')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('knowledge_base_articles')
    })
  })
})
