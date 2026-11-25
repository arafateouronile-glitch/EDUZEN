/**
 * Passage des organismes existants au certificat de réalisation officiel :
 * un modèle n'est remplacé que s'il n'a jamais été personnalisé.
 */

import { createHash } from 'crypto'

/** Empreintes (sha256 du HTML normalisé) des anciens corps par défaut du certificat, tirées de l'historique git */
export const PREVIOUS_DEFAULT_BODY_HASHES = new Set([
  '1fe4afe663cae206cc50b4d6192cf7ecf25023339eb10df926bfbbe56e0c62ae',
  '7e6a02c6e6f2f99d61481f706ae91559876fef474c207f232c44cbbe24f00c7a',
  'd12aa41caee80841376d6e6731f09b6facf4ee9616e616368f8f356785ce7ff9',
  'ef732a202c1527200a8b9a808e08b578ecf8b6e02785a20438038f496dec2555',
  // Modèle officiel, première mise en page (sur 2 pages)
  'd279b41f3f8fa545c7b63abc25894bc3dd5670a5c4117e1c0b5aecceeaf27977',
])

export function bodyHash(html: string): string {
  return createHash('sha256').update(html.replace(/\s+/g, ' ').trim()).digest('hex')
}

export interface CertificatTemplateRow {
  created_at: string | null
  updated_at: string | null
  content: { html?: string | null } | null
}

/**
 * Non personnalisé : corps identique à un ancien modèle par défaut, ou jamais
 * réenregistré depuis sa création (moins d'une minute d'écart).
 */
export function isUncustomizedCertificat(row: CertificatTemplateRow): boolean {
  const html = row.content?.html
  if (html && PREVIOUS_DEFAULT_BODY_HASHES.has(bodyHash(html))) return true
  if (row.created_at && row.updated_at) {
    const delta = new Date(row.updated_at).getTime() - new Date(row.created_at).getTime()
    if (Math.abs(delta) < 60_000) return true
  }
  return false
}
