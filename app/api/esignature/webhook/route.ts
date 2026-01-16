import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, generalRateLimiter } from '@/lib/utils/rate-limiter'
import { validateWebhook } from '@/lib/utils/webhook-security'
import { logger } from '@/lib/utils/logger'

/**
 * API Route pour recevoir les webhooks des services de signature électronique
 * 
 * Supporte:
 * - DocuSign
 * - HelloSign
 * - SignNow
 * - Autres services compatibles
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, generalRateLimiter, async (req) => {
    try {
      // Lire le body comme texte pour la validation de signature
      const bodyText = await req.text()
      const body = JSON.parse(bodyText)

      // Détecter le provider depuis le header ou le body
      const provider = req.headers.get('x-provider') || body.provider || 'unknown'

      // Valider la signature du webhook
      const webhookSecret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`] || 
                           process.env.ESIGNATURE_WEBHOOK_SECRET

      if (webhookSecret) {
        const validation = await validateWebhook(
          req,
          {
            secret: webhookSecret,
            signatureHeader: 'x-signature',
            timestampHeader: 'x-timestamp',
            nonceHeader: 'x-nonce',
            maxAge: 300, // 5 minutes
          },
          bodyText
        )

        if (!validation.valid) {
          logger.warn('E-signature webhook signature validation failed', {
            provider,
            error: validation.error,
            details: validation.details,
          })

          return NextResponse.json(
            { error: validation.error || 'Signature invalide' },
            { status: 401 }
          )
        }

        logger.info('E-signature webhook signature validated', {
          provider,
          details: validation.details,
        })
      } else {
        logger.warn('E-signature webhook secret not configured, skipping signature validation', {
          provider,
        })
      }

      // Traiter le webhook selon le type d'événement
      const eventType = body.event || body.type || 'unknown'

      logger.info('E-signature webhook received', {
        provider,
        eventType,
        documentId: body.document_id || body.documentId,
      })

      // Importer le service de traitement des webhooks
      const { webhookHandlerService } = await import('@/lib/services/esignature-webhook-handler.service')

      // Parser le webhook selon le provider
      let webhookEvent
      switch (provider.toLowerCase()) {
        case 'yousign':
          webhookEvent = webhookHandlerService.parseYousignWebhook(body)
          break

        case 'docusign':
          webhookEvent = webhookHandlerService.parseDocuSignWebhook(body)
          break

        case 'hellosign':
        case 'dropbox-sign': // HelloSign est maintenant Dropbox Sign
          webhookEvent = webhookHandlerService.parseHelloSignWebhook(body)
          break

        default:
          // Provider inconnu ou générique
          logger.warn('Provider non reconnu, traitement générique', { provider })
          webhookEvent = {
            provider: 'other' as const,
            eventType: 'signature.created' as const,
            signatureId: body.signature_id || body.id,
            documentId: body.document_id || body.documentId,
            signerEmail: body.signer_email || body.email,
            signerName: body.signer_name || body.name,
            signedAt: body.signed_at || body.signedAt,
            status: body.status,
            metadata: body.metadata || body,
            rawPayload: body,
          }
      }

      // Traiter l'événement
      const result = await webhookHandlerService.processWebhookEvent(webhookEvent)

      logger.info('E-signature webhook processed', {
        provider,
        eventType: webhookEvent.eventType,
        success: result.success,
        action: result.action,
      })

      return NextResponse.json({
        success: result.success,
        message: result.message,
        eventType: webhookEvent.eventType,
        action: result.action,
      })
    } catch (error: unknown) {
      logger.error('Error processing e-signature webhook', error instanceof Error ? error : new Error(String(error)), {
        path: req.nextUrl.pathname,
      })

      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du traitement du webhook'
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 }
      )
    }
  })
}
