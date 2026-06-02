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

    // Prefixes Supabase supportés : public, signed, authenticated
    const prefixes = [
      `${base}/storage/v1/object/public/documents/`,
      `${base}/storage/v1/object/sign/documents/`,
      `${base}/storage/v1/object/authenticated/documents/`,
    ]

    for (const prefix of prefixes) {
      if (fileUrl.startsWith(prefix)) {
        // Supprimer les query params (tokens signés, etc.)
        const raw = fileUrl.slice(prefix.length).split('?')[0].split('#')[0]
        return raw && !raw.includes('..') ? raw : null
      }
    }

    // Fallback : si c'est une URL Supabase avec un format légèrement différent
    // (ex: storage.url != supabaseUrl), tenter l'extraction via URL parsing
    try {
      const parsed = new URL(fileUrl)
      const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/documents\/(.+)/)
      if (match?.[1]) {
        const path = match[1].split('?')[0]
        return path && !path.includes('..') ? path : null
      }
    } catch {
      // URL invalide
    }

    return null
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
