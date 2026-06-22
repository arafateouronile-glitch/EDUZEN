/**
 * GET /api/sessions/[id]/attendance-sheet
 * Génère la feuille d'émargement PDF (A4 paysage) pour une session.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'
import {
  generateAttendanceSheetHtml,
  generateDefaultSlots,
  type AttendanceSheetData,
} from '@/lib/utils/attendance-sheet/generate-html'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { acquireOrgLock, releaseOrgLock } from '@/lib/utils/sync-lock'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let puppeteerPage: Awaited<ReturnType<typeof createPage>> | null = null
  let lockAcquired = false
  let sessionId: string | undefined

  try {
    const { id } = await params
    sessionId = id

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    // ── Lock anti-doublons par session ───────────────────────────────────────
    lockAcquired = await acquireOrgLock('pdf-attendance', sessionId, 60)
    if (!lockAcquired) {
      return NextResponse.json(
        { error: 'Génération en cours, réessayez dans quelques secondes' },
        { status: 429 }
      )
    }

    type SessionJoined = {
      id: string; name: string; start_date: string; end_date: string
      location: string | null; organization_id: string
      formations: { name: string } | null
      teachers: { users: { full_name: string | null } | null } | null
    }

    // ── Vague 1 : session (avec joins) + org en parallèle ────────────────────
    const [sessionResult, orgResult] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, name, start_date, end_date, location, organization_id, formations(name), teachers(users(full_name))')
        .eq('id', sessionId)
        .eq('organization_id', orgId)
        .single(),
      supabase
        .from('organizations')
        .select('name, nda_number, address, city, logo_url')
        .eq('id', orgId)
        .single(),
    ])

    const { data: session, error: sessErr } = sessionResult as { data: SessionJoined | null; error: unknown }
    const { data: org } = orgResult

    if (sessErr || !session) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    const formation: { name: string | null } | null = session.formations ?? null
    const teacher: { full_name: string | null } | null = session.teachers?.users ?? null

    // ── Vague 2 : inscrits + slots en parallèle ───────────────────────────────
    const [enrollmentsResult, slotsResult] = await Promise.all([
      supabase
        .from('enrollments')
        .select('students(first_name, last_name, company)')
        .eq('session_id', sessionId)
        .in('status', ['confirmed', 'completed']),
      supabase
        .from('session_slots')
        .select('date, time_slot')
        .eq('session_id', sessionId)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true }),
    ])

    const { data: enrollments } = enrollmentsResult
    const { data: rawSlots } = slotsResult

    type EnrRow = { students: { first_name: string | null; last_name: string | null; company?: string | null } | null }
    const students: AttendanceSheetData['students'] = ((enrollments ?? []) as unknown as EnrRow[])
      .map((e) => ({
        last_name:  e.students?.last_name  ?? '',
        first_name: e.students?.first_name ?? '',
        company:    e.students?.company ?? null,
      }))
      .filter((s) => s.last_name || s.first_name)
      .sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'))

    let slots: AttendanceSheetData['slots']
    if (rawSlots && rawSlots.length > 0) {
      slots = rawSlots.map((s) => ({
        date:      s.date,
        time_slot: s.time_slot,
        label:     s.time_slot === 'morning' ? 'Matin' : s.time_slot === 'afternoon' ? 'Après-midi' : s.time_slot,
      }))
      // Dédoublonner date+time_slot
      const seen = new Set<string>()
      slots = slots.filter((s) => {
        const key = `${s.date}_${s.time_slot}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    } else {
      slots = generateDefaultSlots(session.start_date, session.end_date)
    }

    // ── Génération HTML ───────────────────────────────────────────────────────
    const html = generateAttendanceSheetHtml({
      organization: {
        name:       org?.name ?? 'Organisation',
        nda_number: org?.nda_number ?? null,
        address:    org?.address ?? null,
        city:       org?.city ?? null,
        logo_url:   org?.logo_url ?? null,
      },
      session: {
        name:       session.name,
        start_date: session.start_date,
        end_date:   session.end_date,
        location:   session.location,
      },
      formation,
      teacher,
      students,
      slots,
    })

    const dateStr = format(new Date(), 'yyyy-MM-dd', { locale: fr })
    const safeName = session.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const filename = `emargement-${safeName}-${dateStr}.pdf`

    let pdfBuffer: Buffer | Uint8Array

    // ── PDF via Gotenberg (préféré) ───────────────────────────────────────────
    if (isGotenbergConfigured()) {
      pdfBuffer = await htmlToPdf(html, {
        preferCssPageSize: true,  // @page { size: A4 landscape } défini dans le HTML
        marginTop: '0',
        marginBottom: '0',
        marginLeft: '0',
        marginRight: '0',
      })
    } else {
      // ── Fallback Puppeteer (dev local sans Gotenberg) ─────────────────────
      if (process.env.VERCEL === '1') {
        return NextResponse.json(
          { error: 'Génération PDF indisponible sur Vercel sans Gotenberg' },
          { status: 503 }
        )
      }
      puppeteerPage = await createPage()
      await puppeteerPage.setContent(html, { waitUntil: 'networkidle0' })
      const pdf = await puppeteerPage.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
      await puppeteerPage.close()
      puppeteerPage = null
      pdfBuffer = new Uint8Array(pdf)
    }

    return new NextResponse(pdfBuffer instanceof Buffer ? pdfBuffer : new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    logger.error('attendance-sheet error', err instanceof Error ? err : new Error(String(err)), {
      error: sanitizeError(err),
    })
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 })
  } finally {
    if (lockAcquired && sessionId) await releaseOrgLock('pdf-attendance', sessionId)
    if (puppeteerPage) {
      try { await puppeteerPage.close() } catch { /* ignore */ }
    }
  }
}
