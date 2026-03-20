import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiMiddleware, hasScope } from '../../middleware'
import { createAPIService } from '@/lib/services/api.service'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import { generatePDF } from '@/lib/utils/document-generation/pdf-generator'
import { generateDOCX } from '@/lib/utils/document-generation/docx-generator'
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DocumentTemplate } from '@/lib/types/document-templates'

/**
 * POST /api/v1/documents/generate
 * Génère un document à partir d'un template
 *
 * Body:
 *   template_id: string
 *   format: 'PDF' | 'DOCX' | 'HTML'
 *   variables: Record<string, string>
 *   related_entity_type?: string
 *   related_entity_id?: string
 *   download?: boolean   (défaut: true — retourne le fichier en binaire)
 *                         false — retourne uniquement l'URL du fichier stocké
 */
export async function POST(request: NextRequest) {
  try {
    const middleware = await apiMiddleware(request)
    if (middleware instanceof NextResponse) return middleware

    if (!hasScope(middleware.scopes, 'write:documents') && !hasScope(middleware.scopes, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'This API key does not have permission to generate documents' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { template_id, format, variables, related_entity_type, related_entity_id } = body
    const download: boolean = body.download !== false

    if (!template_id) {
      return NextResponse.json({ error: 'template_id is required' }, { status: 400 })
    }
    if (!format || !['PDF', 'DOCX', 'HTML'].includes(format)) {
      return NextResponse.json({ error: 'format must be PDF, DOCX or HTML' }, { status: 400 })
    }
    if (!variables || typeof variables !== 'object') {
      return NextResponse.json({ error: 'variables must be an object' }, { status: 400 })
    }

    const startTime = Date.now()
    const adminClient = createAdminClient()
    const templateService = new DocumentTemplateService(adminClient)
    const apiService = createAPIService(adminClient)

    const template = await templateService.getTemplateById(template_id)
    if (!template || (template as any).organization_id !== middleware.organizationId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const baseName = `${template.type}_${Date.now()}`
    let blob: Blob
    let fileName: string
    let pageCount = 1

    if (format === 'PDF') {
      const result = await generatePDF(template as unknown as DocumentTemplate, variables, undefined, middleware.organizationId)
      blob = result.blob
      pageCount = result.pageCount
      fileName = `${baseName}.pdf`
    } else if (format === 'DOCX') {
      const result = await generateDOCX(template as unknown as DocumentTemplate, variables, undefined, middleware.organizationId)
      blob = result.blob
      fileName = `${baseName}.docx`
    } else {
      const result = await generateHTML(template as unknown as DocumentTemplate, variables, undefined, middleware.organizationId)
      blob = new Blob([result.html], { type: 'text/html;charset=utf-8' })
      pageCount = result.pageCount
      fileName = `${baseName}.html`
    }

    const responseTime = Date.now() - startTime

    await apiService.logAPIRequest(
      middleware.key.id,
      middleware.organizationId,
      'POST',
      '/api/v1/documents/generate',
      request.nextUrl.pathname,
      200,
      responseTime,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      { template_id, format, related_entity_type, related_entity_id }
    )

    if (download) {
      const contentTypeMap: Record<string, string> = {
        PDF: 'application/pdf',
        DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        HTML: 'text/html',
      }
      return new NextResponse(blob, {
        headers: {
          'Content-Type': contentTypeMap[format],
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'X-Page-Count': pageCount.toString(),
          'X-RateLimit-Remaining': middleware.rateLimit.remaining.toString(),
          'X-RateLimit-Reset': middleware.rateLimit.resetAt.toISOString(),
        },
      })
    }

    return NextResponse.json(
      { data: { file_name: fileName, page_count: pageCount, format } },
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
