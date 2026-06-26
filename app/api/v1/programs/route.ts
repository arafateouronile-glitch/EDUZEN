import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/programs
 * Récupère la liste des programmes avec leurs stats (taux de réussite, satisfaction, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'read:programs') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to read programs' },
        { status: 403 }
      )
    }

    const startTime = Date.now()
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50') || 50), 100)
    const offset = (page - 1) * limit
    const search = searchParams.get('search') || undefined
    const isPublic = searchParams.get('is_public')
    const isActive = searchParams.get('is_active')

    const adminClient = createAdminClient()
    const apiService = createAPIService(adminClient)

    // Les clés "site web" ne peuvent voir que les programmes publics, peu importe le paramètre passé
    const PUBLIC_WEB_SCOPES = new Set(['read:programs', 'read:sessions', 'read:formations'])
    const isWebOnlyKey = middleware.scopes.length > 0 && middleware.scopes.every(s => PUBLIC_WEB_SCOPES.has(s))
    const effectiveIsPublic = isWebOnlyKey ? 'true' : isPublic

    let query = adminClient
      .from('programs')
      .select(
        'id, name, code, description, category, success_rate, satisfaction_rate, completion_rate, total_learners, is_public, public_description, public_image_url, price, price_individual, price_freelance, price_enterprise, is_active, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('organization_id', middleware.organizationId)

    if (effectiveIsPublic !== null) query = query.eq('is_public', effectiveIsPublic === 'true')
    if (isActive !== null) query = query.eq('is_active', isActive !== 'false')
    if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`)

    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)

    const total = count ?? 0
    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'GET',
      '/api/v1/programs',
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      Object.fromEntries(searchParams)
    )

    return NextResponse.json(
      { data: data ?? [], meta: { page, limit, total } },
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
