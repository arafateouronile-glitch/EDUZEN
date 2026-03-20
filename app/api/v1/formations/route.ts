import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { FormationService } from '@/lib/services/formation.service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/formations
 * Récupère la liste des formations de l'organisation
 */
export async function GET(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'read:formations') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to read formations' },
        { status: 403 }
      )
    }

    const startTime = Date.now()
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50') || 50), 100)
    const offset = (page - 1) * limit
    const search = searchParams.get('search') || undefined
    const programId = searchParams.get('program_id') || undefined

    const adminClient = createAdminClient()
    const formationService = new FormationService(adminClient)
    const apiService = createAPIService(adminClient)

    const result = await formationService.getAllFormations(middleware.organizationId, {
      programId,
      search,
      limit,
      offset,
    }) as { data: unknown[]; count: number; hasMore: boolean }

    const { data, count: total } = result

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'GET',
      '/api/v1/formations',
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      Object.fromEntries(searchParams)
    )

    return NextResponse.json(
      { data, meta: { page, limit, total } },
      {
        headers: {
          'X-RateLimit-Remaining': middleware.rateLimit.remaining.toString(),
          'X-RateLimit-Reset': middleware.rateLimit.resetAt.toISOString(),
        },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: 'Internal server error', message: errorMessage }, { status: 500 })
  }
}
