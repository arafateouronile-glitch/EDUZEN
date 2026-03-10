/**
 * Tests unitaires pour SearchService (audit - réduction services sans tests)
 * Couverture : searchGlobal (requête trop courte → [])
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

import { SearchService } from '@/lib/services/search.service'

describe('SearchService', () => {
  describe('searchGlobal', () => {
    it('retourne un tableau vide quand la requête fait moins de 2 caractères', async () => {
      const service = new SearchService()
      expect(await service.searchGlobal('', 'org-1')).toEqual([])
      expect(await service.searchGlobal('a', 'org-1')).toEqual([])
      expect(await service.searchGlobal('  ', 'org-1')).toEqual([])
    })
  })
})
