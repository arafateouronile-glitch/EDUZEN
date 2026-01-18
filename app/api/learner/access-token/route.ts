import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database.types'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

// Générer un token d'accès pour un stagiaire
export async function POST(request: NextRequest) {
  try {
    // Créer le client Supabase avec les cookies de la requête (même méthode que le middleware)
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Pas nécessaire pour la lecture
          },
          remove(name: string, options: CookieOptions) {
            // Pas nécessaire pour la lecture
          },
        },
      }
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    const body = await request.json()
    const { studentId, sessionId, expiresInDays = 30, maxUses = null } = body
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId est requis' },
        { status: 400 }
      )
    }
    
    logger.debug('Generating access token', {
      studentId: maskId(studentId),
      sessionId: sessionId ? maskId(sessionId) : undefined,
      expiresInDays,
    })

    // Générer le token via la fonction SQL
    const { data, error } = await supabase
      .rpc('generate_learner_access_token', {
        p_student_id: studentId,
        p_session_id: sessionId || null,
        p_expires_in_days: expiresInDays,
        p_max_uses: maxUses
      })

    if (error) {
      logger.error('Token generation failed', error, {
        errorCode: error.code,
        errorMessage: error.message,
        studentId: maskId(studentId),
      })
      return NextResponse.json(
        { error: 'Erreur lors de la génération du token', details: error.message },
        { status: 500 }
      )
    }
    
    // Construire l'URL complète
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const result = data?.[0] || data
    
    return NextResponse.json({
      success: true,
      token: result.token,
      expiresAt: result.expires_at,
      accessUrl: `${baseUrl}${result.access_url}`
    })
    
  } catch (error) {
    logger.error('Access token POST failed', error, {
      error: sanitizeError(error),
    })
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Générer des tokens en masse pour une session
export async function PUT(request: NextRequest) {
  try {
    // Créer le client Supabase avec les cookies de la requête (même méthode que le middleware)
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Dans une API route, on ne peut pas modifier les cookies de réponse facilement
            // mais ce n'est pas nécessaire pour la lecture
          },
          remove(name: string, options: CookieOptions) {
            // Dans une API route, on ne peut pas supprimer les cookies facilement
            // mais ce n'est pas nécessaire pour la lecture
          },
        },
      }
    )
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      logger.error('Bulk token generation auth failed', authError, {
        errorCode: authError.code,
      })
      return NextResponse.json(
        { error: 'Erreur d\'authentification', details: authError.message },
        { status: 401 }
      )
    }

    if (!user) {
      logger.warn('Bulk token generation: no authenticated user')
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vous reconnecter.' },
        { status: 401 }
      )
    }

    logger.debug('Bulk token generation: user authenticated', {
      userId: maskId(user.id),
    })
    
    const body = await request.json()
    const { sessionId, expiresInDays = 30, maxUses = null } = body
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId est requis' },
        { status: 400 }
      )
    }
    
    logger.debug('Generating bulk tokens', {
      sessionId: maskId(sessionId),
      expiresInDays,
    })

    // Générer les tokens en masse via la fonction SQL
    const { data, error } = await supabase
      .rpc('generate_bulk_learner_access_tokens', {
        p_session_id: sessionId,
        p_expires_in_days: expiresInDays,
        p_max_uses: maxUses
      })

    if (error) {
      logger.error('Bulk token generation failed', error, {
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        sessionId: maskId(sessionId),
      })
      
      // Si la fonction n'existe pas, retourner un message clair
      if (error.code === '42883') {
        return NextResponse.json(
          { 
            error: 'La fonction generate_bulk_learner_access_tokens n\'existe pas encore. Veuillez exécuter la migration SQL dans Supabase.',
            details: error.message,
            hint: 'Exécutez le script supabase/migrations/20241205000001_learner_access_tokens.sql dans Supabase SQL Editor'
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Erreur lors de la génération des tokens', 
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      )
    }
    
    // Construire les URLs complètes
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const tokens = (data || []).map((item: any) => ({
      studentId: item.student_id,
      studentName: item.student_name,
      token: item.token,
      accessUrl: `${baseUrl}${item.access_url}`
    }))
    
    return NextResponse.json({
      success: true,
      count: tokens.length,
      tokens
    })
    
  } catch (error: any) {
    logger.error('Bulk token generation failed with exception', error, {
      error: sanitizeError(error),
      errorType: error?.constructor?.name,
    })

    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error?.message || 'Erreur inconnue',
        type: error?.constructor?.name
      },
      { status: 500 }
    )
  }
}

// Révoquer un token
export async function DELETE(request: NextRequest) {
  try {
    // Créer le client Supabase avec les cookies de la requête (même méthode que le middleware)
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Pas nécessaire pour la lecture
          },
          remove(name: string, options: CookieOptions) {
            // Pas nécessaire pour la lecture
          },
        },
      }
    )
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      logger.error('Token revocation auth failed', authError, {
        errorCode: authError.code,
      })
      return NextResponse.json(
        { error: 'Erreur d\'authentification', details: authError.message },
        { status: 401 }
      )
    }

    if (!user) {
      logger.warn('Token revocation: no authenticated user')
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vous connecter.' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { error: 'token est requis' },
        { status: 400 }
      )
    }
    
    logger.debug('Revoking access token', {
      hasToken: !!token,
    })

    // Révoquer le token via la fonction SQL
    const { data, error } = await supabase
      .rpc('revoke_learner_access_token', {
        p_token: token
      })

    if (error) {
      logger.error('Token revocation failed', error, {
        errorCode: error.code,
        errorMessage: error.message,
      })
      return NextResponse.json(
        { error: 'Erreur lors de la révocation du token', details: error.message },
        { status: 500 }
      )
    }

    logger.info('Token revoked successfully')
    
    return NextResponse.json({
      success: true,
      revoked: data
    })
    
  } catch (error) {
    logger.error('Token revocation failed with exception', error, {
      error: sanitizeError(error),
    })
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

