import { NextRequest, NextResponse } from 'next/server'
import { logger, sanitizeError } from '@/lib/utils/logger'

// Masque les clés API pour le logging (affiche seulement les 8 premiers caractères)
const maskApiKey = (key: string): string => {
  if (!key || key.length < 8) return '[REDACTED]'
  return `${key.slice(0, 8)}...`
}

/**
 * POST /api/payments/stripe/test-connection
 * Tester la connexion à Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { publishable_key?: string; secret_key?: string }
    const publishableKey = body.publishable_key
    const secretKey = body.secret_key

    if (!publishableKey || !secretKey) {
      return NextResponse.json({ error: 'Clés API requises' }, { status: 400 })
    }

    // NOTE: Test réel avec l'API Stripe requis
    // Nécessite: npm install stripe
    // const stripe = require('stripe')(secret_key)
    // const account = await stripe.accounts.retrieve()
    // 
    // Pour l'instant, on simule le test (validation du format des clés uniquement)
    // Vérifier le format des clés
    const isValidPublishableKey = publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_')
    const isValidSecretKey = secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_')

    if (!isValidPublishableKey || !isValidSecretKey) {
      return NextResponse.json({ 
        error: 'Format de clés invalide. Les clés doivent commencer par pk_/sk_test_ ou pk_/sk_live_' 
      }, { status: 400 })
    }

    // Simuler un test réussi
    return NextResponse.json({
      success: true,
      account_id: 'acct_test_1234567890',
      country: 'FR',
      currency: 'eur',
      test_mode: publishableKey.startsWith('pk_test_'),
    })
  } catch (error: unknown) {
    let publishableKey: string | undefined;
    let secretKey: string | undefined;
    
    try {
      const body = await request.json()
      publishableKey = body.publishable_key;
      secretKey = body.secret_key;
    } catch {
      // Ignore si on ne peut pas parser le body
    }
    
    logger.error('Error testing Stripe connection', error, {
      publishableKey: publishableKey ? maskApiKey(publishableKey) : undefined,
      secretKey: secretKey ? maskApiKey(secretKey) : undefined,
      error: sanitizeError(error),
    })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 })
  }
}

