import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger, maskId } from '@/lib/utils/logger'
import { errorHandler } from '@/lib/errors'

/**
 * API Route pour uploader un document PDF signé
 * POST /api/documents/upload-signed
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Parser le formulaire multipart
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentId = formData.get('documentId') as string | null
    const organizationId = formData.get('organizationId') as string | null
    const type = formData.get('type') as string || 'signed-document'

    if (!file) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      )
    }

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId manquant' },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId manquant' },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur a accès à l'organisation
    const { data: membership, error: membershipError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Accès non autorisé à cette organisation' },
        { status: 403 }
      )
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const filename = `${organizationId}/documents/${documentId}/signed-${timestamp}.pdf`

    // Convertir le fichier en ArrayBuffer puis Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filename, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      logger.error('Erreur lors de l\'upload du document signé', uploadError, {
        documentId: maskId(documentId),
        organizationId: maskId(organizationId),
      })
      throw uploadError
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filename)

    const publicUrl = urlData.publicUrl

    // Mettre à jour le document avec l'URL du fichier signé
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        signed_file_path: filename,
        signed_file_url: publicUrl,
        status: 'signed',
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('organization_id', organizationId)

    if (updateError) {
      logger.error('Erreur lors de la mise à jour du document', updateError, {
        documentId: maskId(documentId),
      })
      // Essayer de supprimer le fichier uploadé en cas d'erreur
      await supabase.storage.from('documents').remove([filename])
      throw updateError
    }

    logger.info('Document signé uploadé avec succès', {
      documentId: maskId(documentId),
      organizationId: maskId(organizationId),
      filename,
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filename,
      documentId,
    })
  } catch (error) {
    logger.error('Erreur lors de l\'upload du document signé', error instanceof Error ? error : new Error(String(error)), {
      path: request.nextUrl.pathname,
    })

    const appError = errorHandler.handleError(error, {
      operation: 'uploadSignedDocument',
    })

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode || 500 }
    )
  }
}
