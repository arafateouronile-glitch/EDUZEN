import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/v1/enrollments
 * Récupère les inscriptions de l'organisation
 * Filtrables par session_id ou student_id
 */
export async function GET(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'read:enrollments') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to read enrollments' },
        { status: 403 }
      )
    }

    const startTime = Date.now()
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50') || 50), 100)
    const offset = (page - 1) * limit
    const sessionId = searchParams.get('session_id') || undefined
    const studentId = searchParams.get('student_id') || undefined
    const status = searchParams.get('status') || undefined

    const adminClient = createAdminClient()
    const apiService = createAPIService(adminClient)

    // Récupérer les sessions de l'organisation pour filtrer les inscriptions par org
    let query = adminClient
      .from('enrollments')
      .select(`
        *,
        students!inner(id, first_name, last_name, email, organization_id),
        sessions(id, name, start_date, end_date, status)
      `, { count: 'exact' })
      .eq('students.organization_id', middleware.organizationId)

    if (sessionId) query = query.eq('session_id', sessionId)
    if (studentId) query = query.eq('student_id', studentId)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'GET',
      '/api/v1/enrollments',
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      Object.fromEntries(searchParams)
    )

    return NextResponse.json(
      { data: data || [], meta: { page, limit, total: count || 0 } },
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

/**
 * POST /api/v1/enrollments
 * Inscrit un apprenant à une session
 *
 * Body:
 *   student_id: string
 *   session_id: string
 *   status?: string         (défaut: 'active')
 *   total_amount?: number   (défaut: 0)
 *   funding_type_id?: string
 *   enrollment_date?: string (ISO)
 */
export async function POST(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'write:enrollments') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to create enrollments' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { student_id, session_id, status, total_amount, funding_type_id, enrollment_date } = body

    if (!student_id) return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    if (!session_id) return NextResponse.json({ error: 'session_id is required' }, { status: 400 })

    const startTime = Date.now()
    const adminClient = createAdminClient()
    const apiService = createAPIService(adminClient)

    // Vérifier que l'apprenant appartient à l'organisation
    const { data: student } = await adminClient
      .from('students')
      .select('id')
      .eq('id', student_id)
      .eq('organization_id', middleware.organizationId)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Vérifier que la session appartient à l'organisation
    const { data: session } = await adminClient
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .eq('organization_id', middleware.organizationId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data, error } = await adminClient
      .from('enrollments')
      .insert({
        student_id,
        session_id,
        status: status || 'active',
        total_amount: total_amount ?? 0,
        funding_type_id: funding_type_id || null,
        enrollment_date: enrollment_date || new Date().toISOString(),
      })
      .select('id, student_id, session_id, status, total_amount, funding_type_id, enrollment_date, created_at')
      .single()

    if (error) throw new Error(error.message)

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'POST',
      '/api/v1/enrollments',
      request.nextUrl.pathname,
      201,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      { student_id, session_id }
    )

    return NextResponse.json(
      { data },
      {
        status: 201,
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
