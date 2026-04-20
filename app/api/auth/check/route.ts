import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { withRateLimit, generalRateLimiter } from '@/lib/utils/rate-limiter'
import { errorHandler } from '@/lib/errors'

/**
 * Parse le cookie d'authentification Supabase stocké en JSON
 */
function getSupabaseSession(request: NextRequest) {
  const authCookie = request.cookies.getAll().find(c => c.name.includes('-auth-token'))
  if (!authCookie) return null
  
  try {
    const parsed = JSON.parse(authCookie.value)
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
    }
  } catch {
    return null
  }
}

/**
 * API Route de test pour vérifier l'état de l'authentification
 * RÉSERVÉ AU DÉVELOPPEMENT — bloqué en production
 */
export async function GET(request: NextRequest) {
  // Bloquer en production : cette route expose des informations de debug sensibles
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return withRateLimit(request, generalRateLimiter, async (req) => {
    try {
      // Cherche les cookies Supabase (noms seulement, pas de valeurs)
      const allCookies = request.cookies.getAll()
      const supabaseCookieNames = allCookies
        .filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
        .map(c => c.name)

      // Parser le token manuellement
      const sessionTokens = getSupabaseSession(request)

      // Créer le client Supabase avec les cookies de la requête
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll() {
              // Ne rien faire
            },
          },
        }
      )

      // Vérifier l'authentification standard
      const { data: userData, error: userError } = await supabase.auth.getUser()

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        cookies: {
          total: allCookies.length,
          supabaseCookieNames,
        },
        standardAuth: {
          authenticated: !!userData?.user,
          error: userError?.message || null,
        },
        manualSessionAuth: {
          hasTokens: !!sessionTokens,
        },
      })
    } catch (error: unknown) {
      throw errorHandler.handleError(error, {
        operation: 'checkAuth',
      })
    }
  })
}

