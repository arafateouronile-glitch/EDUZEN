/**
 * Tests unitaires pour AuditorPortalService (audit - priorité MOYENNE)
 * Couverture : validateToken (null si lien absent), constructor exige un client
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditorPortalService } from '@/lib/services/auditor-portal.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('AuditorPortalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exige un SupabaseClient au constructeur', () => {
    expect(() => new AuditorPortalService(null as unknown as SupabaseClient)).toThrow(
      'SupabaseClient is required'
    )
  })

  describe('validateToken', () => {
    it('retourne null quand aucun lien actif pour le token', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })
      const service = new AuditorPortalService(mockSupabase)

      const result = await service.validateToken('token-inexistant')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('auditor_access_links')
    })
  })
})
