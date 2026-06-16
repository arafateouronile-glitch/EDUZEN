import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { generatePDF } from '@/lib/utils/document-generation/pdf-generator'
import { generateDOCX } from '@/lib/utils/document-generation/docx-generator'
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { emailService } from '@/lib/services/email.service'
import { templateAnalyticsService } from '@/lib/services/template-analytics.service'
import type { GenerateDocumentInput, DocumentTemplate } from '@/lib/types/document-templates'
import type { Database } from '@/types/database.types'
import { withRateLimit, mutationRateLimiter } from '@/app/api/_middleware/rate-limit'
import { getUserOrgId } from '@/lib/utils/with-auth'
import type { CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, sanitizeError } from '@/lib/utils/logger'

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildSupabaseClient(req: NextRequest) {
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set(_name: string, _value: string, _options?: CookieOptions) {},
        remove(_name: string, _options?: CookieOptions) {},
      },
    }
  )
}

async function generateDocumentBlob(
  template: DocumentTemplate,
  body: GenerateDocumentInput,
  organizationId: string
): Promise<{ blob: Blob; pageCount: number; fileName: string }> {
  const ext = body.format.toLowerCase()
  const baseName = `${template.type}_${Date.now()}`

  if (body.format === 'PDF') {
    logger.info('Début génération PDF', { templateId: template.id, templateType: template.type })
    try {
      const result = await generatePDF(template, body.variables, undefined, organizationId)
      logger.info('PDF généré', { fileSize: result.blob.size, pageCount: result.pageCount })
      return { ...result, fileName: `${baseName}.pdf` }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // En production, ne pas exposer les détails de l'infrastructure
      if (msg.includes('Puppeteer') || msg.includes('Chromium') || msg.includes('browser')) {
        const userMsg = process.env.NODE_ENV === 'development'
          ? `Puppeteer/Chromium non disponible: ${msg}`
          : 'Impossible de générer le PDF. Veuillez réessayer ou contacter le support.'
        throw new Error(userMsg)
      }
      throw err
    }
  }

  if (body.format === 'DOCX') {
    logger.info('Début génération DOCX', { templateId: template.id })
    const result = await generateDOCX(template, body.variables, undefined, organizationId)
    logger.info('DOCX généré', { fileSize: result.blob.size })
    return { ...result, fileName: `${baseName}.docx` }
  }

  if (body.format === 'HTML') {
    logger.info('Début génération HTML', { templateId: template.id })
    const result = await generateHTML(template, body.variables, undefined, organizationId)
    const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' })
    return { blob, pageCount: result.pageCount, fileName: `${baseName}.html` }
  }

  if (body.format === 'ODT') {
    throw Object.assign(new Error('Format ODT non implémenté'), { statusCode: 501 })
  }

  throw new Error(`Format non supporté: ${body.format}`)
}

async function sendDocumentEmail(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>
  body: GenerateDocumentInput
  template: { id: string; name?: string | null; type: string }
  organizationName: string | null
  organizationEmail: string | null
  fileBlob: Blob
  fileName: string
  documentId: string | undefined
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, body, template, organizationName, organizationEmail, fileBlob, fileName, documentId } = params

  let recipientName = ''
  let emailTo = body.options?.emailTo ?? ''

  if (body.related_entity_type === 'student' && body.related_entity_id) {
    const { data: student } = await supabase
      .from('students')
      .select('first_name, last_name, email')
      .eq('id', body.related_entity_id)
      .single()

    if (student) {
      recipientName = `${student.first_name} ${student.last_name}`
      if (!emailTo && student.email) emailTo = student.email // pas de mutation du body
    }
  }

  if (!emailTo) return { success: false, error: 'Aucun destinataire email' }

  const documentTitle = template.name || `Document ${template.type}`
  const arrayBuffer = await fileBlob.arrayBuffer()
  const contentTypeMap: Record<string, string> = {
    PDF:  'application/pdf',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    HTML: 'text/html',
  }

  await emailService.sendEmail({
    to: emailTo,
    subject: `${documentTitle} - ${organizationName || 'Eduzen'}`,
    html: `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background:#335ACF;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}
        .content{padding:20px;background:#f9fafb;border:1px solid #e5e7eb}
        .footer{text-align:center;padding:20px;color:#6b7280;font-size:12px}
      </style></head><body>
      <div class="container">
        <div class="header"><h1>${documentTitle}</h1></div>
        <div class="content">
          ${recipientName ? `<p>Bonjour ${recipientName},</p>` : '<p>Bonjour,</p>'}
          <p>Veuillez trouver ci-joint votre document <strong>${documentTitle}</strong>.</p>
          <p>Ce document a été généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.</p>
          ${organizationName ? `<p>Cordialement,<br><strong>${organizationName}</strong></p>` : '<p>Cordialement,<br>L\'équipe Eduzen</p>'}
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
          ${organizationEmail ? `<p>Pour toute question, contactez-nous à ${organizationEmail}</p>` : ''}
        </div>
      </div></body></html>`,
    text: `Bonjour${recipientName ? ` ${recipientName}` : ''},\n\nVeuillez trouver ci-joint votre document ${documentTitle}.\n\nCe document a été généré le ${new Date().toLocaleDateString('fr-FR')}.\n\n${organizationName ? `Cordialement,\n${organizationName}` : 'Cordialement,\nL\'équipe Eduzen'}`,
    attachments: [{ filename: fileName, content: arrayBuffer, contentType: contentTypeMap[body.format] || 'application/octet-stream' }],
    templateType: template.type,
  })

  logger.info('Email envoyé', { to: emailTo, documentId })
  return { success: true }
}

