import { NextRequest, NextResponse } from 'next/server'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { logger, sanitizeError } from '@/lib/utils/logger'

// Configuration de la route API
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 secondes maximum

export async function POST(request: NextRequest) {
  logger.info('[PDF API] Début de la requête')
  try {
    let body
    try {
      body = await request.json()
      logger.info('[PDF API] Body parsé avec succès')
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

    logger.info('[PDF API] Template', { templateName: template?.name || 'N/A', type: template?.type || 'N/A' })
    logger.info('[PDF API] Variables count', { count: variables ? Object.keys(variables).length : 0 })

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

    // Générer le HTML avec Paged.js
    logger.info('[PDF API] Génération du HTML...')
    logger.info('[PDF API] Template header type', { headerType: typeof template.header })
    logger.info('[PDF API] Template header content (premiers 200 chars)', {
      headerPreview: template.header 
        ? (typeof template.header === 'string' 
          ? (template.header as string).substring(0, 200) 
          : JSON.stringify(template.header as any).substring(0, 200))
        : 'null/undefined'
    })
    let htmlResult
    let html: string
    try {
      // Import dynamique pour éviter les problèmes de compilation
      const { generateHTML } = await import('@/lib/utils/document-generation/html-generator')
      logger.info('[PDF API] Appel de generateHTML...')
      htmlResult = await generateHTML(template, variables, documentId, organizationId)
      logger.info('[PDF API] HTML généré', { length: htmlResult.html?.length || 0 })
      html = htmlResult.html
    } catch (error) {
      logger.error('[PDF API] Erreur lors de la génération du HTML:', error)
      if (error instanceof Error) {
        logger.error('[PDF API] Message:', error.message)
        logger.error('[PDF API] Stack:', error.stack)
        logger.error('[PDF API] Name:', error.name)
        // Afficher aussi les 500 premiers caractères du template pour déboguer
        if (template?.header) {
          const headerStr = typeof template.header === 'string' ? template.header : JSON.stringify(template.header)
          logger.error('[PDF API] Header template (premiers 500 chars):', headerStr.substring(0, 500))
        }
      } else {
        logger.error('[PDF API] Error type:', typeof error)
        logger.error('[PDF API] Error value:', error)
      }
      // Extraire plus de détails pour le débogage
      const errorDetails: any = {
        error: 'Erreur lors de la génération du HTML',
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
      }
      
      // Ajouter la stack trace si disponible
      if (error instanceof Error && error.stack) {
        errorDetails.stack = error.stack.split('\n').slice(0, 10).join('\n') // Limiter à 10 lignes
      }
      
      // Ajouter des infos sur le template
      errorDetails.templateInfo = {
        id: template?.id,
        type: template?.type,
        name: template?.name,
        hasHeader: !!template?.header,
        headerType: typeof template?.header,
        headerPreview: template?.header 
          ? (typeof template.header === 'string' 
            ? (template.header as string).substring(0, 200) 
            : JSON.stringify(template.header as any).substring(0, 200))
          : null,
      }
      
      logger.error('[PDF API] Détails complets de l\'erreur', undefined, { errorDetails: JSON.stringify(errorDetails, null, 2) })
      
      return NextResponse.json(errorDetails, { status: 500 })
    }
    
    if (!html || html.trim().length === 0) {
      logger.error('[PDF API] HTML généré est vide')
      return NextResponse.json(
        { error: 'HTML généré est vide' },
        { status: 500 }
      )
    }

    // Lancer Puppeteer
    logger.info('[PDF API] Lancement de Puppeteer...')
    let browser
    try {
      // Import dynamique de Puppeteer
      const puppeteer = (await import('puppeteer')).default
      
      // Configuration Puppeteer avec fallback pour différents environnements
      const launchOptions: any = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security', // Nécessaire pour certains contenus
          '--disable-features=IsolateOrigins,site-per-process',
        ],
        timeout: 30000, // 30 secondes de timeout
        protocolTimeout: 180000, // 3 minutes pour les opérations longues (Paged.js)
      }

      // En développement local, essayer d'utiliser le Chrome système si disponible
      if (process.env.NODE_ENV === 'development') {
        const possiblePaths = [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
          '/usr/bin/google-chrome', // Linux
          '/usr/bin/chromium-browser', // Linux
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
        ]
        for (const path of possiblePaths) {
          try {
            const fs = await import('fs')
            if (fs.existsSync(path)) {
              launchOptions.executablePath = path
              logger.info('[PDF API] Utilisation de Chrome système', { path })
              break
            }
          } catch {
            // Ignorer les erreurs de vérification
          }
        }
      }

      browser = await puppeteer.launch(launchOptions)
      logger.info('[PDF API] Puppeteer lancé avec succès')
    } catch (error) {
      logger.error('[PDF API] Erreur lors du lancement de Puppeteer:', error)
      if (error instanceof Error) {
        logger.error('[PDF API] Message:', error.message)
        logger.error('[PDF API] Stack:', error.stack)
      }
      
      // Message d'erreur plus détaillé
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout')
      const isExecutable = errorMessage.includes('executable') || errorMessage.includes('Chrome')
      
      return NextResponse.json(
        { 
          error: 'Impossible de lancer Puppeteer', 
          details: errorMessage,
          type: isTimeout ? 'timeout' : isExecutable ? 'executable' : 'unknown',
          hint: isExecutable 
            ? 'Chrome/Chromium n\'est pas trouvé. Installez-le ou configurez PUPPETEER_EXECUTABLE_PATH.'
            : isTimeout
            ? 'Le lancement de Chrome a pris trop de temps. Vérifiez les ressources système.'
            : 'Vérifiez les logs serveur pour plus de détails.',
          environment: {
            nodeEnv: process.env.NODE_ENV,
            platform: process.platform,
          }
        },
        { status: 500 }
      )
    }

    const page = await browser.newPage()
    
    // Augmenter le timeout de la page pour les opérations longues
    page.setDefaultTimeout(180000) // 3 minutes
    page.setDefaultNavigationTimeout(180000)

    // Charger le HTML - utiliser 'load' au lieu de 'networkidle0' (beaucoup plus rapide)
    // 'networkidle0' attend que le réseau soit inactif pendant 500ms, ce qui est très lent
    await page.setContent(html, {
      waitUntil: 'load', // Plus rapide : attend juste que le DOM et les ressources soient chargés
    })

    // Attendre que Paged.js ait fini le calcul du rendu (optimisé pour la vitesse)
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
          
          // Vérifier si Paged.js est déjà chargé et prêt
          if ((window as any).PagedPolyfill) {
            // Si déjà chargé, vérifier si l'événement est déjà passé
            if ((window as any).pagedjsReady) {
              doResolve()
              return
            }
            // Sinon attendre l'événement
            window.addEventListener('pagedjsReady', doResolve, { once: true })
            // Timeout réduit à 3 secondes (au lieu de 5)
            setTimeout(doResolve, 3000)
          } else {
            // Attendre que le script se charge avec vérification plus fréquente
            let checkCount = 0
            const maxChecks = 50 // 50 * 50ms = 2.5 secondes max
            const checkPaged = setInterval(() => {
              checkCount++
              if ((window as any).PagedPolyfill) {
                clearInterval(checkPaged)
                if ((window as any).pagedjsReady) {
                  doResolve()
                } else {
                  window.addEventListener('pagedjsReady', doResolve, { once: true })
                  setTimeout(doResolve, 2000) // 2 secondes pour le rendu
                }
              } else if (checkCount >= maxChecks) {
                clearInterval(checkPaged)
                logger.warn('Paged.js n\'a pas pu se charger dans les temps, continuer quand même')
                doResolve()
              }
            }, 50) // Vérification toutes les 50ms (au lieu de 100ms)
          }
        })
      })
      
      // Attendre un peu pour que le rendu soit stabilisé (réduit à 500ms au lieu de 2000ms)
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      logger.warn('Erreur lors de l\'attente de Paged.js, continuer quand même', { error: sanitizeError(error) })
    }

    // Générer le PDF
    let pdf
    try {
      pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
      })
    } catch (error) {
      logger.error('Erreur lors de la génération du PDF avec Puppeteer:', error)
      await browser.close()
      throw error
    }

    await browser.close()
    
    if (!pdf || pdf.length === 0) {
      logger.error('PDF généré est vide')
      return NextResponse.json(
        { error: 'PDF généré est vide' },
        { status: 500 }
      )
    }

    // Retourner le PDF
    return new NextResponse(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${template.name || 'document'}.pdf"`,
      },
    })
  } catch (error) {
    logger.error('[PDF API] Erreur globale lors de la génération du PDF:', error)
    if (error instanceof Error) {
      logger.error('[PDF API] Stack:', error.stack)
    }
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du PDF', 
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}

