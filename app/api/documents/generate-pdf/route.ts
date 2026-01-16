import { NextRequest, NextResponse } from 'next/server'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'

// Configuration de la route API
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 secondes maximum

export async function POST(request: NextRequest) {
  console.log('[PDF API] Début de la requête')
  try {
    let body
    try {
      body = await request.json()
      console.log('[PDF API] Body parsé avec succès')
    } catch (error) {
      console.error('[PDF API] Erreur lors du parsing du body:', error)
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

    console.log('[PDF API] Template:', template?.name || 'N/A', 'Type:', template?.type || 'N/A')
    console.log('[PDF API] Variables count:', variables ? Object.keys(variables).length : 0)

    if (!template) {
      console.error('[PDF API] Template manquant')
      return NextResponse.json(
        { error: 'Template manquant' },
        { status: 400 }
      )
    }

    if (!variables) {
      console.error('[PDF API] Variables manquantes')
      return NextResponse.json(
        { error: 'Variables manquantes' },
        { status: 400 }
      )
    }

    // Générer le HTML avec Paged.js
    console.log('[PDF API] Génération du HTML...')
    console.log('[PDF API] Template header type:', typeof template.header)
    console.log('[PDF API] Template header content (premiers 200 chars):', 
      template.header 
        ? (typeof template.header === 'string' 
          ? template.header.substring(0, 200) 
          : JSON.stringify(template.header).substring(0, 200))
        : 'null/undefined'
    )
    let htmlResult
    let html: string
    try {
      // Import dynamique pour éviter les problèmes de compilation
      const { generateHTML } = await import('@/lib/utils/document-generation/html-generator')
      console.log('[PDF API] Appel de generateHTML...')
      htmlResult = await generateHTML(template, variables, documentId, organizationId)
      console.log('[PDF API] HTML généré, longueur:', htmlResult.html?.length || 0)
      html = htmlResult.html
    } catch (error) {
      console.error('[PDF API] Erreur lors de la génération du HTML:', error)
      if (error instanceof Error) {
        console.error('[PDF API] Message:', error.message)
        console.error('[PDF API] Stack:', error.stack)
        console.error('[PDF API] Name:', error.name)
        // Afficher aussi les 500 premiers caractères du template pour déboguer
        if (template?.header) {
          const headerStr = typeof template.header === 'string' ? template.header : JSON.stringify(template.header)
          console.error('[PDF API] Header template (premiers 500 chars):', headerStr.substring(0, 500))
        }
      } else {
        console.error('[PDF API] Error type:', typeof error)
        console.error('[PDF API] Error value:', error)
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
            ? template.header.substring(0, 200) 
            : JSON.stringify(template.header).substring(0, 200))
          : null,
      }
      
      console.error('[PDF API] Détails complets de l\'erreur:', JSON.stringify(errorDetails, null, 2))
      
      return NextResponse.json(errorDetails, { status: 500 })
    }
    
    if (!html || html.trim().length === 0) {
      console.error('[PDF API] HTML généré est vide')
      return NextResponse.json(
        { error: 'HTML généré est vide' },
        { status: 500 }
      )
    }

    // Lancer Puppeteer
    console.log('[PDF API] Lancement de Puppeteer...')
    let browser
    try {
      // Import dynamique de Puppeteer
      const puppeteer = (await import('puppeteer')).default
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
        timeout: 30000, // 30 secondes de timeout
      })
      console.log('[PDF API] Puppeteer lancé avec succès')
    } catch (error) {
      console.error('[PDF API] Erreur lors du lancement de Puppeteer:', error)
      if (error instanceof Error) {
        console.error('[PDF API] Stack:', error.stack)
      }
      return NextResponse.json(
        { 
          error: 'Impossible de lancer Puppeteer', 
          details: error instanceof Error ? error.message : String(error),
          hint: 'Vérifiez que Chrome/Chromium est installé et que Puppeteer peut y accéder'
        },
        { status: 500 }
      )
    }

    const page = await browser.newPage()

    // Charger le HTML
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    })

    // Attendre que Paged.js ait fini le calcul du rendu
    try {
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          // Vérifier si Paged.js est déjà chargé
          if ((window as any).PagedPolyfill) {
            // Attendre l'événement pagedjsReady
            const onReady = () => {
              (window as any).pagedjs_finished = true
              resolve()
            }
            window.addEventListener('pagedjsReady', onReady, { once: true })
            // Timeout de sécurité après 5 secondes
            setTimeout(() => {
              if (!(window as any).pagedjs_finished) {
                console.warn('Paged.js timeout, continuer quand même')
                resolve()
              }
            }, 5000)
          } else {
            // Attendre que le script se charge
            const checkPaged = setInterval(() => {
              if ((window as any).PagedPolyfill) {
                clearInterval(checkPaged)
                const onReady = () => {
                  (window as any).pagedjs_finished = true
                  resolve()
                }
                window.addEventListener('pagedjsReady', onReady, { once: true })
                // Timeout de sécurité
                setTimeout(() => {
                  if (!(window as any).pagedjs_finished) {
                    console.warn('Paged.js timeout, continuer quand même')
                    resolve()
                  }
                }, 5000)
              }
            }, 100)
            
            // Timeout global après 10 secondes
            setTimeout(() => {
              clearInterval(checkPaged)
              if (!(window as any).pagedjs_finished) {
                console.warn('Paged.js n\'a pas pu se charger, continuer quand même')
                resolve()
              }
            }, 10000)
          }
        })
      })
      
      // Attendre un peu plus pour que le rendu soit complètement terminé
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.warn('Erreur lors de l\'attente de Paged.js, continuer quand même:', error)
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
      console.error('Erreur lors de la génération du PDF avec Puppeteer:', error)
      await browser.close()
      throw error
    }

    await browser.close()
    
    if (!pdf || pdf.length === 0) {
      console.error('PDF généré est vide')
      return NextResponse.json(
        { error: 'PDF généré est vide' },
        { status: 500 }
      )
    }

    // Retourner le PDF
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${template.name || 'document'}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[PDF API] Erreur globale lors de la génération du PDF:', error)
    if (error instanceof Error) {
      console.error('[PDF API] Stack:', error.stack)
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

