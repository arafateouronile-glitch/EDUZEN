import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MobileMoneyService } from '@/lib/services/mobile-money.service'
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
  { params }: { params: Promise<{ provider?: string }> }
) {
  return withRateLimit(request, generalRateLimiter, async (req) => {
  try {
    const resolvedParams = await params
    // Extraire le provider de l'URL
    const url = new URL(req.url)
    const provider = resolvedParams?.provider || url.pathname.split('/').pop()

    if (!provider || !['mtn', 'orange', 'airtel'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider invalide' },
        { status: 400 }
      )
    }

    // Lire le body comme texte pour la validation de signature
    const bodyText = await req.text()
    let body: Record<string, unknown>
    try {
      body = JSON.parse(bodyText)
    } catch {
      logger.warn('Mobile Money Webhook - Invalid JSON body', { provider })
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
    }

    // Valider la signature du webhook (obligatoire)
    const webhookSecret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`] || process.env.MOBILE_MONEY_WEBHOOK_SECRET

    if (!webhookSecret) {
      logger.warn('Webhook secret not configured, rejecting request', { provider })
      return NextResponse.json(
        { error: 'Webhook non configuré pour ce provider' },
        { status: 503 }
      )
    }

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

    // Extraire la signature si présente
    const signature = req.headers.get('x-signature') || 
                     req.headers.get('authorization')?.replace('Bearer ', '')

    // Construire le payload du webhook
    const b = body as Record<string, any>
    const payload: WebhookPayload = {
      provider: provider as MobileMoneyProvider,
      transaction_id: (b.transaction_id || b.transactionId || b.id) as string,
      status: mapWebhookStatus(provider, (b.status || b.state) as string),
      amount: b.amount != null ? Number(b.amount) : 0,
      currency: (b.currency || 'XOF') as string,
      phone_number: (b.phone_number || b.phoneNumber || b.msisdn || b.subscriber?.msisdn) as string | undefined,
      timestamp: (b.timestamp || b.created_at || new Date().toISOString()) as string,
      metadata: {
        external_transaction_id: b.external_transaction_id || b.externalId || b.reference,
        signature,
        raw_data: body,
      } as Record<string, unknown>,
    }

    // Traiter le webhook
    const supabase = await createClient()
    const mobileMoneyService = new MobileMoneyService(supabase)
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








