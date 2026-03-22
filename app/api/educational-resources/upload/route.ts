import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { logger, sanitizeError } from '@/lib/utils/logger'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  'mp4', 'webm', 'mp3', 'wav',
  'zip',
])

const ALLOWED_THUMBNAIL_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

/**
 * Upload de fichiers pour les ressources pédagogiques (bucket educational-resources).
 * Utilise la clé service_role pour contourner les problèmes de bucket/RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const thumbnail = formData.get('thumbnail') as File | null
    const organizationId = formData.get('organization_id') as string | null

    if (!organizationId) {
      return NextResponse.json({ error: 'organization_id requis' }, { status: 400 })
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', authUser.id)
      .single()

    if (!userRow?.organization_id || userRow.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Non autorisé pour cette organisation' }, { status: 403 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY manquant')
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    )

    let fileUrl: string | null = null
    let thumbnailUrl: string | null = null

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Fichier trop volumineux (max 50 Mo)' }, { status: 400 })
      }
      const fileExt = (file.name.split('.').pop() || '').toLowerCase()
      if (!ALLOWED_EXTENSIONS.has(fileExt)) {
        return NextResponse.json({ error: `Extension non autorisée: .${fileExt}` }, { status: 400 })
      }
      const fileName = `${organizationId}/resources/${Date.now()}.${fileExt}`
      const { error: uploadError } = await admin.storage
        .from('educational-resources')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        logger.error('educational-resources upload error', sanitizeError(uploadError))
        return NextResponse.json(
          { error: 'Erreur lors de l\'upload du fichier', details: uploadError.message },
          { status: 500 }
        )
      }

      const { data: urlData } = admin.storage
        .from('educational-resources')
        .getPublicUrl(fileName)
      fileUrl = urlData.publicUrl
    }

    if (thumbnail && thumbnail.size > 0) {
      if (thumbnail.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Miniature trop volumineuse (max 5 Mo)' }, { status: 400 })
      }
      const thumbExt = (thumbnail.name.split('.').pop() || '').toLowerCase()
      if (!ALLOWED_THUMBNAIL_EXTENSIONS.has(thumbExt)) {
        return NextResponse.json({ error: `Extension miniature non autorisée: .${thumbExt}` }, { status: 400 })
      }
      const thumbName = `${organizationId}/thumbnails/${Date.now()}.${thumbExt}`
      const { error: thumbError } = await admin.storage
        .from('resource-thumbnails')
        .upload(thumbName, thumbnail, { cacheControl: '3600', upsert: false })

      if (thumbError) {
        logger.error('resource-thumbnails upload error', sanitizeError(thumbError))
        return NextResponse.json(
          { error: 'Erreur lors de l\'upload de la miniature', details: thumbError.message },
          { status: 500 }
        )
      }

      const { data: thumbUrlData } = admin.storage
        .from('resource-thumbnails')
        .getPublicUrl(thumbName)
      thumbnailUrl = thumbUrlData.publicUrl
    }

    return NextResponse.json({
      fileUrl,
      thumbnailUrl,
    })
  } catch (error) {
    logger.error('educational-resources upload', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
