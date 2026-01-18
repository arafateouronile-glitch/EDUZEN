import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, mutationRateLimiter } from '@/lib/utils/rate-limiter'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

// Masque un IBAN pour le logging (affiche seulement les 4 derniers caractères)
const maskIBAN = (iban: string): string => {
  if (!iban || iban.length < 4) return '[REDACTED]'
  return `****${iban.slice(-4)}`
}

/**
 * POST /api/payments/sepa/create-direct-debit
 * Créer un prélèvement SEPA
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, mutationRateLimiter, async (req) => {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      amount,
      currency = 'EUR',
      description,
      debtor_name,
      debtor_iban,
      debtor_bic,
      reference,
      due_date,
      mandate_id,
      creditor_name,
      creditor_iban,
      creditor_id,
    } = body

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    if (!mandate_id) {
      return NextResponse.json({ error: 'Mandat SEPA requis' }, { status: 400 })
    }

    if (!debtor_iban) {
      return NextResponse.json({ error: 'IBAN débiteur requis' }, { status: 400 })
    }

    if (!creditor_id) {
      return NextResponse.json({ error: 'Identifiant créancier requis' }, { status: 400 })
    }

    // Enregistrer le prélèvement
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const { data: paymentRecord, error: dbError } = await supabase
      .from('payments')
      .insert({
        organization_id: userData?.organization_id,
        amount: amount.toString(),
        currency: currency.toUpperCase(),
        status: 'pending',
        payment_method: 'sepa_direct_debit',
        payment_provider: 'sepa',
        description,
        metadata: {
          debtor_name,
          debtor_iban,
          debtor_bic,
          creditor_name,
          creditor_iban,
          creditor_id,
          reference,
          mandate_id,
          due_date,
          type: 'direct_debit',
        },
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Error saving SEPA direct debit', dbError, {
        amount,
        currency,
        userId: maskId(user.id),
        debtorIBAN: maskIBAN(debtor_iban),
        creditorIBAN: maskIBAN(creditor_iban),
        mandateId: maskId(mandate_id),
        error: sanitizeError(dbError),
      })
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    // TODO: Intégrer avec un service de traitement SEPA réel
    // Pour l'instant, on retourne juste l'enregistrement

    return NextResponse.json({
      paymentId: paymentRecord.id,
      status: 'pending',
      iban: creditor_iban,
      reference,
      dueDate: due_date,
    })
  } catch (error: unknown) {
    const errorAmount = (error as any)?.amount || 'unknown'
    const errorCurrency = (error as any)?.currency || 'unknown'
    const errorDebtorIban = (error as any)?.debtor_iban || undefined
    const errorCreditorIban = (error as any)?.creditor_iban || undefined
    logger.error('Error creating SEPA direct debit', error, {
      amount: errorAmount,
      currency: errorCurrency,
      debtorIBAN: errorDebtorIban ? maskIBAN(errorDebtorIban) : undefined,
      creditorIBAN: errorCreditorIban ? maskIBAN(errorCreditorIban) : undefined,
      error: sanitizeError(error),
    })
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
  })
}
