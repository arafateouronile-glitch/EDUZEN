/**
 * Tests unitaires pour EmailTemplateService (audit - réduction services sans tests)
 * Couverture : getAll (vide)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmailTemplateService } from '@/lib/services/email-template.service'
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

describe('EmailTemplateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('retourne un tableau vide quand aucun template', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new EmailTemplateService(mockSupabase)

      const result = await service.getAll('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('email_templates')
    })
  })
})
