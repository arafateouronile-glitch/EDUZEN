/**
 * Tests unitaires pour templateAnalyticsService (réduction services sans tests)
 * Service non implémenté - tests des comportements actuels
 */
import { describe, it, expect } from 'vitest'
import { templateAnalyticsService } from '@/lib/services/template-analytics.service'

describe('templateAnalyticsService', () => {
  describe('logEvent', () => {
    it('retourne null (non implémenté)', async () => {
      const result = await templateAnalyticsService.logEvent('tpl-1', 'view')
      expect(result).toBeNull()
    })
  })
})
