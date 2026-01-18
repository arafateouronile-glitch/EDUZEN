import { NextRequest, NextResponse } from 'next/server'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'

// Configuration de la route API
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 secondes maximum

export async function POST(request: NextRequest) {
  console.log('[Word API] Début de la requête')
  try {
    let body
    try {
      body = await request.json()
      console.log('[Word API] Body parsé avec succès')
    } catch (error) {
      console.error('[Word API] Erreur lors du parsing du body:', error)
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

    console.log('[Word API] Template:', template?.name || 'N/A', 'Type:', template?.type || 'N/A')
    console.log('[Word API] Variables count:', variables ? Object.keys(variables).length : 0)

    if (!template) {
      console.error('[Word API] Template manquant')
      return NextResponse.json(
        { error: 'Template manquant' },
        { status: 400 }
      )
    }

    if (!variables) {
      console.error('[Word API] Variables manquantes')
      return NextResponse.json(
        { error: 'Variables manquantes' },
        { status: 400 }
      )
    }

    // Générer le HTML
    console.log('[Word API] Génération du HTML...')
    let htmlResult
    let html: string
    try {
      const { generateHTML } = await import('@/lib/utils/document-generation/html-generator')
      console.log('[Word API] Appel de generateHTML...')
      htmlResult = await generateHTML(template, variables, documentId, organizationId)
      console.log('[Word API] HTML généré, longueur:', htmlResult.html?.length || 0)
      html = htmlResult.html
    } catch (error) {
      console.error('[Word API] Erreur lors de la génération du HTML:', error)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la génération du HTML', 
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }
    
    if (!html || html.trim().length === 0) {
      console.error('[Word API] HTML généré est vide')
      return NextResponse.json(
        { error: 'HTML généré est vide' },
        { status: 500 }
      )
    }

    // Générer le document Word avec header et footer
    console.log('[Word API] Génération du document Word...')
    let wordBuffer: Buffer
    try {
      const { generateWordFromTemplate } = await import('@/lib/utils/word-generator')
      // Utiliser generateWordFromTemplate pour avoir header et footer (même traitement que PDF)
      const wordBlob = await generateWordFromTemplate(template, variables, documentId, organizationId)
      
      // Convertir Blob en Buffer pour Node.js
      const arrayBuffer = await wordBlob.arrayBuffer()
      wordBuffer = Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('[Word API] Erreur lors de la génération du Word:', error)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la génération du document Word', 
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }
    
    if (!wordBuffer || wordBuffer.length === 0) {
      console.error('[Word API] Document Word généré est vide')
      return NextResponse.json(
        { error: 'Document Word généré est vide' },
        { status: 500 }
      )
    }

    // Retourner le document Word
    return new NextResponse(wordBuffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${template.name || 'document'}.docx"`,
      },
    })
  } catch (error) {
    console.error('[Word API] Erreur globale lors de la génération du Word:', error)
    if (error instanceof Error) {
      console.error('[Word API] Stack:', error.stack)
    }
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du document Word', 
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}
