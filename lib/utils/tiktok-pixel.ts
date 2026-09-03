/**
 * Helpers côté client pour le pixel TikTok (chargé dans app/layout.tsx).
 *
 * Le pixel de base (Pageview) est déjà déclenché au chargement. Ces helpers
 * servent à envoyer des événements de conversion précis (Lead, CompleteRegistration…).
 *
 * Déduplication : on passe un `event_id` déterministe (dérivé de l'e-mail),
 * identique à celui envoyé par l'Events API serveur (lib/utils/tiktok-capi.ts),
 * pour que TikTok ne compte pas 2× la même conversion.
 *
 * Fire-and-forget : aucune erreur ne remonte, on ne bloque jamais le flux principal.
 */

type TtqParams = Record<string, unknown>

interface Ttq {
  track: (event: string, params?: TtqParams, options?: { event_id?: string }) => void
  identify: (data: TtqParams) => void
}

function getTtq(): Ttq | null {
  if (typeof window === 'undefined') return null
  const ttq = (window as unknown as { ttq?: Ttq }).ttq
  return ttq && typeof ttq.track === 'function' ? ttq : null
}

/** SHA-256 hex, normalisé (trim + minuscules). Identique au hash serveur. */
export async function sha256Hex(value: string): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !window.crypto?.subtle) return null
    const data = new TextEncoder().encode(value.trim().toLowerCase())
    const digest = await window.crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

/**
 * event_id déterministe partagé avec l'Events API serveur.
 * Format : `<prefix>_<sha256(email)>` — doit rester aligné avec tiktokEventId()
 * dans lib/utils/tiktok-capi.ts.
 */
export async function tiktokEventId(prefix: 'lead' | 'cr', email: string): Promise<string | undefined> {
  const hash = await sha256Hex(email)
  return hash ? `${prefix}_${hash}` : undefined
}

/**
 * Associe l'e-mail (hashé SHA-256) au visiteur pour améliorer le matching
 * des conversions. À appeler juste avant trackTikTok().
 */
export async function identifyTikTok(email?: string | null): Promise<void> {
  const ttq = getTtq()
  if (!ttq || !email) return
  const hashed = await sha256Hex(email)
  if (!hashed) return
  try {
    ttq.identify({ email: hashed })
  } catch {
    // silencieux
  }
}

/** Envoie un événement de conversion au pixel TikTok (avec event_id pour la déduplication). */
export function trackTikTok(event: string, params?: TtqParams, eventId?: string): void {
  const ttq = getTtq()
  if (!ttq) return
  try {
    ttq.track(event, params, eventId ? { event_id: eventId } : undefined)
  } catch {
    // silencieux
  }
}
