import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withBodyValidation, type ValidationSchema } from '@/lib/utils/api-validation'
import { errorHandler, AppError } from '@/lib/errors'

const rulesSchema: ValidationSchema = {
  session_timeout: {
    type: 'integer',
    required: false,
    min: 60000, // 1 minute minimum
    max: 86400000, // 24 heures maximum
  },
  idle_timeout: {
    type: 'integer',
    required: false,
    min: 60000,
    max: 3600000, // 1 heure maximum
  },
  max_sessions_per_user: {
    type: 'integer',
    required: false,
    min: 1,
    max: 20,
  },
  require_reauthentication: {
    type: 'boolean',
    required: false,
  },
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Récupérer les règles de timeout de session
    // TODO: Implémenter la récupération des règles depuis la base de données
    const defaultRules = {
      session_timeout: 30 * 60 * 1000, // 30 minutes
      idle_timeout: 15 * 60 * 1000, // 15 minutes
      max_sessions_per_user: 5,
      require_reauthentication: false
    }

    return NextResponse.json({ rules: defaultRules })
  } catch (error) {
    throw errorHandler.handleError(error, {
      operation: 'getTimeoutRules',
    })
  }
}

export async function PUT(request: NextRequest) {
  return withBodyValidation(request, rulesSchema, async (req, data) => {
    try {
      const supabase = createAdminClient()

      // TODO: Implémenter la mise à jour des règles de timeout
      // Exemple : sauvegarder dans la table organization_settings

      return NextResponse.json({
        success: true,
        message: 'Timeout rules updated',
        rules: data
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'updateTimeoutRules',
      })
    }
  })
}
