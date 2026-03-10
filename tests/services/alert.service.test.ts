/**
 * Tests unitaires pour AlertService (réduction services sans tests)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AlertService } from '@/lib/services/alert.service'

vi.mock('@/lib/services/email.service', () => ({
  emailService: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}))

import { emailService } from '@/lib/services/email.service'

describe('AlertService', () => {
  let service: AlertService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AlertService()
  })

  describe('sendAlert', () => {
    it('termine sans erreur avec canal email et destinataires', async () => {
      await expect(
        service.sendAlert({
          level: 'warning',
          title: 'Test',
          message: 'Message test',
          channel: 'email',
          recipients: ['admin@example.com'],
        })
      ).resolves.toBeUndefined()
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          subject: '[WARNING] Test',
          html: expect.any(String),
        })
      )
    })

    it('termine sans erreur avec canal slack (pas de webhook)', async () => {
      await expect(
        service.sendAlert({
          level: 'info',
          title: 'Info',
          message: 'Message',
          channel: 'slack',
        })
      ).resolves.toBeUndefined()
    })
  })
})
