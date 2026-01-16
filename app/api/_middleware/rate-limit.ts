/**
 * Middleware de rate limiting pour les routes API
 * 
 * Utilisation :
 * import { withRateLimit, authRateLimiter } from '@/app/api/_middleware/rate-limit'
 * 
 * export async function POST(req: Request) {
 *   return withRateLimit(req, authRateLimiter, async (req) => {
 *     // Votre logique ici
 *   })
 * }
 */

export {
  withRateLimit,
  generalRateLimiter,
  authRateLimiter,
  mutationRateLimiter,
  uploadRateLimiter,
  createRateLimitResponse,
} from '@/lib/utils/rate-limiter'





