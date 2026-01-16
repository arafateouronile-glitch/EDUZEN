import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger, sanitizeError } from './lib/utils/logger'

// Créer le middleware next-intl avec la configuration de routing
const intlMiddleware = createMiddleware(routing)

export async function middleware(req: NextRequest) {
  // Ignorer les fichiers statiques et les assets AVANT tout traitement
  const pathname = req.nextUrl.pathname
  
  // Exclure explicitement tous les fichiers Next.js et statiques
  // Cette vérification doit être faite AVANT d'appeler intlMiddleware
  // IMPORTANT: Retourner immédiatement sans traitement pour les fichiers statiques
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|json|woff|woff2|ttf|eot|css|js|map)$/i)
  ) {
    // Retourner directement sans aucun traitement
    return NextResponse.next()
  }

  // Gérer les routes avec préfixe de locale (/en/* ou /fr/*)
  // Rediriger vers la route sans préfixe mais définir la locale dans les cookies
  if (pathname.startsWith('/en/') || pathname.startsWith('/fr/')) {
    const locale = pathname.startsWith('/en/') ? 'en' : 'fr'
    const pathWithoutLocale = pathname.replace(/^\/en\/|\/fr\//, '/')
    
    // Créer une réponse de redirection vers la route sans préfixe
    const redirectUrl = new URL(pathWithoutLocale, req.url)
    redirectUrl.search = req.nextUrl.search // Préserver les query params
    
    const response = NextResponse.redirect(redirectUrl)
    
    // Définir la locale dans les cookies pour que next-intl l'utilise
    // next-intl utilise le cookie 'NEXT_LOCALE' pour déterminer la locale
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 an
      sameSite: 'lax',
    })
    
    return response
  }

  try {
    // SOLUTION PERMANENTE: Appeler next-intl de manière conditionnelle
    // Nous créons toujours une réponse NextResponse.next() pour garantir que Next.js gère les routes
    // Si next-intl retourne une redirection valide, nous l'utilisons
    // Sinon, nous continuons avec NextResponse.next() pour laisser Next.js gérer la route
    let intlResponse = NextResponse.next()
    
    // Appliquer le middleware next-intl pour gérer les locales
    // Le middleware next-intl gère automatiquement les exclusions via son propre matcher
    // IMPORTANT: Avec localePrefix: 'never', next-intl ne devrait pas rediriger vers des routes préfixées
    try {
      const intlResult = intlMiddleware(req)
      
      // Si le middleware next-intl a retourné une redirection valide (307/308)
      // Vérifier que la redirection ne pointe pas vers une route préfixée qui n'existe pas
      if (intlResult.status === 307 || intlResult.status === 308) {
        const redirectUrl = intlResult.headers.get('location')
        // Si la redirection pointe vers une route préfixée (/en/ ou /fr/), l'ignorer
        // car notre structure de routes n'a pas de dossier [locale]
        if (redirectUrl && (redirectUrl.startsWith('/en/') || redirectUrl.startsWith('/fr/'))) {
          // Ignorer cette redirection et continuer avec NextResponse.next()
          // La locale sera gérée côté client via NextIntlClientProvider
        } else {
          // Utiliser la redirection si elle ne pointe pas vers une route préfixée
          return intlResult
        }
      }
      
      // Pour toutes les autres réponses (y compris les 404), nous continuons avec NextResponse.next()
      // Cela garantit que Next.js peut gérer toutes les routes existantes
      // next-intl est utilisé uniquement pour les redirections de locale, pas pour le routage principal
      // La locale est toujours disponible via NextIntlClientProvider dans app/layout.tsx
    } catch (error) {
      // En cas d'erreur dans le middleware next-intl, continuer avec NextResponse.next()
      // Cela garantit que les routes fonctionnent même si next-intl a un problème
      logger.error('Middleware - next-intl error', error, {
        error: sanitizeError(error),
      })
    }
    
    // Ensuite, gérer l'authentification Supabase
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
          intlResponse.cookies.set({
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
          intlResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Routes protégées (nécessitent une authentification)
  const protectedRoutes = ['/dashboard', '/students', '/programs', '/payments', '/attendance']
  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  )

  // Routes d'authentification (redirigent si déjà connecté)
  const authRoutes = ['/auth/login', '/auth/register']
  const isAuthRoute = authRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Si la route est protégée et l'utilisateur n'est pas connecté
  if (isProtectedRoute && !session) {
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
  if (isAuthRoute && session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Configuration CORS pour les routes API
  const origin = req.headers.get('origin')
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []
  const isAllowedOrigin = origin && (
    allowedOrigins.includes(origin) ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  )

  // Headers CORS pour les routes API
  if (req.nextUrl.pathname.startsWith('/api')) {
    if (isAllowedOrigin) {
      intlResponse.headers.set('Access-Control-Allow-Origin', origin)
    }
    intlResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    intlResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-learner-student-id')
    intlResponse.headers.set('Access-Control-Allow-Credentials', 'true')
    intlResponse.headers.set('Access-Control-Max-Age', '86400') // 24 heures

    // Répondre immédiatement aux requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: intlResponse.headers })
    }
  }

  // Ajouter les headers de sécurité
  const securityHeaders = {
    // Content Security Policy - Version Elite Ultra Stricte
    'Content-Security-Policy': [
      "default-src 'self'",
      // Scripts: autoriser self, Supabase, analytics (Plausible, Google)
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://plausible.io https://www.googletagmanager.com https://www.google-analytics.com",
      // Styles: autoriser self, inline (requis pour Tailwind/styled-components), Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Images: autoriser self, data URIs, HTTPS, blob (pour preview), Supabase storage
      "img-src 'self' data: https: blob: https://*.supabase.co",
      // Fonts: autoriser self, data URIs, Google Fonts
      "font-src 'self' data: https://fonts.gstatic.com",
      // Connexions: autoriser self, Supabase, WebSocket, analytics
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* wss://localhost:* https://plausible.io https://www.google-analytics.com https://analytics.google.com data:",
      // Frames: autoriser self, Supabase (auth popup)
      "frame-src 'self' https://*.supabase.co",
      // Media: autoriser self, Supabase storage
      "media-src 'self' https://*.supabase.co blob:",
      // Objets: interdire tous les plugins (Flash, Java, etc.)
      "object-src 'none'",
      // Base URI: limiter à self pour prévenir injection de base
      "base-uri 'self'",
      // Actions de formulaire: limiter à self
      "form-action 'self'",
      // Frame ancestors: interdire l'embedding (prévenir clickjacking)
      "frame-ancestors 'none'",
      // Upgrade insecure requests en production
      process.env.NODE_ENV === 'production' ? "upgrade-insecure-requests" : "",
      // Bloquer le mixed content en production
      process.env.NODE_ENV === 'production' ? "block-all-mixed-content" : "",
    ].filter(Boolean).join('; '),

    // Strict Transport Security (HTTPS uniquement en production)
    'Strict-Transport-Security': process.env.NODE_ENV === 'production'
      ? 'max-age=31536000; includeSubDomains; preload'
      : undefined,

    // X-Frame-Options
    'X-Frame-Options': 'DENY',

    // X-Content-Type-Options
    'X-Content-Type-Options': 'nosniff',

    // X-XSS-Protection
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',
    ].join(', '),
  }

  // Appliquer les headers de sécurité
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      intlResponse.headers.set(key, value)
    }
  })

      return intlResponse
    } catch (error) {
      // En cas d'erreur dans le middleware, retourner une réponse Next.js par défaut
      logger.error('Middleware - General error', error, {
        error: sanitizeError(error),
      })
      return NextResponse.next()
    }
  }

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/ (all Next.js internal files - MUST be excluded)
     * - api/ (API routes)
     * - icons/ (icon files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - static assets (images, fonts, etc.)
     */
    // Exclure explicitement _next en premier dans la regex
    '/((?!_next/|_next$|api/|icons/|favicon\\.ico|manifest\\.json|.*\\.(?:png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf|eot|css|js|map)).*)',
  ],
}

