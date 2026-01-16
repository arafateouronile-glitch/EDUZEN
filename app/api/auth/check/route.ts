import { NextRequest, NextResponse } from 'next/server'
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
 */
export async function GET(request: NextRequest) {
  return withRateLimit(request, generalRateLimiter, async (req) => {
    try {
      // Liste tous les cookies présents
      const allCookies = request.cookies.getAll()
      const cookieNames = allCookies.map(c => c.name)

      // Cherche les cookies Supabase
      const supabaseCookies = allCookies.filter(c =>
        c.name.includes('supabase') ||
        c.name.includes('sb-')
      )

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
            setAll(cookiesToSet) {
              // Ne rien faire
            },
          },
        }
      )

      // Méthode 1 : getUser standard
      const { data: userData, error: userError } = await supabase.auth.getUser()

      // Méthode 2 : setSession avec les tokens parsés
      let userFromManualSession = null
      if (sessionTokens?.access_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token: sessionTokens.access_token,
          refresh_token: sessionTokens.refresh_token || '',
        })
        userFromManualSession = data?.user
      }

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        cookies: {
          total: allCookies.length,
          names: cookieNames,
          supabaseCookies: supabaseCookies.map(c => ({
            name: c.name,
            valueLength: c.value?.length || 0,
            valuePreview: c.value?.substring(0, 50) + '...'
          }))
        },
        standardAuth: {
          id: userData?.user?.id || null,
          email: userData?.user?.email || null,
          error: userError?.message || null
        },
        manualSessionAuth: {
          hasTokens: !!sessionTokens,
          id: userFromManualSession?.id || null,
          email: userFromManualSession?.email || null,
        }
      })
    } catch (error: unknown) {
      throw errorHandler.handleError(error, {
        operation: 'checkAuth',
      })
    }
  })
}

