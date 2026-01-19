/**
 * Protection CSRF pour les routes API
 *
 * Implémente une protection contre les attaques Cross-Site Request Forgery
 * en utilisant le pattern Double Submit Cookie + Origin Verification.
 *
 * Cette implémentation est compatible avec les environnements serverless.
 */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// Nom du cookie CSRF
const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

// Durée de validité du token (24 heures)
const TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000

// Secret pour signer les tokens (utiliser une variable d'environnement en production)
const getSecret = () => process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'default-csrf-secret-change-me'

/**
 * Génère un token CSRF sécurisé
 */
export function generateCSRFToken(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(24).toString('base64url')
  const data = `${timestamp}.${random}`

  // Signer le token
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64url')

  return `${data}.${signature}`
}

/**
 * Vérifie un token CSRF
 */
export function verifyCSRFToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return false
  }

  const [timestamp, random, signature] = parts
  const data = `${timestamp}.${random}`

  // Vérifier la signature
  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64url')

  if (signature !== expectedSignature) {
    return false
  }

  // Vérifier l'expiration
  const tokenTime = parseInt(timestamp, 36)
  if (Date.now() - tokenTime > TOKEN_VALIDITY_MS) {
    return false
  }

  return true
}

/**
 * Vérifie l'origine de la requête
 */
export function verifyOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const host = req.headers.get('host')

  // En développement, autoriser localhost
  if (process.env.NODE_ENV === 'development') {
    if (!origin && !referer) {
      return true // Autoriser les requêtes sans origin en dev (ex: Postman)
    }
    if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
      return true
    }
    if (referer?.includes('localhost') || referer?.includes('127.0.0.1')) {
      return true
    }
  }

  // Vérifier que l'origine correspond au host
  if (origin) {
    const originUrl = new URL(origin)
    if (originUrl.host !== host) {
      // Vérifier les origines autorisées
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []
      if (!allowedOrigins.includes(origin)) {
        return false
      }
    }
  }

  // Si pas d'origin, vérifier le referer
  if (!origin && referer) {
    const refererUrl = new URL(referer)
    if (refererUrl.host !== host) {
      return false
    }
  }

  return true
}

/**
 * Middleware de protection CSRF
 *
 * Vérifie:
 * 1. L'origine de la requête (Origin/Referer)
 * 2. Le token CSRF (Double Submit Cookie)
 */
export async function csrfProtection(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>
): Promise<Response> {
  // Les méthodes GET, HEAD, OPTIONS sont considérées comme sûres
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    return handler(req)
  }

  // Vérifier l'origine
  if (!verifyOrigin(req)) {
    return NextResponse.json(
      { error: 'Origine non autorisée' },
      { status: 403 }
    )
  }

  // Récupérer le token du cookie
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value

  // Récupérer le token du header
  const headerToken = req.headers.get(CSRF_HEADER_NAME)

  // En mode développement avec un referer valide, être plus permissif
  if (process.env.NODE_ENV === 'development' && !headerToken && !cookieToken) {
    const referer = req.headers.get('referer')
    if (referer?.includes('localhost') || referer?.includes('127.0.0.1')) {
      return handler(req)
    }
  }

  // Vérifier que les tokens correspondent et sont valides
  if (!cookieToken || !headerToken) {
    return NextResponse.json(
      { error: 'Token CSRF manquant' },
      { status: 403 }
    )
  }

  if (cookieToken !== headerToken) {
    return NextResponse.json(
      { error: 'Token CSRF invalide' },
      { status: 403 }
    )
  }

  if (!verifyCSRFToken(cookieToken)) {
    return NextResponse.json(
      { error: 'Token CSRF expiré ou invalide' },
      { status: 403 }
    )
  }

  return handler(req)
}

/**
 * Crée une réponse avec un nouveau token CSRF dans un cookie
 */
export function withCSRFToken(response: Response): Response {
  const token = generateCSRFToken()
  const isProduction = process.env.NODE_ENV === 'production'

  // Cloner la réponse pour ajouter le cookie
  const newResponse = new Response(response.body, response)

  newResponse.headers.append(
    'Set-Cookie',
    [
      `${CSRF_COOKIE_NAME}=${token}`,
      'Path=/',
      `Max-Age=${TOKEN_VALIDITY_MS / 1000}`,
      isProduction ? 'Secure' : '',
      'SameSite=Strict',
    ]
      .filter(Boolean)
      .join('; ')
  )

  return newResponse
}

/**
 * Route API pour obtenir un nouveau token CSRF
 * À utiliser côté client pour initialiser le token
 */
export function createCSRFTokenRoute() {
  return async function GET(req: NextRequest) {
    const token = generateCSRFToken()
    const isProduction = process.env.NODE_ENV === 'production'

    const response = NextResponse.json({ token })

    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Le client doit pouvoir lire le cookie
      secure: isProduction,
      sameSite: 'strict',
      maxAge: TOKEN_VALIDITY_MS / 1000,
      path: '/',
    })

    return response
  }
}

/**
 * Hook côté client pour récupérer le token CSRF
 * À utiliser dans les composants React
 */
export function getCSRFTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_COOKIE_NAME) {
      return value
    }
  }
  return null
}

/**
 * Headers CSRF à inclure dans les requêtes fetch
 */
export function getCSRFHeaders(): HeadersInit {
  const token = getCSRFTokenFromCookie()
  if (!token) {
    return {}
  }
  return {
    [CSRF_HEADER_NAME]: token,
  }
}
