import { NextRequest, NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../middleware'
import { apiService } from '@/lib/services/api.service'
import { studentService } from '@/lib/services/student.service'

/**
 * GET /api/v1/students
 * Récupère la liste des étudiants
 */
export async function GET(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) {
      return middleware
    }

    // Vérifier le scope
    if (!hasScope(middleware.scopes, 'read:students')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to read students' },
        { status: 403 }
      )
    }

    const startTime = Date.now()
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || undefined

    // Récupérer les étudiants
    const students = await studentService.getAll(middleware.organizationId, {
      page,
      limit,
      search,
    })

    const responseTime = Date.now() - startTime

    // Enregistrer la requête
    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'GET',
      '/api/v1/students',
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      Object.fromEntries(searchParams)
    )

    return NextResponse.json(
      {
        data: students.data,
        meta: {
          page,
          limit,
          total: students.total,
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