// ─── Handler principal ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  return withRateLimit(request, mutationRateLimiter, async (req) => {
    try {
      const nextReq = req as unknown as NextRequest
      const supabase = buildSupabaseClient(nextReq)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }

      const orgId = await getUserOrgId(supabase, user.id)
      if (!orgId) {
        return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
      }

      const body: GenerateDocumentInput = await req.json()

      // Récupérer et vérifier le template
      const { data: template, error: templateError } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', body.template_id)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
      }

      if (template.organization_id !== orgId) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
      }

      // Vérifier que le template a du contenu
      const tplContent = template.content as { html?: string; elements?: unknown[] } | null
      const tplHeader  = template.header  as { content?: string } | null
      const tplFooter  = template.footer  as { content?: string } | null
      const hasContent = tplContent?.html || tplContent?.elements?.length || tplHeader?.content || tplFooter?.content

      if (!hasContent) {
        return NextResponse.json(
          { error: 'Le template ne contient pas de contenu. Veuillez l\'éditer avant de générer un document.' },
          { status: 400 }
        )
      }

      // Format ODT : réponse rapide avant toute génération
      if (body.format === 'ODT') {
        return NextResponse.json({ error: 'Le format ODT n\'est pas encore implémenté. Utilisez PDF, DOCX ou HTML.' }, { status: 501 })
      }

      // Génération du document
      const generationStartTime = Date.now()
      let fileBlob: Blob
      let pageCount: number
      let fileName: string

      try {
        const result = await generateDocumentBlob(template as unknown as DocumentTemplate, body, orgId)
        fileBlob  = result.blob
        pageCount = result.pageCount
        fileName  = result.fileName
      } catch (genError) {
        const msg = genError instanceof Error ? genError.message : 'Erreur de génération'
        logger.error('Génération document échouée', sanitizeError(genError), { format: body.format, templateId: template.id })
        return NextResponse.json({ error: msg }, { status: 500 })
      }

      // Encode en base64 pour la réponse
      const arrayBuffer = await fileBlob.arrayBuffer()
      const base64  = Buffer.from(arrayBuffer).toString('base64')
      const fileUrl = `data:application/${body.format.toLowerCase()};base64,${base64}`

      // Récupérer l'organisation pour l'email
      const { data: organization } = await supabase
        .from('organizations')
        .select('name, email')
        .eq('id', orgId)
        .single()

      // Enregistrement du document généré
      const { data: generatedDocument, error: docError } = await supabase
        .from('generated_documents')
        .insert({
          organization_id:     orgId,
          template_id:         template.id,
          type:                template.type,
          file_name:           fileName,
          file_url:            fileUrl,
          format:              body.format,
          page_count:          pageCount,
          related_entity_type: body.related_entity_type,
          related_entity_id:   body.related_entity_id,
          metadata:            (body.variables ?? {}) as import('@/types/database.types').Json,
          generated_by:        user.id,
        })
        .select()
        .single()

      if (docError) {
        logger.error('Erreur création enregistrement document', sanitizeError(docError), { templateId: template.id })
        // On continue car le document est généré
      }

      // Analytics (non-bloquant)
      templateAnalyticsService.logEvent(template.id, 'generate', {
        organization_id:     orgId,
        user_id:             user.id,
        format:              body.format,
        variablesCount:      Object.keys(body.variables || {}).length,
        generationTimeMs:    Date.now() - generationStartTime,
        fileSizeBytes:       fileBlob.size,
        pageCount,
        related_entity_type: body.related_entity_type,
        related_entity_id:   body.related_entity_id,
      }).catch(err => logger.warn('Erreur analytics', { error: sanitizeError(err) }))

      // Envoi email (non-bloquant sur erreur)
      let emailResult: { success: boolean; error?: string } | null = null
      if (body.options?.sendEmail && body.options?.emailTo) {
        try {
          emailResult = await sendDocumentEmail({
            supabase,
            body,
            template,
            organizationName:  organization?.name ?? null,
            organizationEmail: organization?.email ?? null,
            fileBlob,
            fileName,
            documentId: generatedDocument?.id,
          })
        } catch (emailError) {
          logger.error('Erreur envoi email', sanitizeError(emailError), { documentId: generatedDocument?.id })
          emailResult = { success: false, error: emailError instanceof Error ? emailError.message : 'Erreur inconnue' }
        }
      }

      return NextResponse.json({
        document:   generatedDocument,
        downloadUrl: fileUrl,
        fileName,
        emailSent:  emailResult?.success ?? false,
        emailError: emailResult?.success === false ? emailResult.error : undefined,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue'
      logger.error('Erreur génération document', sanitizeError(error), { errorMessage })
      return NextResponse.json(
        {
          error: errorMessage,
          ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { stack: error.stack } : {}),
        },
        { status: 500 }
      )
    }
  })
}
