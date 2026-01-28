import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger, sanitizeError } from '@/lib/utils/logger'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const { id: documentId } = await params
    
    // Récupérer le document pour vérifier les permissions
    const { data: document, error: docError } = await supabase
      .from('teacher_documents')
      .select('teacher_id, file_url')
      .eq('id', documentId)
      .single()
    
    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document non trouvé' },
        { status: 404 }
      )
    }
    
    // Vérifier que l'utilisateur est le propriétaire du document
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (document.teacher_id !== user.id && userData?.role !== 'admin' && userData?.role !== 'secretary') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }
    
    // Supprimer le fichier du storage
    if (document.file_url) {
      await supabase.storage
        .from('teacher-documents')
        .remove([document.file_url])
    }
    
    // Supprimer l'enregistrement de la base de données
    const { error: deleteError } = await supabase
      .from('teacher_documents')
      .delete()
      .eq('id', documentId)
    
    if (deleteError) {
      logger.error('Erreur suppression document', deleteError)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Erreur suppression document enseignant', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
