/**
 * API pour uploader un template DOCX et l'associer à un type de document
 * 
 * POST /api/documents/upload-docx-template
 * Body: FormData avec:
 *   - file: Le fichier DOCX
 *   - type: Le type de document (facture, devis, convention, etc.)
 *   - organizationId: L'ID de l'organisation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    
    // Parser le FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null
    const organizationId = formData.get('organizationId') as string | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      )
    }
    
    if (!type) {
      return NextResponse.json(
        { error: 'Type de document manquant' },
        { status: 400 }
      )
    }
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID organisation manquant' },
        { status: 400 }
      )
    }
    
    // Vérifier que le fichier est bien un DOCX
    if (!file.name.endsWith('.docx') && !file.type.includes('openxmlformats-officedocument.wordprocessingml')) {
      return NextResponse.json(
        { error: 'Le fichier doit être au format DOCX' },
        { status: 400 }
      )
    }
    
    // Convertir le fichier en buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const fileName = `${organizationId}/${type}/template_${timestamp}.docx`
    
    // Uploader vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('docx-templates')
      .upload(fileName, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })
    
    if (uploadError) {
      console.error('Erreur upload:', uploadError)
      return NextResponse.json(
        { error: `Erreur lors de l'upload: ${uploadError.message}` },
        { status: 500 }
      )
    }
    
    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('docx-templates')
      .getPublicUrl(fileName)
    
    const docxTemplateUrl = urlData.publicUrl
    
    // Mettre à jour le template de document avec l'URL du DOCX
    const { data: templateData, error: templateError } = await supabase
      .from('document_templates')
      .update({ docx_template_url: docxTemplateUrl })
      .eq('type', type as any)
      .eq('organization_id', organizationId)
      .select()
      .single()
    
    if (templateError) {
      // Si le template n'existe pas, on ne renvoie pas d'erreur
      // L'URL est quand même disponible
      console.log('Template non trouvé ou erreur de mise à jour:', templateError.message)
    }
    
    return NextResponse.json({
      success: true,
      url: docxTemplateUrl,
      fileName,
      templateUpdated: !!templateData,
    })
    
  } catch (error) {
    console.error('Erreur API upload-docx-template:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
