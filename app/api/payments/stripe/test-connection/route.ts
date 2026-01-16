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
    const body = await request.json()
    const { publishable_key, secret_key } = body

    if (!publishable_key || !secret_key) {
      return NextResponse.json({ error: 'Clés API requises' }, { status: 400 })
    }

    // TODO: Implémenter le test réel avec l'API Stripe
    // const stripe = require('stripe')(secret_key)
    // const account = await stripe.accounts.retrieve()
    
    // Pour l'instant, on simule le test
    // Vérifier le format des clés
    const isValidPublishableKey = publishable_key.startsWith('pk_test_') || publishable_key.startsWith('pk_live_')
    const isValidSecretKey = secret_key.startsWith('sk_test_') || secret_key.startsWith('sk_live_')

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
      test_mode: publishable_key.startsWith('pk_test_'),
    })
  } catch (error: unknown) {
    logger.error('Error testing Stripe connection', error, {
      publishableKey: publishable_key ? maskApiKey(publishable_key) : undefined,
      secretKey: secret_key ? maskApiKey(secret_key) : undefined,
      error: sanitizeError(error),
    })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 })
  }
}

