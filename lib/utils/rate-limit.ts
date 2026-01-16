/**
 * Rate Limiting Utility
 * Protège les endpoints critiques contre les abus
 */

interface RateLimitConfig {
  interval: number // Fenêtre de temps en ms
  maxRequests: number // Nombre max de requêtes dans la fenêtre
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Store en mémoire (pour production, utiliser Redis)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Nettoyage périodique du store (toutes les 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Configurations de rate limiting par type d'endpoint
 */
export const RATE_LIMITS = {
  // Authentification - Très restrictif pour prévenir brute force
  AUTH: {
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 tentatives max
  },
  // Paiements - Restrictif pour prévenir les abus
  PAYMENT: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requêtes max
  },
  // Génération de documents - Modéré (coûteux en ressources)
  DOCUMENT_GENERATION: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 générations max
  },
  // API générale - Large pour permettre l'utilisation normale
  GENERAL: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requêtes max
  },
} as const

/**
 * Vérifie si une requête est dans les limites
 * @param identifier - Identifiant unique (IP + user ID + endpoint)
 * @param config - Configuration de rate limit
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
} {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Première requête ou fenêtre expirée
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.interval
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    }
  }

  // Incrémenter le compteur
  entry.count++

  // Vérifier si limite dépassée
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000), // en secondes
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Génère un identifiant unique pour le rate limiting
 * @param ip - Adresse IP
 * @param userId - ID utilisateur (optionnel)
 * @param endpoint - Endpoint de l'API
 */
export function getRateLimitIdentifier(
  ip: string,
  endpoint: string,
  userId?: string
): string {
  // Combiner IP + endpoint + user ID pour un rate limit par utilisateur ET par IP
  const parts = [ip, endpoint]
  if (userId) {
    parts.push(userId)
  }
  return parts.join(':')
}

/**
 * Extrait l'IP de la requête (gère les proxies)
 * @param request - NextRequest
 */
export function getClientIP(request: Request): string {
  // Vérifier les headers de proxy dans l'ordre de priorité
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Prendre la première IP de la liste
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  // Fallback vers 'unknown' si aucune IP trouvée
  return 'unknown'
}

/**
 * Middleware helper pour appliquer le rate limiting
 * @param request - NextRequest
 * @param config - Configuration de rate limit
 * @param userId - ID utilisateur (optionnel)
 * @returns NextResponse avec headers de rate limit ou null si autorisé
 */
export function applyRateLimit(
  request: Request,
  config: RateLimitConfig,
  userId?: string
): {
  allowed: boolean
  headers: Record<string, string>
  retryAfter?: number
} {
  const ip = getClientIP(request)
  const endpoint = new URL(request.url).pathname
  const identifier = getRateLimitIdentifier(ip, endpoint, userId)

  const result = checkRateLimit(identifier, config)

  // Headers standard de rate limiting (RFC 6585)
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  }

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return {
    allowed: result.allowed,
    headers,
    retryAfter: result.retryAfter,
  }
}
