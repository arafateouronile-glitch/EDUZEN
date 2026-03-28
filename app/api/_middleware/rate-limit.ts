/**
 * Middleware de rate limiting pour les routes API
 *
 * Utilise Upstash Redis en production (si UPSTASH_REDIS_REST_URL et
 * UPSTASH_REDIS_REST_TOKEN sont configurés), sinon fallback en mémoire (dev).
 *
 * Utilisation (inchangée) :
 * import { withRateLimit, authRateLimiter } from '@/app/api/_middleware/rate-limit'
 *
 * export async function POST(req: Request) {
 *   return withRateLimit(req, authRateLimiter, async (req) => {
 *     // Votre logique ici
 *   })
 * }
 */

import {
  generalRateLimiter,
  authRateLimiter,
  mutationRateLimiter,
  uploadRateLimiter,
  publicRouteRateLimiter,
  createRateLimitResponse,
  type RateLimiter,
} from '@/lib/utils/rate-limiter'

import { withDistributedRateLimit } from '@/lib/utils/rate-limiter-distributed'

// Map des instances en mémoire vers les types distribués
type LimiterType = 'general' | 'auth' | 'mutation' | 'upload' | 'public'

const limiterTypeMap = new WeakMap<RateLimiter, LimiterType>([
  [generalRateLimiter, 'general'],
  [authRateLimiter, 'auth'],
  [mutationRateLimiter, 'mutation'],
  [uploadRateLimiter, 'upload'],
  [publicRouteRateLimiter, 'public'],
])

/**
 * Wrapper compatible avec l'ancienne API : withRateLimit(req, limiter, handler)
 * Route automatiquement vers Upstash Redis si configuré, sinon en mémoire.
 */
export async function withRateLimit(
  req: Request,
  limiter: RateLimiter,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  const limiterType = limiterTypeMap.get(limiter) ?? 'general'
  return withDistributedRateLimit(req, limiterType, handler)
}

export {
  generalRateLimiter,
  authRateLimiter,
  mutationRateLimiter,
  uploadRateLimiter,
  publicRouteRateLimiter,
  createRateLimitResponse,
}
