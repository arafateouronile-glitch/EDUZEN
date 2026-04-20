import createMiddleware from 'next-intl/middleware'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'
import { generateNonce, getSecurityHeadersWithNonce, CSP_NONCE_HEADER } from '@/lib/utils/csp'

// Configuration des locales (alignée sur i18n/routing pour éviter 404 sur /dashboard)
export const locales = routing.locales as readonly ['fr', 'en']
export const defaultLocale = routing.defaultLocale as 'fr'

// Créer le middleware next-intl avec la même config que i18n/routing (localePrefix: 'never')
const intlMiddleware = createMiddleware(routing)

export async function middleware(req: NextRequest) {
  // D'abord, générer la réponse i18n, puis la réutiliser partout (auth + headers)
  // pour conserver les Set-Cookie Supabase (refresh tokens).
  const response = intlMiddleware(req)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  let authUser: { id: string } | null = null
  let authCheckFailed = false
  try {
    const { data: { user } } = await supabase.auth.getUser()
    authUser = user
  } catch (e: unknown) {
    const err = e as { status?: number; code?: string }
    if (err?.status === 400 || err?.code === 'refresh_token_not_found') {
      await supabase.auth.signOut()
    } else {
      // Erreur transitoire (réseau, timeout, etc.) : ne pas considérer l'utilisateur comme déconnecté.
      authCheckFailed = true
    }
  }

  // Routes protégées (nécessitent une authentification)
  const protectedRoutes = ['/dashboard', '/students', '/programs', '/payments', '/attendance']
  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  )

  // Routes d'authentification (redirigent si déjà connecté)
  const authRoutes = ['/auth/login', '/auth/register']
  const isAuthRoute = authRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Si la route est protégée et l'utilisateur n'est pas connecté
  if (isProtectedRoute && !authUser && !authCheckFailed) {
    // Pour les routes API, retourner une erreur au lieu de rediriger
    if (req.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Si l'utilisateur est connecté et essaie d'accéder aux routes d'authentification
  if (isAuthRoute && authUser) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Configuration CORS pour les routes API
  const origin = req.headers.get('origin')
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []
  // En dev, autoriser uniquement le port 3001 (éviter qu'une app locale malveillante
  // sur localhost:9999 puisse faire des requêtes CORS cross-origin)
  const devAllowedOrigins = ['http://localhost:3001', 'http://127.0.0.1:3001']
  const isAllowedOrigin = origin && (
    allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV !== 'production' && devAllowedOrigins.includes(origin))
  )

  // Headers CORS pour les routes API
  if (req.nextUrl.pathname.startsWith('/api')) {
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-learner-student-id, x-learner-access-token')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 heures

    // Répondre immédiatement aux requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }
  }

  // CSP avec nonce (remplace 'unsafe-inline' pour script-src — protection XSS)
  const nonce = generateNonce()
  const securityHeaders = getSecurityHeadersWithNonce(nonce)

  // Redirection (3xx) : ajouter les headers sur la réponse existante
  if (response.status >= 300 && response.status < 400) {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }

  // Réponse HTML (next) : transmettre le nonce à l'app via les headers de la requête
  // pour que le layout (headers().get('x-nonce')) et les scripts Next.js puissent l'utiliser
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(CSP_NONCE_HEADER, nonce)

  const nextResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Copier les headers de la réponse intl (cookies, etc.)
  response.headers.forEach((value, key) => {
    nextResponse.headers.set(key, value)
  })

  // Appliquer les headers de sécurité (CSP avec nonce, HSTS, etc.)
  Object.entries(securityHeaders).forEach(([key, value]) => {
    nextResponse.headers.set(key, value)
  })

  return nextResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}



