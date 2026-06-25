import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { logger } from '@/lib/utils/logger'
import { createPage } from '@/lib/utils/puppeteer-pool'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { pdfRateLimiter } from '@/lib/utils/rate-limiter-distributed'
import { applyRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { uploadGeneratedDocument } from '@/lib/utils/document-storage'
import { createAdminClient } from '@/lib/supabase/admin'

const mmToInch = (mm: number) => `${(mm * 0.03937).toFixed(4)}`

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let page: Awaited<ReturnType<typeof createPage>> | null = null

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(_name: string, _value: string, _options?: CookieOptions) {},
        remove(_name: string, _options?: CookieOptions) {},
      },
    }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Rate limiting : 5 PDF par 2 minutes par utilisateur
  if (pdfRateLimiter) {
    const { success, remaining, reset } = await pdfRateLimiter.limit(`pdf:${user.id}`)
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Trop de générations PDF. Réessayez dans quelques instants.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter), 'X-RateLimit-Remaining': String(remaining) } }
      )
    }
  } else {
    const rl = applyRateLimit(request, RATE_LIMITS.DOCUMENT_GENERATION, user.id)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de générations PDF. Réessayez dans quelques instants.' },
        { status: 429, headers: { ...rl.headers, ...(rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : {}) } }
      )
    }
  }

  try {
    let body
    try {
      body = await request.json()
    } catch (error) {
      logger.error('[PDF API] Erreur lors du parsing du body:', error)
      return NextResponse.json(
        { error: 'Body JSON invalide', details: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }

    const { template, variables, documentId, organizationId } = body as {
      template: DocumentTemplate
      variables: DocumentVariables
      documentId?: string
      organizationId?: string
    }

    if (!template) {
      return NextResponse.json({ error: 'Template manquant' }, { status: 400 })
    }
    if (!variables) {
      return NextResponse.json({ error: 'Variables manquantes' }, { status: 400 })
    }

    logger.debug('[PDF API] Génération PDF', { template: template?.name || 'N/A', type: template?.type || 'N/A', variablesCount: variables ? Object.keys(variables).length : 0 })

    // Générer le HTML
    let htmlResult
    let html: string
    try {
      const { generateHTML } = await import('@/lib/utils/document-generation/html-generator')
      htmlResult = await generateHTML(template, variables, documentId, organizationId)
      html = htmlResult.html
    } catch (error) {
      logger.error('[PDF API] Erreur lors de la génération du HTML:', error)
      const errorDetails: Record<string, unknown> = {
        error: 'Erreur lors de la génération du HTML',
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
      }
      if (process.env.NODE_ENV === 'development' && error instanceof Error && error.stack) {
        errorDetails.stack = error.stack.split('\n').slice(0, 10).join('\n')
      }
      errorDetails.templateInfo = { id: template?.id, type: template?.type, name: template?.name, hasHeader: !!template?.header }
      return NextResponse.json(errorDetails, { status: 500 })
    }

    if (!html || html.trim().length === 0) {
      return NextResponse.json({ error: 'HTML généré est vide' }, { status: 500 })
    }

    const { margins } = htmlResult

    // ── Générer le buffer PDF (Gotenberg → Puppeteer) ────────────────────────
    let pdfBuffer: Buffer | null = null
    let engine: 'gotenberg' | 'puppeteer' = 'puppeteer'

    if (isGotenbergConfigured()) {
      try {
        const gotenbergStart = Date.now()
        const buf = await htmlToPdf(html, {
          format: (template.page_size === 'Letter' ? 'Letter' : 'A4') as 'A4' | 'Letter',
          marginTop: mmToInch(margins.top),
          marginBottom: mmToInch(margins.bottom),
          marginLeft: mmToInch(margins.left),
          marginRight: mmToInch(margins.right),
        })
        if (!buf || buf.length === 0) throw new Error('Gotenberg a retourné un PDF vide')
        pdfBuffer = Buffer.from(buf)
        engine = 'gotenberg'
        logger.info('[PDF API] PDF généré via Gotenberg', {
          template: template.name || 'N/A',
          duration: `${Date.now() - gotenbergStart}ms`,
          size: `${Math.round(pdfBuffer.length / 1024)}KB`,
        })
      } catch (gotenbergError) {
        logger.warn('[PDF API] Gotenberg échoué, bascule vers Puppeteer', {
          error: gotenbergError instanceof Error ? gotenbergError.message : String(gotenbergError),
        })
      }
    }

    if (!pdfBuffer) {
      if (process.env.VERCEL === '1' && !isGotenbergConfigured()) {
        return NextResponse.json(
          {
            error: 'Génération PDF indisponible',
            details: 'Gotenberg n\'est pas configuré. Configurez GOTENBERG_URL dans les variables d\'environnement Vercel.',
            hint: 'Déployez Gotenberg sur Railway/Render et ajoutez GOTENBERG_URL dans Vercel.',
          },
          { status: 503 }
        )
      }

      const puppeteerStart = Date.now()
      try {
        page = await createPage()
        logger.debug('[PDF API] Page Puppeteer obtenue', { duration: `${Date.now() - puppeteerStart}ms` })

        await page.setContent(html, { waitUntil: 'domcontentloaded' })

        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: `${margins.top}mm`,
            right: `${margins.right}mm`,
            bottom: `${margins.bottom}mm`,
            left: `${margins.left}mm`,
          },
        })

        await page.close()
        page = null

        if (!pdf || pdf.length === 0) {
          return NextResponse.json({ error: 'PDF généré est vide' }, { status: 500 })
        }

        pdfBuffer = Buffer.from(pdf)
        engine = 'puppeteer'
        logger.info('[PDF API] PDF généré via Puppeteer (fallback)', {
          template: template.name || 'N/A',
          duration: `${Date.now() - startTime}ms`,
          size: `${Math.round(pdfBuffer.length / 1024)}KB`,
        })
      } catch (error) {
        logger.error('[PDF API] Erreur Puppeteer:', error)
        const err = error instanceof Error ? error : new Error(String(error))
        const errorMessage = err.message
        const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout')
        const isExecutable = errorMessage.includes('executable') || errorMessage.includes('Chrome') || errorMessage.includes('input directory')
        const stack = err.stack ? err.stack.split('\n').slice(0, 8).join('\n') : undefined

        return NextResponse.json(
          process.env.NODE_ENV === 'development'
            ? {
                error: 'Impossible de générer le PDF',
                details: errorMessage,
                stack,
                hint: isExecutable
                  ? 'Sur Vercel: vérifier @sparticuz/chromium-min et mémoire de la fonction (1024 MB min).'
                  : isTimeout
                  ? 'Le lancement de Chrome a pris trop de temps (augmenter maxDuration ou mémoire).'
                  : 'Vérifiez les logs serveur pour plus de détails.',
              }
            : { error: 'Impossible de générer le PDF' },
          { status: 500 }
        )
      }
    }

    // ── Sauvegarder dans generated_documents (non-bloquant sur erreur) ────────
    // Utilise l'admin client pour bypasser la RLS sur l'INSERT
    try {
      const orgId = organizationId || await getUserOrgId(supabase, user.id)
      if (orgId && pdfBuffer) {
        const admin = createAdminClient()
        const fileName = `${template.type || 'document'}_${Date.now()}.pdf`
        const storageUrl = await uploadGeneratedDocument(pdfBuffer, fileName, orgId, 'PDF').catch(() => null)
        const fileUrl = storageUrl ?? `data:application/pdf;base64,${pdfBuffer.toString('base64')}`

        // Types générés obsolètes pour generated_documents (organisation_id absent du snapshot)
        await (admin as unknown as { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } })
          .from('generated_documents').insert({
            organization_id:     orgId,
            template_id:         template.id,
            type:                template.type,
            file_name:           fileName,
            file_url:            fileUrl,
            format:              'PDF',
            page_count:          null,
            generated_by:        user.id,
            metadata:            { template_name: template.name, engine },
          })
      }
    } catch (saveError) {
      logger.warn('[PDF API] Erreur sauvegarde generated_documents (non-bloquant)', {
        error: saveError instanceof Error ? saveError.message : String(saveError),
      })
    }

    // ── Retourner le PDF binaire ──────────────────────────────────────────────
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${template.name || 'document'}.pdf"`,
        'X-PDF-Engine': engine,
      },
    })
  } catch (error) {
    logger.error('[PDF API] Erreur globale lors de la génération du PDF:', error)
    const err = error instanceof Error ? error : new Error(String(error))
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération du PDF',
        details: err.message,
        type: err instanceof Error ? err.constructor.name : typeof error,
      },
      { status: 500 }
    )
  } finally {
    if (page) {
      try { await page.close() } catch { /* ignore */ }
    }
  }
}
