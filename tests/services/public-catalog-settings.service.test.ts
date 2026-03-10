/**
 * Tests unitaires pour PublicCatalogSettingsService (réduction services sans tests)
 * Couverture : getSettings (null)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PublicCatalogSettingsService } from '@/lib/services/public-catalog-settings.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('PublicCatalogSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('retourne null quand aucun parametre pour l organisation', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: null,
      })
      const service = new PublicCatalogSettingsService(mockSupabase as any)

      const result = await service.getSettings('org-1')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('public_catalog_settings')
    })
  })
})
