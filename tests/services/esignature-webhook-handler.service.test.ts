/**
 * Tests unitaires pour ESignatureWebhookHandlerService (audit - priorité HAUTE)
 * Couverture : processWebhookEvent (cas default non géré, erreur propagée)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ESignatureWebhookHandlerService,
  type SignatureWebhookEvent,
  type WebhookProcessingResult,
} from '@/lib/services/esignature-webhook-handler.service'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('ESignatureWebhookHandlerService', () => {
  let service: ESignatureWebhookHandlerService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ESignatureWebhookHandlerService()
  })

  describe('processWebhookEvent', () => {
    it('retourne success true pour un type d evenement non géré (default)', async () => {
      const event = {
        provider: 'yousign' as const,
        eventType: 'other.unknown',
      } as SignatureWebhookEvent
      const result = await service.processWebhookEvent(event)
      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('non traité'),
      } as WebhookProcessingResult)
    })

    it('propage l erreur si createClient échoue', async () => {
      vi.mocked(createClient).mockRejectedValueOnce(new Error('DB error'))
      const event = {
        provider: 'yousign' as const,
        eventType: 'signature.signed' as const,
        signatureId: 'sig-1',
        documentId: 'doc-1',
        signerEmail: 'a@b.com',
      }
      await expect(service.processWebhookEvent(event)).rejects.toThrow('DB error')
    })
  })
})
