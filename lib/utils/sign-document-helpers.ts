/**
 * Helpers pour le workflow signature document : extraction path Storage, téléchargement PDF.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export function extractStoragePathFromPublicUrl(
  fileUrl: string,
  supabaseUrl: string
): string | null {
  try {
    const base = supabaseUrl.replace(/\/$/, '')
    const prefix = `${base}/storage/v1/object/public/documents/`
    if (!fileUrl.startsWith(prefix)) return null
    const path = fileUrl.slice(prefix.length)
    return path && !path.includes('..') ? path : null
  } catch {
    return null
  }
}

/**
 * Télécharge le PDF depuis le bucket "documents" et retourne les octets.
 */
export async function downloadDocumentPdf(
  supabase: SupabaseClient,
  path: string
): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from('documents').download(path)
  if (error || !data) throw new Error(error?.message ?? 'Téléchargement PDF impossible')
  const ab = await data.arrayBuffer()
  return new Uint8Array(ab)
}
