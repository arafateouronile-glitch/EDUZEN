import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger, sanitizeError } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }
    
    // Vérifier que l'utilisateur est un enseignant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, organization_id')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }
    
    if (userData.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Accès réservé aux enseignants' },
        { status: 403 }
      )
    }
    
    // Récupérer le FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const document_type = formData.get('document_type') as string
    
    if (!file || !title) {
      return NextResponse.json(
        { error: 'Fichier et titre requis' },
        { status: 400 }
      )
    }
    
    // Vérifier la taille du fichier (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10MB)' },
        { status: 400 }
      )
    }
    
    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    // Uploader le fichier dans Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('teacher-documents')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })
    
    if (uploadError) {
      logger.error('Erreur upload fichier', uploadError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload du fichier' },
        { status: 500 }
      )
    }
    
    // Récupérer l'URL publique du fichier
    const { data: { publicUrl } } = supabase.storage
      .from('teacher-documents')
      .getPublicUrl(fileName)
    
    // Créer l'enregistrement dans la base de données
    const insertData: any = {
      organization_id: userData.organization_id,
      teacher_id: user.id,
      title,
      description: description || null,
      document_type: document_type as any,
      file_url: fileName,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    }
    const { data: document, error: insertError } = await supabase
      .from('teacher_documents')
      .insert(insertData)
      .select()
      .single()
    
    if (insertError) {
      // Si l'insertion échoue, supprimer le fichier uploadé
      await supabase.storage
        .from('teacher-documents')
        .remove([fileName])
      
      logger.error('Erreur création document', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du document' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error: any) {
    logger.error('Erreur upload document enseignant', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
