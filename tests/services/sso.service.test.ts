/**
 * Tests unitaires pour SSOService (audit - réduction services sans tests)
 * Couverture : getProviders (vide quand erreur ou pas de config)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SSOService } from '@/lib/services/sso.service'
import { createClient } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

function createChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve(result)
      return this as Promise<typeof result>
    },
    catch() {
      return this
    },
  }
  return chain
}

describe('SSOService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProviders', () => {
    it('retourne un tableau vide quand erreur ou pas de configuration', async () => {
      vi.mocked(createClient).mockReturnValue({
        from: () => createChain({ data: null, error: { message: 'Table not found' } }),
      } as any)
      const service = new SSOService()

      const result = await service.getProviders('org-1')

      expect(result).toEqual([])
      expect(createClient).toHaveBeenCalled()
    })

    it('retourne la liste des providers quand la requête réussit', async () => {
      const configs = [
        {
          id: 'c1',
          name: 'Google',
          organization_id: 'org-1',
          is_active: true,
          saml_entity_id: null,
        },
      ]
      vi.mocked(createClient).mockReturnValue({
        from: () => createChain({ data: configs, error: null }),
      } as any)
      const service = new SSOService()

      const result = await service.getProviders('org-1')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Google')
      expect(result[0].type).toBe('oauth')
    })
  })
})

