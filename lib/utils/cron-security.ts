/**
 * Utilitaires de sécurité pour les endpoints CRON
 * Vérification de secret, IP whitelist, logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

/**
 * Configuration de sécurité CRON
 */
interface CronSecurityConfig {
  secret?: string // Secret partagé (défaut: CRON_SECRET env var)
  allowedIPs?: string[] // Liste d'IPs autorisées (optionnel)
  requireSecret?: boolean // Exiger le secret (défaut: true)
  logExecution?: boolean // Logger les exécutions (défaut: true)
}

/**
 * Valide la requête CRON
 */
export function validateCronRequest(
  request: NextRequest,
  config: CronSecurityConfig = {}
): {
  valid: boolean
  error?: string
  details?: {
    secretValid: boolean
    ipValid: boolean
  }
} {
  const {
    secret = process.env.CRON_SECRET,
    allowedIPs = [],
    requireSecret = true,
  } = config

  const details = {
    secretValid: false,
    ipValid: false,
  }

  // 1. Vérifier le secret
  if (requireSecret) {
    if (!secret) {
      return {
        valid: false,
        error: 'CRON_SECRET non configuré',
        details,
      }
    }

    const authHeader = request.headers.get('authorization')
    const providedSecret = authHeader?.replace(/^Bearer\s+/i, '')

    if (!providedSecret) {
      return {
        valid: false,
        error: 'Secret manquant dans le header Authorization',
        details,
      }
    }

    details.secretValid = providedSecret === secret
    if (!details.secretValid) {
      return {
        valid: false,
        error: 'Secret invalide',
        details,
      }
    }
  } else {
    details.secretValid = true
  }

  // 2. Vérifier l'IP (si whitelist configurée)
  if (allowedIPs.length > 0) {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIp = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

    details.ipValid = allowedIPs.includes(clientIp)
    if (!details.ipValid) {
      return {
        valid: false,
        error: `IP non autorisée: ${clientIp}`,
        details,
      }
    }
  } else {
    details.ipValid = true
  }

  return {
    valid: true,
    details,
  }
}

/**
 * Middleware pour sécuriser les endpoints CRON
 */
export function withCronSecurity(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: CronSecurityConfig = {}
): Promise<NextResponse> {
  const { logExecution = true } = config

  // Logger la tentative d'exécution
  if (logExecution) {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIp = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    logger.info('CRON execution attempt', {
      ip: clientIp,
      userAgent,
      path: request.nextUrl.pathname,
      method: request.method,
    })
  }

  // Valider la requête
  const validation = validateCronRequest(request, config)

  if (!validation.valid) {
    // Logger la tentative échouée
    if (logExecution) {
      logger.warn('CRON execution rejected', {
        error: validation.error,
        details: validation.details,
        path: request.nextUrl.pathname,
      })
    }

    return NextResponse.json(
      {
        error: validation.error || 'Unauthorized',
        success: false,
      },
      { status: 401 }
    )
  }

  // Exécuter le handler
  return handler(request).then((response) => {
    // Logger l'exécution réussie
    if (logExecution) {
      logger.info('CRON execution completed', {
        path: request.nextUrl.pathname,
        status: response.status,
        success: response.ok,
      })
    }

    return response
  }).catch((error) => {
    // Logger l'erreur
    if (logExecution) {
      logger.error('CRON execution error', error, {
        path: request.nextUrl.pathname,
      })
    }

    throw error
  })
}



