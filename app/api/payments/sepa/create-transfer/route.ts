import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger, maskId, maskEmail, sanitizeError } from '@/lib/utils/logger'
import { withBodyValidation, type ValidationSchema } from '@/lib/utils/api-validation'
import { withRateLimit, mutationRateLimiter } from '@/lib/utils/rate-limiter'

const maskIBAN = (iban: string): string => {
  if (!iban || iban.length < 4) return '[REDACTED]'
  return `****${iban.slice(-4)}`
}

// Validation IBAN stricte
const validateIBAN = (iban: string): { isValid: boolean; errors?: string[]; sanitized?: string } => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()

  // Vérifier longueur (15-34 caractères selon pays)
  if (cleaned.length < 15 || cleaned.length > 34) {
    return { isValid: false, errors: ['IBAN doit contenir entre 15 et 34 caractères'] }
  }

  // Vérifier format (2 lettres pays + 2 chiffres contrôle + reste alphanumérique)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) {
    return { isValid: false, errors: ['Format IBAN invalide'] }
  }

  return { isValid: true, sanitized: cleaned }
}

// Schéma de validation pour virement SEPA
const sepaTransferSchema: ValidationSchema = {
  amount: {
    type: 'float',
    required: true,
    min: 0.01,
    max: 999999999, // Limite raisonnable
  },
  currency: {
    type: 'string',
    required: false,
    pattern: /^(EUR|USD|GBP|CHF)$/,
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 500,
  },
  debtor_name: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  debtor_iban: {
    type: 'string',
    required: true,
    customValidator: validateIBAN,
  },
  debtor_bic: {
    type: 'string',
    required: false,
    pattern: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  },
  debtor_email: {
    type: 'email',
    required: false,
  },
  creditor_name: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  creditor_iban: {
    type: 'string',
    required: true,
    customValidator: validateIBAN,
  },
  creditor_bic: {
    type: 'string',
    required: false,
    pattern: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  },
  reference: {
    type: 'string',
    required: false,
    maxLength: 140,
  },
}

/**
 * POST /api/payments/sepa/create-transfer
 * Créer une demande de virement SEPA
 * ✅ Validation stricte IBAN + BIC + Rate limiting
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, mutationRateLimiter, async (req) => {
    return withBodyValidation(req, sepaTransferSchema, async (req, validatedData) => {
      try {
        const supabase = await createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // ✅ Données validées et sanitizées
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        const { data: paymentRecord, error: dbError } = await supabase
          .from('payments')
          .insert({
            organization_id: userData?.organization_id,
            amount: validatedData.amount.toString(),
            currency: (validatedData.currency || 'EUR').toUpperCase(),
            status: 'pending',
            payment_method: 'sepa_transfer',
            payment_provider: 'sepa',
            description: validatedData.description,
            metadata: {
              debtor_name: validatedData.debtor_name,
              debtor_iban: validatedData.debtor_iban,
              debtor_bic: validatedData.debtor_bic,
              debtor_email: validatedData.debtor_email,
              creditor_name: validatedData.creditor_name,
              creditor_iban: validatedData.creditor_iban,
              creditor_bic: validatedData.creditor_bic,
              reference: validatedData.reference,
              type: 'transfer',
            },
          })
          .select()
          .single()

        if (dbError) {
          logger.error('Error saving SEPA payment', dbError, {
            amount: validatedData.amount,
            currency: validatedData.currency,
            userId: maskId(user.id),
            debtorIBAN: maskIBAN(validatedData.debtor_iban),
            debtorEmail: validatedData.debtor_email ? maskEmail(validatedData.debtor_email) : undefined,
            creditorIBAN: maskIBAN(validatedData.creditor_iban),
            error: sanitizeError(dbError),
          })
          return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
        }

        // TODO: Intégrer avec un service de traitement SEPA réel
        // Pour l'instant, on retourne juste l'enregistrement

        return NextResponse.json({
          paymentId: paymentRecord.id,
          status: 'pending',
          iban: validatedData.creditor_iban,
          reference: validatedData.reference,
        })
      } catch (error: unknown) {
        logger.error('Error creating SEPA transfer', error, {
          error: sanitizeError(error),
        })
        const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    })
  })
}
