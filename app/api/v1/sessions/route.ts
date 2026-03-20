import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/sessions
 * Récupère la liste des sessions de formation
 */
export async function GET(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) {
      return middleware
    }

    // Vérifier le scope
    if (!hasScope(middleware.scopes, 'read:sessions') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to read sessions' },
        { status: 403 }
      )
    }

    const startTime = Date.now()
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50') || 50), 100)
    const offset = (page - 1) * limit
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const formationId = searchParams.get('formation_id') || undefined

    // Utiliser le client admin (bypass RLS — pas de session utilisateur ici)
    const adminClient = createAdminClient()
    const apiService = createAPIService(adminClient)

    let query = adminClient
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('organization_id', middleware.organizationId)

    if (status) query = query.eq('status', status)
    if (formationId) query = query.eq('formation_id', formationId)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error, count } = await query
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)

    const responseTime = Date.now() - startTime

    // Enregistrer la requête
    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'GET',
      '/api/v1/sessions',
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      Object.fromEntries(searchParams)
    )

    return NextResponse.json(
      {
        data: data || [],
        meta: {
          page,
          limit,
          total: count || 0,
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': middleware.rateLimit.remaining.toString(),
          'X-RateLimit-Reset': middleware.rateLimit.resetAt.toISOString(),
        },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    )
  }
}
