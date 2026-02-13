import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger, sanitizeError } from './lib/utils/logger'
import { generateNonce, getSecurityHeadersWithNonce, CSP_NONCE_HEADER } from './lib/utils/csp'

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
    // Réponse avec x-pathname pour le layout dashboard (auth faite côté layout, pas ici = proxy rapide)
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-pathname', pathname)
    let intlResponse = NextResponse.next({ request: { headers: requestHeaders } })
    
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
    
    // Auth et onboarding : gérés dans app/(dashboard)/layout.tsx (server) pour garder le proxy rapide

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

  // Générer un nonce unique pour cette requête (protection CSP)
  const nonce = generateNonce()

  // Ajouter les headers de sécurité avec le nonce CSP
  const securityHeaders = getSecurityHeadersWithNonce(nonce)

  // Appliquer les headers de sécurité
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      intlResponse.headers.set(key, value)
    }
  })

  // Passer le nonce aux Server Components via le header de requête
  // Cela permet aux composants de récupérer le nonce pour les scripts inline
  const reqHeadersWithNonce = new Headers(req.headers)
  reqHeadersWithNonce.set(CSP_NONCE_HEADER, nonce)

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

