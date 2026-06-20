import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function verifyToken(token: string): string | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const userIdB64 = token.slice(0, dot)
    const hmacB64 = token.slice(dot + 1)
    const userId = Buffer.from(userIdB64, 'base64url').toString('utf8')
    const secret = process.env.SIGNATURE_EVIDENCE_SECRET ?? process.env.CRON_SECRET ?? 'eduzen-cal'
    const expected = createHmac('sha256', secret).update(userId).digest('base64url')
    if (hmacB64 !== expected) return null
    return userId
  } catch {
    return null
  }
}

function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function toIcalDate(date: string, time?: string | null): { value: string; allDay: boolean } {
  if (time) {
    // Remove seconds if present, build local datetime
    const hm = time.slice(0, 5).replace(':', '')
    const d = date.replace(/-/g, '')
    return { value: `${d}T${hm}00`, allDay: false }
  }
  return { value: date.replace(/-/g, ''), allDay: true }
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0].replace(/-/g, '')
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  if (!token) return new NextResponse('Token manquant', { status: 400 })

  const userId = verifyToken(token)
  if (!userId) return new NextResponse('Token invalide', { status: 401 })

  const admin = createAdminClient()

  const { data: userData } = await admin
    .from('users')
    .select('organization_id, organizations(name)')
    .eq('id', userId)
    .single()

  if (!userData?.organization_id) {
    return new NextResponse('Organisation introuvable', { status: 404 })
  }

  const orgName = (userData as any).organizations?.name ?? 'EDUZEN'

  // Fenêtre : 3 mois passés → 12 mois futurs
  const past = new Date()
  past.setMonth(past.getMonth() - 3)
  const future = new Date()
  future.setFullYear(future.getFullYear() + 1)

  const { data: sessions } = await admin
    .from('sessions')
    .select('id, name, start_date, end_date, start_time, end_time, location, status, formations(name)')
    .eq('organization_id', userData.organization_id)
    .gte('end_date', past.toISOString().split('T')[0])
    .lte('start_date', future.toISOString().split('T')[0])
    .neq('status', 'cancelled')
    .order('start_date')

  const now = new Date().toISOString().replace(/-/g, '').replace(/:/g, '').replace(/\./g, '').slice(0, 15) + 'Z'

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//EDUZEN//${esc(orgName)}//FR`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(orgName)} — Formations`,
    'X-WR-TIMEZONE:Europe/Paris',
  ]

  for (const s of sessions ?? []) {
    const formationName = (s as any).formations?.name ?? ''
    const start = toIcalDate(s.start_date, s.start_time)
    const end = toIcalDate(s.end_date ?? s.start_date, s.end_time ?? (start.allDay ? null : s.start_time))

    const dtStart = start.allDay
      ? `DTSTART;VALUE=DATE:${start.value}`
      : `DTSTART:${start.value}`
    const dtEnd = end.allDay
      ? `DTEND;VALUE=DATE:${nextDay(s.end_date ?? s.start_date)}`
      : `DTEND:${end.value}`

    lines.push(
      'BEGIN:VEVENT',
      `UID:eduzen-session-${s.id}@eduzen.app`,
      `DTSTAMP:${now}`,
      dtStart,
      dtEnd,
      `SUMMARY:${esc(s.name)}`,
    )
    if (formationName) lines.push(`DESCRIPTION:Formation\\: ${esc(formationName)}`)
    if (s.location) lines.push(`LOCATION:${esc(s.location)}`)
    lines.push('STATUS:CONFIRMED', 'END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  // RFC 5545 : lignes de max 75 octets, continuation avec espace
  const folded = lines
    .map((line) => {
      if (line.length <= 75) return line
      const chunks: string[] = []
      let remaining = line
      chunks.push(remaining.slice(0, 75))
      remaining = remaining.slice(75)
      while (remaining.length > 0) {
        chunks.push(' ' + remaining.slice(0, 74))
        remaining = remaining.slice(74)
      }
      return chunks.join('\r\n')
    })
    .join('\r\n')

  return new NextResponse(folded, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="eduzen-formations.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
