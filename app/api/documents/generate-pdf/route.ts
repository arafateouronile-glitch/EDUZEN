import { NextRequest, NextResponse } from 'next/server'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { logger } from '@/lib/utils/logger'
import { createPage } from '@/lib/utils/puppeteer-pool'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'

const mmToInch = (mm: number) => `${(mm * 0.03937).toFixed(4)}`

// Configuration de la route API
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 secondes maximum

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let page: Awaited<ReturnType<typeof createPage>> | null = null

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
      logger.error('[PDF API] Template manquant')
      return NextResponse.json(
        { error: 'Template manquant' },
        { status: 400 }
      )
    }

    if (!variables) {
      logger.error('[PDF API] Variables manquantes')
      return NextResponse.json(
        { error: 'Variables manquantes' },
        { status: 400 }
      )
    }

    logger.debug('[PDF API] Génération PDF', { template: template?.name || 'N/A', type: template?.type || 'N/A', variablesCount: variables ? Object.keys(variables).length : 0 })

    // Générer le HTML avec Paged.js
    let htmlResult
    let html: string
    try {
      const { generateHTML } = await import('@/lib/utils/document-generation/html-generator')
      htmlResult = await generateHTML(template, variables, documentId, organizationId)
      html = htmlResult.html
    } catch (error) {
      logger.error('[PDF API] Erreur lors de la génération du HTML:', error)
      const errorDetails: any = {
        error: 'Erreur lors de la génération du HTML',
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
      }

      if (error instanceof Error && error.stack) {
        errorDetails.stack = error.stack.split('\n').slice(0, 10).join('\n')
      }

      errorDetails.templateInfo = {
        id: template?.id,
        type: template?.type,
        name: template?.name,
        hasHeader: !!template?.header,
      }

      return NextResponse.json(errorDetails, { status: 500 })
    }

    if (!html || html.trim().length === 0) {
      logger.error('[PDF API] HTML généré est vide')
      return NextResponse.json(
        { error: 'HTML généré est vide' },
        { status: 500 }
      )
    }

    const { margins } = htmlResult

    // --- Gotenberg (moteur principal) ---
    if (isGotenbergConfigured()) {
      try {
        const gotenbergStart = Date.now()
        const pdfBuffer = await htmlToPdf(html, {
          format: ((template as any).page_size === 'Letter' ? 'Letter' : 'A4') as 'A4' | 'Letter',
          marginTop: mmToInch(margins.top),
          marginBottom: mmToInch(margins.bottom),
          marginLeft: mmToInch(margins.left),
          marginRight: mmToInch(margins.right),
        })

        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error('Gotenberg a retourné un PDF vide')
        }

        logger.info('[PDF API] PDF généré via Gotenberg', {
          template: template.name || 'N/A',
          duration: `${Date.now() - gotenbergStart}ms`,
          size: `${Math.round(pdfBuffer.length / 1024)}KB`,
        })

        return new NextResponse(pdfBuffer as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${template.name || 'document'}.pdf"`,
            'X-PDF-Engine': 'gotenberg',
          },
        })
      } catch (gotenbergError) {
        logger.warn('[PDF API] Gotenberg échoué, bascule vers Puppeteer', {
          error: gotenbergError instanceof Error ? gotenbergError.message : String(gotenbergError),
        })
        // Fallback Puppeteer ci-dessous
      }
    }

    // --- Puppeteer (fallback) ---
    const puppeteerStartTime = Date.now()
    try {
      page = await createPage()
      logger.debug('[PDF API] Page Puppeteer obtenue', { duration: `${Date.now() - puppeteerStartTime}ms` })

      await page.setContent(html, {
        waitUntil: 'networkidle0',
      })

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
        logger.error('PDF généré est vide')
        return NextResponse.json({ error: 'PDF généré est vide' }, { status: 500 })
      }

      logger.info('[PDF API] PDF généré via Puppeteer (fallback)', {
        template: template.name || 'N/A',
        duration: `${Date.now() - startTime}ms`,
        size: `${Math.round(pdf.length / 1024)}KB`,
      })

      return new NextResponse(pdf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${template.name || 'document'}.pdf"`,
          'X-PDF-Engine': 'puppeteer',
        },
      })
    } catch (error) {
      logger.error('[PDF API] Erreur Puppeteer:', error)
      const err = error instanceof Error ? error : new Error(String(error))
      const errorMessage = err.message
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout')
      const isExecutable = errorMessage.includes('executable') || errorMessage.includes('Chrome') || errorMessage.includes('input directory')
      const stack = err.stack ? err.stack.split('\n').slice(0, 8).join('\n') : undefined

      return NextResponse.json(
        {
          error: 'Impossible de générer le PDF',
          details: errorMessage,
          stack: process.env.NODE_ENV === 'development' ? stack : undefined,
          type: isTimeout ? 'timeout' : isExecutable ? 'executable' : 'unknown',
          hint: isExecutable
            ? 'Sur Vercel: vérifier @sparticuz/chromium-min et mémoire de la fonction (1024 MB min).'
            : isTimeout
            ? 'Le lancement de Chrome a pris trop de temps (augmenter maxDuration ou mémoire).'
            : 'Vérifiez les logs serveur pour plus de détails.',
        },
        { status: 500 }
      )
    }
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
    // S'assurer que la page est fermée en cas d'erreur
    if (page) {
      try {
        await page.close()
      } catch {
        // Ignorer les erreurs de fermeture
      }
    }
  }
}

