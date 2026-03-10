/**
 * Tests unitaires pour TutorialVideosService (réduction services sans tests)
 * Couverture : getModules (vide), getModuleBySlug (introuvable)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TutorialVideosService } from '@/lib/services/tutorial-videos.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve(result)
      return this as Promise<typeof result>
    },
    catch: () => this,
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('TutorialVideosService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getModules', () => {
    it('retourne un tableau vide quand aucun module actif', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new TutorialVideosService(mockSupabase as any)

      const result = await service.getModules()

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('tutorial_modules')
    })
  })

  describe('getModuleBySlug', () => {
    it('lance si le module est introuvable (single retourne erreur)', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })
      const service = new TutorialVideosService(mockSupabase as any)

      await expect(service.getModuleBySlug('inexistant')).rejects.toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('tutorial_modules')
    })
  })
})
