/**
 * API pour initialiser les templates DOCX natifs pour une organisation
 * 
 * POST /api/documents/init-docx-templates
 * Body: { organizationId: string }
 * 
 * Cette API copie les templates DOCX par défaut (public/docx-templates/)
 * vers le storage Supabase et les associe aux types de documents.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'
import { logger, sanitizeError } from '@/lib/utils/logger'

const DOCUMENT_TYPES = ['facture', 'devis', 'convention'] as const

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { organizationId } = body
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID organisation manquant' },
        { status: 400 }
      )
    }
    
    const results: Array<{
      type: string
      success: boolean
      url?: string
      error?: string
    }> = []
    
    // Pour chaque type de document
    for (const type of DOCUMENT_TYPES) {
      try {
        // Chemin du template source
        const templatePath = path.join(process.cwd(), 'public', 'docx-templates', `template_${type}.docx`)
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(templatePath)) {
          results.push({
            type,
            success: false,
            error: `Template non trouvé: ${templatePath}`,
          })
          continue
        }
        
        // Lire le fichier
        const buffer = fs.readFileSync(templatePath)
        
        // Générer un nom de fichier unique
        const timestamp = Date.now()
        const fileName = `${organizationId}/${type}/template_${timestamp}.docx`
        
        // Uploader vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('docx-templates')
          .upload(fileName, buffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: true,
          })
        
        if (uploadError) {
          results.push({
            type,
            success: false,
            error: `Erreur upload: ${uploadError.message}`,
          })
          continue
        }
        
        // Récupérer l'URL publique
        const { data: urlData } = supabase.storage
          .from('docx-templates')
          .getPublicUrl(fileName)
        
        const docxTemplateUrl = urlData.publicUrl
        
        // Mettre à jour le template de document
        const { error: updateError } = await supabase
          .from('document_templates')
          .update({ docx_template_url: docxTemplateUrl })
          .eq('type', type)
          .eq('organization_id', organizationId)
        
        if (updateError) {
          logger.info(`Template ${type} non trouvé dans la base, URL stockée quand même`)
        }
        
        results.push({
          type,
          success: true,
          url: docxTemplateUrl,
        })
        
      } catch (error) {
        results.push({
          type,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    return NextResponse.json({
      success: failCount === 0,
      message: `${successCount} templates initialisés, ${failCount} erreurs`,
      results,
    })
    
  } catch (error) {
    logger.error('Erreur API init-docx-templates:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
