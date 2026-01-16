import { NextRequest, NextResponse } from 'next/server'
import { mobileMoneyService } from '@/lib/services/mobile-money.service'
import type { MobileMoneyProvider, WebhookPayload } from '@/lib/services/mobile-money/mobile-money.types'
import { withRateLimit, generalRateLimiter } from '@/lib/utils/rate-limiter'
import { validateWebhook } from '@/lib/utils/webhook-security'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * Mappe le statut du webhook selon le provider
 */
function mapWebhookStatus(provider: string, status: string): 'success' | 'failed' | 'pending' {
  const statusLower = status?.toLowerCase() || ''

  switch (provider) {
    case 'mtn':
      if (statusLower === 'successful' || statusLower === 'success') return 'success'
      if (statusLower === 'failed' || statusLower === 'failure') return 'failed'
      return 'pending'

    case 'orange':
      if (statusLower === 'success' || statusLower === 'successful') return 'success'
      if (statusLower === 'failed' || statusLower === 'failure') return 'failed'
      return 'pending'

    case 'airtel':
      if (statusLower === 'ts' || statusLower === 'success' || statusLower === 'successful') return 'success'
      if (statusLower === 'tf' || statusLower === 'failed' || statusLower === 'failure') return 'failed'
      return 'pending'

    default:
      return 'pending'
  }
}

/**
 * API Route pour recevoir les webhooks des opérateurs Mobile Money
 * 
 * Routes:
 * - POST /api/mobile-money/webhook/mtn
 * - POST /api/mobile-money/webhook/orange
 * - POST /api/mobile-money/webhook/airtel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { provider?: string } }
) {
  return withRateLimit(request, generalRateLimiter, async (req) => {
  try {
    // Extraire le provider de l'URL
    const url = new URL(req.url)
    const provider = params?.provider || url.pathname.split('/').pop()

    if (!provider || !['mtn', 'orange', 'airtel'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider invalide' },
        { status: 400 }
      )
    }

    // Lire le body comme texte pour la validation de signature
    const bodyText = await req.text()
    const body = JSON.parse(bodyText)

    // Valider la signature du webhook
    const webhookSecret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`] || process.env.MOBILE_MONEY_WEBHOOK_SECRET
    
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
        logger.warn('Webhook signature validation failed', {
          provider,
          error: validation.error,
          details: validation.details,
        })

        return NextResponse.json(
          { error: validation.error || 'Signature invalide' },
          { status: 401 }
        )
      }

      logger.info('Webhook signature validated', {
        provider,
        details: validation.details,
      })
    } else {
      logger.warn('Webhook secret not configured, skipping signature validation', {
        provider,
      })
    }

    // Extraire la signature si présente
    const signature = req.headers.get('x-signature') || 
                     req.headers.get('authorization')?.replace('Bearer ', '')

    // Construire le payload du webhook
    const payload: WebhookPayload = {
      transaction_id: body.transaction_id || body.transactionId || body.id,
      external_transaction_id: body.external_transaction_id || body.externalId || body.reference,
      status: mapWebhookStatus(provider, body.status || body.state),
      amount: body.amount ? parseFloat(body.amount) : undefined,
      currency: body.currency,
      phone_number: body.phone_number || body.phoneNumber || body.msisdn || body.subscriber?.msisdn,
      timestamp: body.timestamp || body.created_at || new Date().toISOString(),
      signature,
      data: body,
    }

    // Traiter le webhook
    await mobileMoneyService.processWebhook(provider as MobileMoneyProvider, payload)

    return NextResponse.json({ success: true, message: 'Webhook traité avec succès' })
  } catch (error: unknown) {
    logger.error('Mobile Money Webhook - Processing failed', error, {
      error: sanitizeError(error),
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








