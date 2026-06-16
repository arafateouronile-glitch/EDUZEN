import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { generateWordDocument } from '@/lib/services/auto-docx-generator.service'
import type { DocumentVariables, DocumentTemplate } from '@/lib/types/document-templates'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { generateDocxBodySchema } from '@/lib/validations/schemas'

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
  logger.info('[Generate DOCX] 🚀 Début de la requête - Génération automatique')
  
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = generateDocxBodySchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] || parsed.error.message
      return NextResponse.json(
        { error: 'Données invalides', details: msg },
        { status: 400 }
      )
    }
    const { templateId, variables, filename: rawFilename } = parsed.data
    const filename = rawFilename.replace(/[^\w.\-]/g, '_')

    logger.info('[Generate DOCX] 📋 Récupération du template', { templateId })
    const userOrgId = await getUserOrgId(supabase, user.id)
    if (!userOrgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', userOrgId)
      .single()
    
    if (templateError || !template) {
      logger.error('[Generate DOCX] ❌ Template non trouvé', sanitizeError(templateError))
      return NextResponse.json(
        { error: `Template non trouvé: ${templateId}` },
        { status: 404 }
      )
    }

    logger.info('[Generate DOCX] ✅ Template trouvé', { templateName: template.name })
    logger.info('[Generate DOCX] 📝 Type', { type: template.type })
    logger.info('[Generate DOCX] 🔗 DOCX natif URL', { docxUrl: template.docx_template_url || 'Non défini (génération auto)' })

    // Générer le document Word
    // La fonction generateWordDocument choisit automatiquement :
    // - Si docx_template_url existe : utilise docxtemplater
    // - Sinon : génère automatiquement depuis le HTML
    const outputBuffer = await generateWordDocument(
      template as unknown as DocumentTemplate,
      variables
    )

    logger.info('[Generate DOCX] ✅ Document généré avec succès', { size: outputBuffer.length, unit: 'bytes' })

    // Retourner le document
    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': outputBuffer.length.toString(),
      },
    })
  } catch (error) {
    logger.error('[Generate DOCX] ❌ Erreur globale:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du document Word',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
