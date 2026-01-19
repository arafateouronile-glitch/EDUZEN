/**
 * Utilitaires pour les réponses d'erreur API sécurisées
 *
 * IMPORTANT: Ne jamais exposer les détails techniques des erreurs
 * en production pour éviter la fuite d'informations sensibles.
 */

import { NextResponse } from 'next/server'
import { AppError, ErrorCode, ErrorSeverity } from '@/lib/errors/error-handler'

interface ErrorResponseOptions {
  /** Code HTTP de la réponse (default: 500) */
  status?: number
  /** Headers additionnels */
  headers?: Record<string, string>
  /** Inclure l'ID de corrélation pour le support */
  correlationId?: string
}

/**
 * Messages d'erreur génériques pour la production
 * Ces messages sont sûrs à afficher aux utilisateurs
 */
const GENERIC_ERROR_MESSAGES: Record<number, string> = {
  400: 'La requête est invalide. Veuillez vérifier vos données.',
  401: 'Authentification requise.',
  403: "Vous n'avez pas les permissions nécessaires.",
  404: 'Ressource introuvable.',
  405: 'Méthode non autorisée.',
  408: 'La requête a pris trop de temps.',
  409: 'Conflit avec une ressource existante.',
  422: 'Les données fournies ne sont pas valides.',
  429: 'Trop de requêtes. Veuillez patienter.',
  500: 'Une erreur interne est survenue. Veuillez réessayer.',
  502: 'Service temporairement indisponible.',
  503: 'Service en maintenance.',
  504: 'Le service ne répond pas.',
}

/**
 * Génère un ID de corrélation unique pour tracer les erreurs
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `err_${timestamp}_${random}`
}

/**
 * Crée une réponse d'erreur API sécurisée
 *
 * En production:
 * - Masque les détails techniques
 * - Utilise des messages génériques
 * - Ajoute un ID de corrélation pour le support
 *
 * En développement:
 * - Inclut tous les détails de l'erreur
 */
export function createSecureErrorResponse(
  error: unknown,
  options: ErrorResponseOptions = {}
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production'
  const correlationId = options.correlationId || generateCorrelationId()

  // Déterminer le status HTTP
  let status = options.status || 500
  let userMessage = GENERIC_ERROR_MESSAGES[status] || GENERIC_ERROR_MESSAGES[500]
  let errorCode: string | undefined

  // Extraire les informations de l'erreur si c'est une AppError
  if (error instanceof AppError) {
    errorCode = error.code
    userMessage = error.userMessage || userMessage

    // Mapper les codes d'erreur aux status HTTP
    if (error.code.startsWith('AUTH_')) {
      status = error.code === ErrorCode.AUTH_REQUIRED ? 401 : 403
    } else if (error.code.startsWith('VALID_')) {
      status = 400
    } else if (error.code === ErrorCode.DB_NOT_FOUND || error.code === ErrorCode.API_NOT_FOUND) {
      status = 404
    } else if (error.code === ErrorCode.API_RATE_LIMIT) {
      status = 429
    }
  }

  // Construire la réponse
  const responseBody: Record<string, unknown> = {
    success: false,
    error: userMessage,
    correlationId,
  }

  // En développement, inclure plus de détails
  if (!isProduction) {
    if (error instanceof AppError) {
      responseBody.details = {
        code: error.code,
        severity: error.severity,
        message: error.message,
        stack: error.stack,
        context: error.context,
      }
    } else if (error instanceof Error) {
      responseBody.details = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } else {
      responseBody.details = { raw: error }
    }
  } else {
    // En production, inclure seulement le code d'erreur si disponible
    if (errorCode) {
      responseBody.code = errorCode
    }
  }

  // Log l'erreur côté serveur (avec tous les détails)
  console.error(`[${correlationId}] API Error:`, {
    status,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  })

  return NextResponse.json(responseBody, {
    status,
    headers: {
      'X-Correlation-Id': correlationId,
      ...options.headers,
    },
  })
}

/**
 * Wrapper pour les handlers d'API qui capture et formate les erreurs
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req)
    } catch (error) {
      return createSecureErrorResponse(error)
    }
  }
}

/**
 * Crée une réponse de validation error
 */
export function createValidationErrorResponse(
  message: string,
  details?: Record<string, string[]>
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production'
  const correlationId = generateCorrelationId()

  const responseBody: Record<string, unknown> = {
    success: false,
    error: message,
    correlationId,
  }

  // Les erreurs de validation peuvent inclure les détails même en production
  // car ce sont des informations utiles pour l'utilisateur
  if (details) {
    responseBody.validationErrors = details
  }

  return NextResponse.json(responseBody, {
    status: 400,
    headers: {
      'X-Correlation-Id': correlationId,
    },
  })
}

/**
 * Crée une réponse d'erreur 404
 */
export function createNotFoundResponse(
  resource: string = 'Ressource'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `${resource} introuvable.`,
    },
    { status: 404 }
  )
}

/**
 * Crée une réponse d'erreur 401
 */
export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Authentification requise.',
    },
    { status: 401 }
  )
}

/**
 * Crée une réponse d'erreur 403
 */
export function createForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "Vous n'avez pas les permissions nécessaires.",
    },
    { status: 403 }
  )
}
