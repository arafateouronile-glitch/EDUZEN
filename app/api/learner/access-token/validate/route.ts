import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database.types'
import { logger, maskToken, maskId, sanitizeError } from '@/lib/utils/logger'

// Valider un token d'accès (endpoint public, pas besoin d'auth)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    logger.debug('Token validation request received', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
    })

    if (!token || token === '[token]') {
      logger.warn('Token validation failed: missing token')
      return NextResponse.json(
        { error: 'token est requis', valid: false },
        { status: 400 }
      )
    }

    // Utiliser le service role key pour un accès public (pas besoin d'authentification)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      logger.error('[CRITICAL] Missing SUPABASE_SERVICE_ROLE_KEY configuration')
      return NextResponse.json(
        { error: 'Configuration serveur manquante', valid: false },
        { status: 500 }
      )
    }

    const supabase = createAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    logger.debug('Calling validate_learner_access_token RPC function')

    // Valider le token via la fonction SQL
    const { data, error } = await supabase
      .rpc('validate_learner_access_token', {
        p_token: token
      })

    if (error) {
      logger.error('Token validation RPC failed', error, {
        errorCode: error.code,
        errorMessage: error.message,
      })
      return NextResponse.json(
        {
          valid: false,
          error: 'Erreur lors de la validation du token',
          details: error.message
        },
        { status: 500 }
      )
    }

    const result = data?.[0] || data

    if (!result || !result.is_valid) {
      logger.warn('Token validation failed', {
        hasResult: !!result,
        isValid: result?.is_valid,
        errorMessage: result?.error_message,
      })
      return NextResponse.json({
        valid: false,
        error: result?.error_message || 'Token invalide ou expiré'
      }, { status: 401 })
    }

    logger.info('Token validation successful', {
      studentId: maskId(result.student_id),
      sessionId: maskId(result.session_id),
      organizationId: maskId(result.organization_id),
    })

    return NextResponse.json({
      valid: true,
      student: {
        id: result.student_id,
        firstName: result.student_first_name,
        lastName: result.student_last_name,
        email: result.student_email,
        sessionId: result.session_id,
        organizationId: result.organization_id
      }
    })

  } catch (error) {
    logger.error('Token validation failed with exception', error, {
      error: sanitizeError(error),
    })
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}


