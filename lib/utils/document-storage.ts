import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const BUCKET = 'documents'
const SIGNED_URL_EXPIRY = 315_360_000 // 10 ans en secondes

const MIME_TYPES: Record<string, string> = {
  PDF:  'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

/**
 * Upload un document généré dans Supabase Storage (bucket 'documents')
 * et retourne une URL signée valable 10 ans.
 *
 * Retourne null pour les formats non stockables (HTML).
 * Lance une erreur si l'upload échoue.
 */
export async function uploadGeneratedDocument(
  buffer: Buffer,
  fileName: string,
  orgId: string,
  format: string
): Promise<string | null> {
  const mimeType = MIME_TYPES[format.toUpperCase()]
  if (!mimeType) return null

  const admin = createAdminClient()
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const path = `generated/${orgId}/${yearMonth}/${fileName}`

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true })

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY)

  if (!data?.signedUrl) {
    throw new Error('Failed to create signed URL after upload')
  }

  logger.info('[document-storage] Document uploadé', { path, orgId, format })
  return data.signedUrl
}
