import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { generateNonce, getSecurityHeadersWithNonce, CSP_NONCE_HEADER } from '@/lib/utils/csp'
import { checkApiRateLimitForMiddleware } from '@/lib/utils/rate-limiter-distributed'

// Créer le middleware next-intl avec la configuration de routing
const intlMiddleware = createMiddleware(routing)

const CALENDLY_DEMO_URL = 'https://calendly.com/airtonenile/30min'

// Pages marketing redirigées vers Calendly (stratégie demo-driven)
const MARKETING_PREFIXES = [
  '/demo',
  '/pricing',
  '/formations',
  '/programmes',
  '/blog',
  '/a-propos',
  '/contact',
  '/affiliation',
  '/pour',
]

/** CORS strict : uniquement origines autorisées ou localhost/127.0.0.1 en dev */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  const allowed = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || []
  if (allowed.includes(origin)) return true
  if (process.env.NODE_ENV !== 'development') return false
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Fichiers statiques et pages marketing sans CSP nonce : pas de traitement
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/vsl') ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|json|woff|woff2|ttf|eot|css|js|map)$/i)
  ) {
    return NextResponse.next()
  }

  // Routes API : rate limit global + CORS strict uniquement (pas intl/CSP)
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = await checkApiRateLimitForMiddleware(req)
    const origin = req.headers.get('origin')
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-learner-student-id',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    }
    if (origin && isAllowedOrigin(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin
    }
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders })
    }
    if (rateLimitResult.limited) {
      if (origin && isAllowedOrigin(origin)) {
        rateLimitResult.response.headers.set('Access-Control-Allow-Origin', origin)
      }
      Object.entries(corsHeaders).forEach(([k, v]) => rateLimitResult.response.headers.set(k, v))
      return rateLimitResult.response
    }
    const res = NextResponse.next()
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
    res.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
    res.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.reset).toISOString())
    return res
  }

  // Fast auth check: read Supabase session cookie directly — zero network calls.
  // The cookie exists when a valid session was established. Actual data-access security
  // is enforced at the server component / API route level (getUser() / RLS).
  const supabaseProjectId = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.replace('https://', '').split('.')[0] ?? ''
  const authCookieName = `sb-${supabaseProjectId}-auth-token`
  const authUser = req.cookies.get(authCookieName)?.value ? true : null
  const protectedRoutes = [
    '/dashboard',
    '/students',
    '/programs',
    '/payments',
    '/attendance',
    '/enterprise',
    '/super-admin',
  ]
  // /learner is NOT in protectedRoutes — the learner portal uses token-based auth,
  // not Supabase sessions. Adding it here caused redirect floods for learners.
  const isProtectedRoute = protectedRoutes.some((r) => pathname.startsWith(r))
  const authRoutes = ['/auth/login', '/auth/register']
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r))

  const applySecurityTo = (res: NextResponse): NextResponse => {
    const nonce = generateNonce()
    const securityHeaders = getSecurityHeadersWithNonce(nonce)
    Object.entries(securityHeaders).forEach(([key, value]) => {
      if (value) res.headers.set(key, value)
    })
    return res
  }

  if (isProtectedRoute && !authUser) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return applySecurityTo(NextResponse.redirect(redirectUrl))
  }
  // Only redirect authenticated users away from the login page when they navigated
  // there directly (no redirect param). If a redirect param is present, it means a
  // protected route already rejected the session (e.g. expired JWT) and sent the user
  // here — bouncing them back would create an infinite redirect loop.
  if (isAuthRoute && authUser && !req.nextUrl.searchParams.get('redirect')) {
    return applySecurityTo(NextResponse.redirect(new URL('/dashboard', req.url)))
  }

  // Gérer les routes avec préfixe de locale (/en/* ou /fr/*)
  if (pathname.startsWith('/en/') || pathname.startsWith('/fr/')) {
    const locale = pathname.startsWith('/en/') ? 'en' : 'fr'
    const pathWithoutLocale = pathname.replace(/^\/en\/|\/fr\//, '/')
    const redirectUrl = new URL(pathWithoutLocale, req.url)
    redirectUrl.search = req.nextUrl.search
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    return response
  }

  try {
    const nonce = generateNonce()
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-pathname', pathname)
    requestHeaders.set(CSP_NONCE_HEADER, nonce)
    const intlResponse = NextResponse.next({ request: { headers: requestHeaders } })

    try {
      const intlResult = intlMiddleware(req)
      if (intlResult.status === 307 || intlResult.status === 308) {
        const redirectUrl = intlResult.headers.get('location')
        if (redirectUrl && (redirectUrl.startsWith('/en/') || redirectUrl.startsWith('/fr/'))) {
          // Ignorer la redirection vers préfixe locale
        } else {
          return intlResult
        }
      }
    } catch (error) {
      logger.error('Proxy - next-intl error', error, { error: sanitizeError(error) })
    }

    const securityHeaders = getSecurityHeadersWithNonce(nonce)
    Object.entries(securityHeaders).forEach(([key, value]) => {
      if (value) intlResponse.headers.set(key, value)
    })
    return intlResponse
  } catch (error) {
    logger.error('Proxy - General error', error, { error: sanitizeError(error) })
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/|_next$|api/|icons/|favicon\\.ico|manifest\\.json|.*\\.(?:png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf|eot|css|js|map)).*)',
  ],
}
