/**
 * Rate Limiter Distribué pour API Routes
 *
 * Implémente un rate limiter distribué avec Upstash Redis pour fonctionner
 * correctement en environnement serverless (Vercel).
 *
 * IMPORTANT: Nécessite les variables d'environnement:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * Si ces variables ne sont pas configurées, le rate limiter fallback
 * vers le rate limiter en mémoire (dev uniquement).
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import {
  generalRateLimiter as memoryGeneralLimiter,
  authRateLimiter as memoryAuthLimiter,
  mutationRateLimiter as memoryMutationLimiter,
  uploadRateLimiter as memoryUploadLimiter,
  createRateLimitResponse,
} from './rate-limiter'

// Vérifier si Upstash est configuré
const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Créer le client Redis si configuré
const redis = isUpstashConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

/**
 * Rate limiter général distribué (100 requêtes par minute)
 */
export const generalRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:general',
    })
  : null

/**
 * Rate limiter pour l'authentification (5 tentatives par 15 minutes)
 */
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null

/**
 * Rate limiter pour les mutations (50 requêtes par minute)
 */
export const mutationRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '1 m'),
      analytics: true,
      prefix: 'ratelimit:mutation',
    })
  : null

/**
 * Rate limiter pour les uploads (10 uploads par minute)
 */
export const uploadRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:upload',
    })
  : null

/**
 * Rate limiter strict pour les endpoints sensibles (3 tentatives par 5 minutes)
 */
export const strictRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '5 m'),
      analytics: true,
      prefix: 'ratelimit:strict',
    })
  : null

/**
 * Génère une clé de rate limiting basée sur l'IP et le chemin
 */
export function getRateLimitKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
  const url = new URL(req.url)
  return `${ip}:${url.pathname}`
}

/**
 * Génère une clé de rate limiting basée uniquement sur l'IP
 */
export function getRateLimitKeyByIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
}

/**
 * Type pour les limiters Upstash
 */
type UpstashLimiter = Ratelimit | null

/**
 * Middleware helper pour appliquer le rate limiting distribué
 * avec fallback vers le rate limiter en mémoire si Upstash n'est pas configuré
 */
export async function withDistributedRateLimit(
  req: Request,
  limiterType: 'general' | 'auth' | 'mutation' | 'upload' | 'strict',
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  // Sélectionner le limiter approprié
  let upstashLimiter: UpstashLimiter
  let memoryLimiter: typeof memoryGeneralLimiter

  switch (limiterType) {
    case 'auth':
      upstashLimiter = authRateLimiter
      memoryLimiter = memoryAuthLimiter
      break
    case 'mutation':
      upstashLimiter = mutationRateLimiter
      memoryLimiter = memoryMutationLimiter
      break
    case 'upload':
      upstashLimiter = uploadRateLimiter
      memoryLimiter = memoryUploadLimiter
      break
    case 'strict':
      upstashLimiter = strictRateLimiter
      memoryLimiter = memoryAuthLimiter // Utiliser auth limiter comme fallback
      break
    default:
      upstashLimiter = generalRateLimiter
      memoryLimiter = memoryGeneralLimiter
  }

  // Utiliser Upstash si disponible
  if (upstashLimiter) {
    const key = limiterType === 'auth' || limiterType === 'strict'
      ? getRateLimitKeyByIp(req)
      : getRateLimitKey(req)

    const { success, remaining, reset } = await upstashLimiter.limit(key)

    if (!success) {
      return createRateLimitResponse(remaining, reset)
    }

    try {
      const response = await handler(req)

      // Ajouter les headers de rate limit à la réponse
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString())

      return response
    } catch (error) {
      throw error
    }
  }

  // Fallback vers le rate limiter en mémoire
  const result = await memoryLimiter.check(req)

  if (!result.allowed) {
    return createRateLimitResponse(result.remaining, result.resetTime)
  }

  try {
    const response = await handler(req)

    // Ajouter les headers de rate limit à la réponse
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

    return response
  } catch (error) {
    throw error
  }
}

/**
 * Vérifie si le rate limiting distribué est actif
 */
export function isDistributedRateLimitingEnabled(): boolean {
  return isUpstashConfigured
}

/**
 * Log un avertissement si Upstash n'est pas configuré (en production)
 */
export function warnIfNotConfigured(): void {
  if (!isUpstashConfigured && process.env.NODE_ENV === 'production') {
    console.warn(
      '[SECURITY WARNING] Upstash Redis is not configured. ' +
      'Rate limiting is running in memory-only mode, which does not work ' +
      'correctly in serverless environments. Please configure UPSTASH_REDIS_REST_URL ' +
      'and UPSTASH_REDIS_REST_TOKEN environment variables.'
    )
  }
}

// Log l'avertissement au démarrage
warnIfNotConfigured()
