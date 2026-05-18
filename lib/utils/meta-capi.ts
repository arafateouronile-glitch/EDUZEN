'use server'

import { createHash } from 'crypto'

const PIXEL_ID = '977662918296647'
const API_VERSION = 'v25.0'
const CAPI_URL = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`

// Mapping des événements CRM EduZen → noms d'événements Meta
const EVENT_MAP: Record<string, string> = {
  signup: 'Lead',
  billing_started: 'Subscribe',
  subscription_upgraded: 'Subscribe',
  onboarding_completed: 'CompleteRegistration',
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

interface MetaCapiPayload {
  eventName: string
  email?: string | null
  phone?: string | null
  leadId?: string | null
}

export async function sendMetaCrmEvent(payload: MetaCapiPayload): Promise<void> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  if (!accessToken) return // Silencieux si pas configuré

  const { eventName, email, phone, leadId } = payload

  const userData: Record<string, unknown> = {}
  if (email) userData.em = [sha256(email)]
  if (phone) userData.ph = [sha256(phone.replace(/\s+/g, ''))]
  if (leadId) userData.lead_id = leadId

  const body = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system_generated',
        custom_data: {
          event_source: 'crm',
          lead_event_source: 'EduZen',
        },
        user_data: userData,
      },
    ],
  }

  try {
    const res = await fetch(`${CAPI_URL}?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      console.warn('[MetaCAPI] Erreur envoi événement:', eventName, err)
    }
  } catch {
    // Fire-and-forget — ne jamais bloquer le flux principal
    console.warn('[MetaCAPI] Exception lors de l\'envoi:', eventName)
  }
}

export function getCrmEventName(eventType: string): string | null {
  return EVENT_MAP[eventType] ?? null
}
