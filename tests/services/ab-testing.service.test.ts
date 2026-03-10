/**
 * Tests unitaires pour ABTestingService (réduction services sans tests)
 * Couverture : getVariant, isTestActive (config en mémoire)
 */
import { describe, it, expect, vi } from 'vitest'
import { ABTestingService } from '@/lib/services/ab-testing.service'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({}),
}))

describe('ABTestingService', () => {
  describe('getVariant', () => {
    it('retourne control pour un test inconnu', () => {
      const service = new ABTestingService()
      expect(service.getVariant('unknown-test')).toBe('control')
    })

    it('retourne une variante pour un test connu (new-dashboard-layout)', () => {
      const service = new ABTestingService()
      const variant = service.getVariant('new-dashboard-layout', 'user-1', 'org-1')
      expect(['control', 'treatment']).toContain(variant)
    })

    it('retourne la meme variante pour le meme user et test (determinisme)', () => {
      const service = new ABTestingService()
      const v1 = service.getVariant('new-dashboard-layout', 'user-1')
      const v2 = service.getVariant('new-dashboard-layout', 'user-1')
      expect(v1).toBe(v2)
    })
  })

  describe('isTestActive', () => {
    it('retourne false pour un test inconnu', () => {
      const service = new ABTestingService()
      expect(service.isTestActive('unknown-test')).toBe(false)
    })

    it('retourne false pour un test connu quand la feature flag env nest pas active', () => {
      const service = new ABTestingService()
      expect(service.isTestActive('new-dashboard-layout')).toBe(false)
    })
  })
})
