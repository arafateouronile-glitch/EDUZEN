/**
 * Webhook Resend — Mise à jour du statut des emails trackés.
 *
 * Resend utilise Svix pour signer les webhooks. La vérification de signature
 * est implémentée manuellement via HMAC-SHA256 (Web Crypto API) pour éviter
 * une dépendance npm supplémentaire.
 *
 * Configuration dans le dashboard Resend :
 *   URL : https://votre-domaine.com/api/webhooks/resend
 *   Événements : email.sent, email.delivered, email.opened, email.clicked,
 *                email.bounced, email.complained, email.delivery_delayed
 *   Signing secret → copier dans RESEND_WEBHOOK_SECRET (format : whsec_XXXXXX)
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

// Mapping événements Resend → statut email_logs
const EVENT_STATUS_MAP: Record<string, string> = {
  'email.sent':              'sent',
  'email.delivered':         'delivered',
  'email.opened':            'opened',
  'email.clicked':           'clicked',
  'email.bounced':           'bounced',
  'email.complained':        'complained',
  'email.delivery_delayed':  'sent', // reste 'sent', on note dans metadata
}

// ─── Vérification de signature Svix (HMAC-SHA256) ────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

async function verifyResendSignature(
  req: NextRequest,
  rawBody: string
): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    // Pas de secret configuré → bypass (à ne pas utiliser en production)
    logger.warn('Webhook Resend - RESEND_WEBHOOK_SECRET non configuré, vérification ignorée')
    return true
  }

  const msgId        = req.headers.get('svix-id')
  const msgTimestamp = req.headers.get('svix-timestamp')
  const msgSignature = req.headers.get('svix-signature')

  if (!msgId || !msgTimestamp || !msgSignature) {
    logger.warn('Webhook Resend - En-têtes Svix manquants')
    return false
  }

  // Vérifier que le timestamp est récent (tolérance ±5 min)
  const ts  = parseInt(msgTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    logger.warn('Webhook Resend - Timestamp invalide ou trop ancien', { ts, now })
    return false
  }

  // Dériver la clé depuis le secret (format whsec_<base64>)
  const keyBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const keyBytes  = base64ToBytes(keyBase64)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes as unknown as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )

  // Contenu signé : "<svix-id>.<svix-timestamp>.<body>"
  const signedContent  = `${msgId}.${msgTimestamp}.${rawBody}`
  const sigBytes       = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signedContent))
  const computedSig    = `v1,${bytesToBase64(sigBytes)}`

  // svix-signature peut contenir plusieurs signatures séparées par des espaces
  const signatures = msgSignature.split(' ')
  return signatures.some(sig => sig === computedSig)
}

// ─── Handler principal ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Lire le body brut AVANT de le parser (nécessaire pour la vérification)
  const rawBody = await req.text()

  // Vérifier la signature
  const isValid = await verifyResendSignature(req, rawBody)
  if (!isValid) {
    logger.warn('Webhook Resend - Signature invalide, requête rejetée')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: { type?: string; data?: { email_id?: string; [key: string]: unknown } }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = payload?.type
  const emailId   = payload?.data?.email_id

  logger.info('Webhook Resend - Événement reçu', { eventType, emailId })

  // Ignorer les événements inconnus
  if (!eventType || !(eventType in EVENT_STATUS_MAP)) {
    return NextResponse.json({ received: true })
  }

  if (!emailId) {
    logger.warn('Webhook Resend - email_id manquant dans le payload', { eventType })
    return NextResponse.json({ received: true })
  }

  const newStatus = EVENT_STATUS_MAP[eventType]

  try {
    const supabase = createAdminClient()

      const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Pour les bounces et delays, on peut stocker une info utile en metadata
    // via une mise à jour JSONB merge (concat operator)
    const { error } = await supabase
      .from('email_logs')
      .update(updatePayload)
      .eq('resend_id', emailId)

    if (error) {
      logger.error('Webhook Resend - Erreur mise à jour email_logs', error as Error, { emailId, newStatus })
      // On renvoie 200 quand même pour éviter les retries Resend sur des erreurs DB
    } else {
      logger.info('Webhook Resend - Statut mis à jour', { emailId, newStatus })
    }
  } catch (err) {
    logger.error('Webhook Resend - Exception', err as Error)
  }

  // Toujours répondre 200 pour éviter les retries Resend
  return NextResponse.json({ received: true })
}
