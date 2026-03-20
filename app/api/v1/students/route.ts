import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { createStudentService } from '@/lib/services/student.service'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50') || 50), 100)
    const search = searchParams.get('search') || undefined

    // Utiliser le client admin (bypass RLS — pas de session utilisateur ici)
    const adminClient = createAdminClient()
    const studentService = createStudentService(adminClient)
    const apiService = createAPIService(adminClient)

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

/**
 * POST /api/v1/students
 * Crée un nouvel apprenant
 */
export async function POST(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'write:students') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to create students' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { first_name, last_name, email, phone, date_of_birth, status } = body

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'first_name and last_name are required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const adminClient = createAdminClient()
    const studentService = createStudentService(adminClient)
    const apiService = createAPIService(adminClient)

    const student = await studentService.create({
      first_name,
      last_name,
      email: email || null,
      phone: phone || null,
      date_of_birth: date_of_birth || null,
      status: status || 'active',
      organization_id: middleware.organizationId,
    })

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'POST',
      '/api/v1/students',
      request.nextUrl.pathname,
      201,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json(
      { data: student },
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
    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    )
  }
}
