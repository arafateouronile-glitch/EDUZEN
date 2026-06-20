import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export function buildCalendarToken(userId: string): string {
  const secret = process.env.SIGNATURE_EVIDENCE_SECRET ?? process.env.CRON_SECRET ?? 'eduzen-cal'
  const hmac = createHmac('sha256', secret).update(userId).digest('base64url')
  return `${Buffer.from(userId).toString('base64url')}.${hmac}`
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const token = buildCalendarToken(user.id)
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
    const feedUrl = `${base}/api/calendar/feed?token=${token}`

    return NextResponse.json({ feedUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
