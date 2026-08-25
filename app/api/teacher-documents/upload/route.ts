import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { getPublicErrorMessage } from '@/lib/utils/api-error-response'

const ADMIN_ROLES = ['admin', 'secretary']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const isAdmin = ADMIN_ROLES.includes(userData.role ?? '')
    const isTeacher = userData.role === 'teacher'

    if (!isAdmin && !isTeacher) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const document_type = formData.get('document_type') as string | null
    const expiry_date = formData.get('expiry_date') as string | null
    const target_teacher_user_id = formData.get('target_teacher_user_id') as string | null
    const required_document_type_id = formData.get('required_document_type_id') as string | null

    if (!file || !title) {
      return NextResponse.json({ error: 'Fichier et titre requis' }, { status: 400 })
    }

    // Déterminer le teacher_id cible
    let teacherId = user.id
    if (isAdmin && target_teacher_user_id) {
      // L'admin uploade pour un enseignant spécifique — vérifier qu'il appartient à la même org
      const { data: targetUser } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('id', target_teacher_user_id)
        .eq('organization_id', userData.organization_id!)
        .single()
      if (!targetUser) {
        return NextResponse.json({ error: 'Enseignant introuvable dans cette organisation' }, { status: 404 })
      }
      teacherId = target_teacher_user_id
    }

    // Validation type MIME (doit rester alignée avec le bucket storage 'teacher-documents'
    // et l'attribut accept du sélecteur de fichier côté client)
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ]
    const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_MIME_TYPES.includes(file.type) || !fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: 'Formats acceptés : PDF, Word, JPG, PNG' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10MB)' }, { status: 400 })
    }

    // Vérifier que le type de document requis (le cas échéant) appartient bien à l'organisation
    if (required_document_type_id) {
      const { data: requiredType } = await supabase
        .from('teacher_required_document_types' as any)
        .select('id')
        .eq('id', required_document_type_id)
        .eq('organization_id', userData.organization_id!)
        .maybeSingle()
      if (!requiredType) {
        return NextResponse.json({ error: 'Type de document requis introuvable dans cette organisation' }, { status: 404 })
      }
    }

    const fileName = `${teacherId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('teacher-documents')
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      logger.error('Erreur upload fichier', uploadError)
      return NextResponse.json({ error: 'Erreur lors de l\'upload du fichier' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('teacher-documents')
      .getPublicUrl(fileName)

    if (!publicUrl) {
      await supabase.storage.from('teacher-documents').remove([fileName])
      return NextResponse.json({ error: 'Erreur lors de la récupération de l\'URL du fichier' }, { status: 500 })
    }

    const insertData: Record<string, any> = {
      organization_id: userData.organization_id!,
      teacher_id: teacherId,
      title,
      description: description || null,
      document_type: document_type || 'other',
      file_url: fileName,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
      expiry_date: expiry_date || null,
      required_document_type_id: required_document_type_id || null,
    }

    const { data: document, error: insertError } = await supabase
      .from('teacher_documents')
      .insert(insertData as any)
      .select()
      .single()

    if (insertError) {
      await supabase.storage.from('teacher-documents').remove([fileName])
      logger.error('Erreur création document', insertError)
      return NextResponse.json({ error: 'Erreur lors de la création du document' }, { status: 500 })
    }

    return NextResponse.json({ success: true, document })
  } catch (error: unknown) {
    logger.error('Erreur upload document enseignant', error)
    return NextResponse.json({ error: getPublicErrorMessage(error) }, { status: 500 })
  }
}
