import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'read:templates') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to read templates' },
        { status: 403 }
      )
    }

    const { id } = await params
    const startTime = Date.now()

    const adminClient = createAdminClient()
    const templateService = new DocumentTemplateService(adminClient)
    const apiService = createAPIService(adminClient)

    const template = await templateService.getTemplateById(id)

    // Vérifier que le template appartient à l'organisation
    if (!template || (template as any).organization_id !== middleware.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'GET',
      `/api/v1/document-templates/${id}`,
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json(
      { data: template },
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
