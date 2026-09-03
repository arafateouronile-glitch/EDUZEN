/**
 * TikTok Events API (côté serveur) — équivalent de la Conversions API de Meta.
 *
 * Envoie les conversions directement depuis le serveur EduZen vers TikTok,
 * en plus du pixel navigateur. Bénéfices : résiste aux bloqueurs de pub et
 * aux restrictions iOS/Safari, meilleur taux de correspondance.
 *
 * Déduplication : le pixel navigateur et l'event serveur envoient le MÊME
 * `event_id` (déterministe, dérivé de l'e-mail) → TikTok ne compte qu'une
 * seule conversion.
 *
 * Configuration (variables d'environnement) :
 *   TIKTOK_EVENTS_API_TOKEN   — token « Generate Access Token » de l'Events API (requis)
 *   TIKTOK_TEST_EVENT_CODE    — code de test (ex. TEST42944), à retirer après validation
 *   NEXT_PUBLIC_TIKTOK_PIXEL_ID — optionnel, sinon valeur par défaut ci-dessous
 *
 * Fire-and-forget : ne jette jamais d'erreur, ne bloque jamais le flux appelant.
 */

import { createHash } from 'crypto'
import { logger } from '@/lib/utils/logger'

const PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || 'DACP31RC77UES974GCP0'
const EVENTS_API_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'

/** SHA-256 hex, normalisé (trim + minuscules) comme exigé par TikTok. */
export function tiktokHash(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/**
 * event_id déterministe partagé avec le pixel navigateur.
 * Même e-mail + même événement ⇒ même id ⇒ TikTok déduplique.
 */
export function tiktokEventId(prefix: 'lead' | 'cr', email: string): string {
  return `${prefix}_${tiktokHash(email)}`
}

interface TikTokEventInput {
  eventName: 'Lead' | 'CompleteRegistration' | (string & {})
  /** e-mail en clair — il sera hashé ici. */
  email?: string | null
  /** téléphone en clair (E.164 de préférence) — il sera hashé ici. */
  phone?: string | null
  eventId: string
  clientIp?: string | null
  userAgent?: string | null
  url?: string | null
  /** clic TikTok (query param ttclid) si disponible. */
  ttclid?: string | null
  /** cookie _ttp du pixel si disponible. */
  ttp?: string | null
  /** paramètres custom (content_name…). */
  properties?: Record<string, unknown>
  /** force un code de test ; sinon TIKTOK_TEST_EVENT_CODE est utilisé s'il existe. */
  testEventCode?: string | null
}

export async function sendTikTokEvent(input: TikTokEventInput): Promise<void> {
  const token = process.env.TIKTOK_EVENTS_API_TOKEN
  if (!token) return // Silencieux si non configuré

  const {
    eventName,
    email,
    phone,
    eventId,
    clientIp,
    userAgent,
    url,
    ttclid,
    ttp,
    properties,
    testEventCode,
  } = input

  const user: Record<string, unknown> = {}
  if (email) user.email = tiktokHash(email)
  if (phone) user.phone = tiktokHash(phone.replace(/\s+/g, ''))
  if (clientIp) user.ip = clientIp
  if (userAgent) user.user_agent = userAgent
  if (ttclid) user.ttclid = ttclid
  if (ttp) user.ttp = ttp

  const testCode = testEventCode ?? process.env.TIKTOK_TEST_EVENT_CODE

  const body = {
    event_source: 'web',
    event_source_id: PIXEL_ID,
    data: [
      {
        event: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        user,
        page: url ? { url } : undefined,
        properties: properties && Object.keys(properties).length > 0 ? properties : undefined,
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  }

  try {
    const res = await fetch(EVENTS_API_URL, {
      method: 'POST',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.warn('[TikTokEAPI] Erreur envoi événement', { eventName, status: res.status, err: err.slice(0, 400) })
      return
    }

    // L'API répond 200 même en cas d'erreur métier : vérifier `code`.
    const json = (await res.json().catch(() => null)) as { code?: number; message?: string } | null
    if (json && json.code !== 0) {
      logger.warn('[TikTokEAPI] Réponse non-OK', { eventName, code: json.code, message: json.message })
    }
  } catch (err) {
    logger.warn('[TikTokEAPI] Exception lors de l\'envoi', { eventName, err: (err as Error).message })
  }
}
