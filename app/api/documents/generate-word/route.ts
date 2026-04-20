import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { createClient } from '@/lib/supabase/server'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { generateWordBodySchema } from '@/lib/validations/schemas'

// Configuration de la route API
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 secondes maximum

export async function POST(request: NextRequest) {
  logger.info('[Word API] Début de la requête')
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    const userOrgId = userRow?.organization_id
    if (!userOrgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
      logger.info('[Word API] Body parsé avec succès')
    } catch (error) {
      logger.error('[Word API] Erreur lors du parsing du body:', error)
      return NextResponse.json(
        { error: 'Body JSON invalide', details: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    const parsed = generateWordBodySchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] || parsed.error.message
      return NextResponse.json(
        { error: 'Données invalides', details: msg },
        { status: 400 }
      )
    }
    const { template, variables, documentId } = parsed.data
    const organizationId = userOrgId

    logger.info('[Word API] Template', { templateName: template?.name || 'N/A', type: template?.type || 'N/A' })
    logger.info('[Word API] Variables count', { count: Object.keys(variables).length })

    // Générer le HTML
    logger.info('[Word API] Génération du HTML...')
    let htmlResult
    let html: string
    try {
      const { generateHTML } = await import('@/lib/utils/document-generation/html-generator')
      logger.info('[Word API] Appel de generateHTML...')
      htmlResult = await generateHTML(template as unknown as DocumentTemplate, variables, documentId, organizationId)
      logger.info('[Word API] HTML généré', { length: htmlResult.html?.length || 0 })
      html = htmlResult.html
    } catch (error) {
      logger.error('[Word API] Erreur lors de la génération du HTML:', error)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la génération du HTML', 
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }
    
    if (!html || html.trim().length === 0) {
      logger.error('[Word API] HTML généré est vide')
      return NextResponse.json(
        { error: 'HTML généré est vide' },
        { status: 500 }
      )
    }

    // Générer le document Word avec header et footer
    logger.info('[Word API] Génération du document Word...')
    let wordBuffer: Buffer
    try {
      const { generateWordFromTemplate } = await import('@/lib/utils/word-generator')
      // Utiliser generateWordFromTemplate pour avoir header et footer (même traitement que PDF)
      const wordBlob = await generateWordFromTemplate(template as unknown as DocumentTemplate, variables, documentId, organizationId)
      
      // Convertir Blob en Buffer pour Node.js
      const arrayBuffer = await wordBlob.arrayBuffer()
      wordBuffer = Buffer.from(arrayBuffer)
    } catch (error) {
      logger.error('[Word API] Erreur lors de la génération du Word:', error)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la génération du document Word', 
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }
    
    if (!wordBuffer || wordBuffer.length === 0) {
      logger.error('[Word API] Document Word généré est vide')
      return NextResponse.json(
        { error: 'Document Word généré est vide' },
        { status: 500 }
      )
    }

    // Retourner le document Word
    return new NextResponse(new Uint8Array(wordBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${(template.name || 'document').replace(/[^\w.\-]/g, '_')}.docx"`,
      },
    })
  } catch (error) {
    logger.error('[Word API] Erreur globale lors de la génération du Word:', error)
    if (error instanceof Error) {
      logger.error('[Word API] Stack:', error.stack)
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
