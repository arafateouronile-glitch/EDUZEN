import { NextRequest, NextResponse } from 'next/server'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { createPage } from '@/lib/utils/puppeteer-pool'

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

    const puppeteerStartTime = Date.now()
    try {
      page = await createPage()
      logger.debug('[PDF API] Page Puppeteer obtenue', { duration: `${Date.now() - puppeteerStartTime}ms` })

    // Charger le HTML
    await page.setContent(html, {
      waitUntil: 'load',
    })

    // Attendre que Paged.js ait fini le calcul du rendu
    try {
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          let resolved = false
          const doResolve = () => {
            if (!resolved) {
              resolved = true
              resolve()
            }
          }

          if ((window as any).PagedPolyfill) {
            if ((window as any).pagedjsReady) {
              doResolve()
              return
            }
            window.addEventListener('pagedjsReady', doResolve, { once: true })
            setTimeout(doResolve, 3000)
          } else {
            let checkCount = 0
            const maxChecks = 50
            const checkPaged = setInterval(() => {
              checkCount++
              if ((window as any).PagedPolyfill) {
                clearInterval(checkPaged)
                if ((window as any).pagedjsReady) {
                  doResolve()
                } else {
                  window.addEventListener('pagedjsReady', doResolve, { once: true })
                  setTimeout(doResolve, 2000)
                }
              } else if (checkCount >= maxChecks) {
                clearInterval(checkPaged)
                doResolve()
              }
            }, 50)
          }
        })
      })

      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      logger.warn('Erreur lors de l\'attente de Paged.js, continuer quand même', { error: sanitizeError(error) })
    }

    // Générer le PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
    })

    // Fermer la page (pas le navigateur - il reste dans le pool)
    await page.close()
    page = null

    if (!pdf || pdf.length === 0) {
      logger.error('PDF généré est vide')
      return NextResponse.json(
        { error: 'PDF généré est vide' },
        { status: 500 }
      )
    }

    const totalDuration = Date.now() - startTime
    logger.info('[PDF API] PDF généré', {
      template: template.name || 'N/A',
      duration: `${totalDuration}ms`,
      size: `${Math.round(pdf.length / 1024)}KB`
    })

    // Retourner le PDF
    return new NextResponse(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${template.name || 'document'}.pdf"`,
      },
    })

    } catch (error) {
      logger.error('[PDF API] Erreur Puppeteer:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout')
      const isExecutable = errorMessage.includes('executable') || errorMessage.includes('Chrome')

      return NextResponse.json(
        {
          error: 'Impossible d\'utiliser Puppeteer',
          details: errorMessage,
          type: isTimeout ? 'timeout' : isExecutable ? 'executable' : 'unknown',
          hint: isExecutable
            ? 'Chrome/Chromium n\'est pas trouvé. Installez-le ou configurez PUPPETEER_EXECUTABLE_PATH.'
            : isTimeout
            ? 'Le lancement de Chrome a pris trop de temps.'
            : 'Vérifiez les logs serveur pour plus de détails.',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('[PDF API] Erreur globale lors de la génération du PDF:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération du PDF',
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error
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

