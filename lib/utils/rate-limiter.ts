/**
 * Rate Limiter pour API Routes
 * 
 * Implémente un rate limiter simple en mémoire pour protéger les routes API
 * contre les abus et les attaques par force brute.
 * 
 * En production, utilisez un service externe comme Upstash Redis ou Vercel KV.
 */

interface RateLimitConfig {
  windowMs: number // Fenêtre de temps en millisecondes
  maxRequests: number // Nombre maximum de requêtes par fenêtre
  keyGenerator?: (req: Request) => string // Fonction pour générer la clé
  skipSuccessfulRequests?: boolean // Ne pas compter les requêtes réussies
  skipFailedRequests?: boolean // Ne pas compter les requêtes échouées
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
    }

    // Nettoyer le store toutes les 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Génère une clé par défaut basée sur l'IP
   */
  private defaultKeyGenerator(req: Request): string {
    // Essayer de récupérer l'IP depuis les headers
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || 'unknown'

    // Utiliser l'URL pour différencier les routes
    const url = new URL(req.url)
    return `${ip}:${url.pathname}`
  }

  /**
   * Vérifie si une requête est autorisée
   */
  async check(req: Request): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
  }> {
    const key = this.config.keyGenerator(req)
    const now = Date.now()

    // Nettoyer les entrées expirées
    if (this.store[key] && this.store[key].resetTime < now) {
      delete this.store[key]
    }

    // Initialiser ou récupérer l'entrée
    if (!this.store[key]) {
      this.store[key] = {
        count: 0,
        resetTime: now + this.config.windowMs,
      }
    }

    const entry = this.store[key]

    // Vérifier si la fenêtre est expirée
    if (entry.resetTime < now) {
      entry.count = 0
      entry.resetTime = now + this.config.windowMs
    }

    // Vérifier la limite
    const allowed = entry.count < this.config.maxRequests

    if (allowed) {
      entry.count++
    }

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    }
  }

  /**
   * Réduit le compteur pour une requête réussie (si configuré)
   */
  async decrement(req: Request): Promise<void> {
    if (!this.config.skipSuccessfulRequests) return

    const key = this.config.keyGenerator(req)
    const entry = this.store[key]

    if (entry && entry.count > 0) {
      entry.count--
    }
  }

  /**
   * Réduit le compteur pour une requête échouée (si configuré)
   */
  async decrementOnFailure(req: Request): Promise<void> {
    if (!this.config.skipFailedRequests) return

    const key = this.config.keyGenerator(req)
    const entry = this.store[key]

    if (entry && entry.count > 0) {
      entry.count--
    }
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now()
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }

  /**
   * Réinitialise le compteur pour une clé
   */
  reset(key: string): void {
    delete this.store[key]
  }

  /**
   * Réinitialise tous les compteurs
   */
  resetAll(): void {
    this.store = {}
  }
}

// Instances de rate limiter pour différents endpoints

/**
 * Rate limiter général (100 requêtes par minute)
 */
export const generalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
})

/**
 * Rate limiter pour l'authentification (5 tentatives par 15 minutes)
 */
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  skipSuccessfulRequests: true, // Ne pas compter les connexions réussies
})

/**
 * Rate limiter pour les mutations (50 requêtes par minute)
 */
export const mutationRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,
})

/**
 * Rate limiter pour les uploads (10 uploads par minute)
 */
export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
})

/**
 * Helper pour créer une réponse de rate limit
 */
export function createRateLimitResponse(
  remaining: number,
  resetTime: number
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Vous avez dépassé la limite de requêtes. Veuillez réessayer plus tard.',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
      },
    }
  )
}

/**
 * Middleware helper pour appliquer le rate limiting
 */
export async function withRateLimit(
  req: Request,
  limiter: RateLimiter,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  const result = await limiter.check(req)

  if (!result.allowed) {
    return createRateLimitResponse(result.remaining, result.resetTime)
  }

  try {
    const response = await handler(req)

    // Si la requête a réussi, décrémenter le compteur si configuré
    if (response.ok) {
      await limiter.decrement(req)
    } else {
      await limiter.decrementOnFailure(req)
    }

    // Ajouter les headers de rate limit à la réponse
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

    return response
  } catch (error) {
    await limiter.decrementOnFailure(req)
    throw error
  }
}





