import { NextRequest, NextResponse } from 'next/server'
import { generateWordDocument } from '@/lib/services/auto-docx-generator.service'
import type { DocumentVariables, DocumentTemplate } from '@/lib/types/document-templates'
import { createClient } from '@/lib/supabase/server'

// Configuration de la route API
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 secondes maximum

/**
 * API Route pour générer un document Word automatiquement
 * 
 * Cette route génère un document Word directement depuis le template HTML,
 * SANS avoir besoin d'uploader un fichier .docx manuellement.
 * 
 * Si un template DOCX natif existe (docx_template_url), il sera utilisé.
 * Sinon, le système convertit automatiquement le HTML en DOCX.
 * 
 * POST /api/documents/generate-docx
 * Body: {
 *   templateId: string,          // ID du template dans la base de données
 *   variables: DocumentVariables,
 *   filename?: string            // Nom du fichier de sortie
 * }
 */
export async function POST(request: NextRequest) {
  console.log('[Generate DOCX] 🚀 Début de la requête - Génération automatique')
  
  try {
    const body = await request.json()
    const { templateId, variables, filename = 'document.docx' } = body as {
      templateId?: string
      variables: DocumentVariables
      filename?: string
    }

    if (!variables) {
      return NextResponse.json(
        { error: 'Variables manquantes' },
        { status: 400 }
      )
    }

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId requis' },
        { status: 400 }
      )
    }

    // Récupérer le template depuis la base de données
    console.log('[Generate DOCX] 📋 Récupération du template:', templateId)
    const supabase = await createClient()
    
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()
    
    if (templateError || !template) {
      console.error('[Generate DOCX] ❌ Template non trouvé:', templateError)
      return NextResponse.json(
        { error: `Template non trouvé: ${templateId}` },
        { status: 404 }
      )
    }

    console.log('[Generate DOCX] ✅ Template trouvé:', template.name)
    console.log('[Generate DOCX] 📝 Type:', template.type)
    console.log('[Generate DOCX] 🔗 DOCX natif URL:', template.docx_template_url || 'Non défini (génération auto)')

    // Générer le document Word
    // La fonction generateWordDocument choisit automatiquement :
    // - Si docx_template_url existe : utilise docxtemplater
    // - Sinon : génère automatiquement depuis le HTML
    const outputBuffer = await generateWordDocument(
      template as unknown as DocumentTemplate,
      variables
    )

    console.log('[Generate DOCX] ✅ Document généré avec succès, taille:', outputBuffer.length, 'bytes')

    // Retourner le document
    return new NextResponse(outputBuffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': outputBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[Generate DOCX] ❌ Erreur globale:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du document Word',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
