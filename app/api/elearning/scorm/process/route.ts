import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { extractScormPackage } from '@/lib/utils/scorm/extract-package'
import { parseScormManifest } from '@/lib/utils/scorm/parse-manifest'

export const maxDuration = 60

// Reçoit { zip_path, lesson_id, organization_id }
// Le .zip a déjà été uploadé par le client dans le bucket scorm-packages
// Cette route lit le zip depuis Storage, l'extrait, et upload les fichiers individuels
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { zip_path, lesson_id, organization_id } = body as {
      zip_path: string
      lesson_id: string
      organization_id: string
    }

    if (!zip_path || !lesson_id || !organization_id) {
      return NextResponse.json(
        { error: 'zip_path, lesson_id et organization_id sont requis' },
        { status: 400 }
      )
    }

    const userOrgId = await getUserOrgId(supabase, authUser.id)
    if (!userOrgId || userOrgId !== organization_id) {
      return NextResponse.json({ error: 'Non autorisé pour cette organisation' }, { status: 403 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // 1. Lire le .zip depuis Storage
    const { data: zipData, error: downloadError } = await admin.storage
      .from('scorm-packages')
      .download(zip_path)

    if (downloadError || !zipData) {
      logger.error('scorm zip download error', sanitizeError(downloadError))
      return NextResponse.json({ error: 'Impossible de lire le fichier ZIP' }, { status: 500 })
    }

    // 2. Extraire le package
    const zipBuffer = await zipData.arrayBuffer()
    const { manifest, files } = await extractScormPackage(zipBuffer)

    // 3. Parser le manifest
    const manifestData = parseScormManifest(manifest)

    // 4. Uploader les fichiers extraits dans Storage
    const storagePath = `${organization_id}/${lesson_id}/`

    // Supprimer les anciens fichiers si réimport
    await admin.storage
      .from('scorm-packages')
      .remove(
        Array.from(files.keys()).map((f) => `${storagePath}${f}`)
      )

    // Upload par batch de 10 pour éviter la surcharge
    const fileEntries = Array.from(files.entries())
    const BATCH_SIZE = 10
    for (let i = 0; i < fileEntries.length; i += BATCH_SIZE) {
      const batch = fileEntries.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(([filePath, content]) =>
          admin.storage
            .from('scorm-packages')
            .upload(`${storagePath}${filePath}`, content, {
              upsert: true,
              contentType: getContentType(filePath),
            })
        )
      )
    }

    // 5. Supprimer le .zip temporaire
    await admin.storage.from('scorm-packages').remove([zip_path])

    // 6. Upsert dans scorm_packages
    const packageSizeBytes = Array.from(files.values()).reduce(
      (sum, f) => sum + f.byteLength,
      0
    )

    const { data: pkg, error: upsertError } = await admin
      .from('scorm_packages')
      .upsert(
        {
          lesson_id,
          organization_id,
          scorm_version: manifestData.version,
          title: manifestData.title,
          entry_point: manifestData.entryPoint,
          storage_path: storagePath,
          package_size_bytes: packageSizeBytes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lesson_id' }
      )
      .select()
      .single()

    if (upsertError) {
      logger.error('scorm_packages upsert error', sanitizeError(upsertError))
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde du package' }, { status: 500 })
    }

    // 7. Mettre à jour le type de leçon
    await admin
      .from('lessons')
      .update({ lesson_type: 'scorm' })
      .eq('id', lesson_id)

    return NextResponse.json({
      success: true,
      package: {
        id: pkg.id,
        scorm_version: pkg.scorm_version,
        title: pkg.title,
        entry_point: pkg.entry_point,
        storage_path: pkg.storage_path,
        file_count: files.size,
      },
    })
  } catch (error) {
    logger.error('scorm process route', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    js: 'application/javascript',
    css: 'text/css',
    xml: 'application/xml',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
  }
  return types[ext ?? ''] ?? 'application/octet-stream'
}
