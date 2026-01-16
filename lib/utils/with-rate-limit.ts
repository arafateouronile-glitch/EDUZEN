/**
 * HOF (Higher-Order Function) pour appliquer le rate limiting aux API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, RATE_LIMITS } from './rate-limit'

type RateLimitType = keyof typeof RATE_LIMITS

/**
 * Wrapper pour appliquer le rate limiting à une API route
 * @param handler - Handler de l'API route
 * @param limitType - Type de limit à appliquer
 * @param getUserId - Fonction optionnelle pour extraire l'user ID de la requête
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  limitType: RateLimitType = 'GENERAL',
  getUserId?: (req: NextRequest) => Promise<string | undefined>
) {
  return async (req: NextRequest): Promise<Response> => {
    // Extraire l'user ID si fonction fournie
    let userId: string | undefined
    if (getUserId) {
      try {
        userId = await getUserId(req)
      } catch (error) {
        console.error('Error extracting user ID for rate limit:', error)
      }
    }

    // Appliquer le rate limiting
    const config = RATE_LIMITS[limitType]
    const result = applyRateLimit(req, config, userId)

    // Si rate limit dépassé, retourner 429 Too Many Requests
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: result.headers,
        }
      )
    }

    // Exécuter le handler et ajouter les headers de rate limit
    try {
      const response = await handler(req)

      // Ajouter les headers de rate limit à la réponse
      Object.entries(result.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response
    } catch (error) {
      // En cas d'erreur, retourner quand même les headers de rate limit
      const errorResponse = NextResponse.json(
        {
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )

      Object.entries(result.headers).forEach(([key, value]) => {
        errorResponse.headers.set(key, value)
      })

      return errorResponse
    }
  }
}
