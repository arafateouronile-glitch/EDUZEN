/**
 * Tests unitaires pour TemplateCollaborationService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TemplateCollaborationService } from '@/lib/services/template-collaboration.service'

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('TemplateCollaborationService', () => {
  describe('getTemplateShares', () => {
    it('retourne un tableau vide quand aucun partage', async () => {
      const mockSupabase = createMockSupabase()
      const service = new TemplateCollaborationService(mockSupabase)

      const result = await service.getTemplateShares('tpl-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('template_shares')
    })
  })
})
