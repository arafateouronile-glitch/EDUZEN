import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createStorageClient } from '@supabase/supabase-js'
import { withRateLimit, uploadRateLimiter } from '@/app/api/_middleware/rate-limit'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * API Route pour uploader une ressource vers Supabase Storage
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, uploadRateLimiter, async (req) => {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const organizationId = formData.get('organization_id') as string
    const categoryId = formData.get('category_id') as string | null
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const resourceType = formData.get('resource_type') as string
    const tags = formData.get('tags') as string | null

    if (!file || !organizationId || !title || !resourceType) {
      return NextResponse.json(
        { error: 'Fichier, organisation, titre et type requis' },
        { status: 400 }
      )
    }

    // Créer un client Supabase pour Storage
    const storageClient = createStorageClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const filePath = `resources/${organizationId}/${fileName}`

    // Uploader le fichier
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('resources')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      logger.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload du fichier', details: uploadError.message },
        { status: 500 }
      )
    }

    // Obtenir l'URL publique
    const {
      data: { publicUrl },
    } = storageClient.storage.from('resources').getPublicUrl(filePath)

    // Générer un slug à partir du titre
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Créer l'enregistrement de la ressource
    const { data: resource, error: resourceError } = await (supabase as any)
      .from('resources')
      .insert({
        organization_id: organizationId,
        category_id: categoryId || null,
        title,
        slug,
        description: description || null,
        resource_type: resourceType,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        author_id: user.id,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })
      .select()
      .single()

    if (resourceError) {
      logger.error('Resource creation error:', resourceError)
      // Supprimer le fichier uploadé en cas d'erreur
      await storageClient.storage.from('resources').remove([filePath])
      return NextResponse.json(
        { error: 'Erreur lors de la création de la ressource', details: resourceError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      resource,
      fileUrl: publicUrl,
    })
  } catch (error: unknown) {
    logger.error('Error uploading resource:', error)
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erreur lors de l\'upload de la ressource'
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
  })
}

