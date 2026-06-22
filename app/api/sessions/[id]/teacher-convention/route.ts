/**
 * GET /api/sessions/[id]/teacher-convention?user_id=XXX
 * Génère la convention de prestation formateur depuis les données de session_teachers.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'
import { buildTeacherConventionHtml } from '@/lib/utils/teacher-convention/build-html'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { acquireOrgLock, releaseOrgLock } from '@/lib/utils/sync-lock'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let puppeteerPage: Awaited<ReturnType<typeof createPage>> | null = null
  let lockAcquired = false
  let convLockId: string | undefined

  try {
    const { id: sessionId } = await params
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    // ── Lock anti-doublons par session+formateur ──────────────────────────────
    convLockId = `${sessionId}:${userId}`
    lockAcquired = await acquireOrgLock('pdf-convention', convLockId, 60)
    if (!lockAcquired) {
      return NextResponse.json(
        { error: 'Génération en cours, réessayez dans quelques secondes' },
        { status: 429 }
      )
    }

    // ── Toutes les queries en parallèle ──────────────────────────────────────
    const [sessionResult, orgResult, teacherUserResult, teacherRecordResult, stRowResult] =
      await Promise.all([
        supabase
          .from('sessions')
          .select('id, name, start_date, end_date, organization_id')
          .eq('id', sessionId)
          .eq('organization_id', orgId)
          .single(),
        supabase
          .from('organizations')
          .select('name, address, city, email, phone, siret, nda_number')
          .eq('id', orgId)
          .single(),
        supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', userId)
          .single(),
        supabase
          .from('teachers')
          .select('specialization')
          .eq('user_id', userId)
          .maybeSingle(),
        (supabase as any)
          .from('session_teachers')
          .select('daily_rate, hourly_rate, intervention_days, total_hours, notes')
          .eq('session_id', sessionId)
          .eq('teacher_id', userId)
          .maybeSingle() as Promise<{ data: { daily_rate: number | null; hourly_rate: number | null; intervention_days: number | null; total_hours: number | null; notes: string | null } | null; error: unknown }>,
      ])

    const { data: session, error: sessErr } = sessionResult
    const { data: org } = orgResult
    const { data: teacherUser } = teacherUserResult
    const { data: teacherRecord } = teacherRecordResult
    const { data: stRow } = stRowResult

    if (sessErr || !session) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    if (!teacherUser) {
      return NextResponse.json({ error: 'Formateur introuvable' }, { status: 404 })
    }

    // ── Génération HTML ───────────────────────────────────────────────────────
    const html = buildTeacherConventionHtml({
      teacher: {
        full_name:      teacherUser.full_name ?? '',
        email:          (teacherUser as { email?: string | null }).email ?? '',
        specialization: teacherRecord?.specialization ?? null,
      },
      convention: {
        period_start:      session.start_date,
        period_end:        session.end_date,
        session_name:      session.name,
        daily_rate:        stRow?.daily_rate ?? null,
        hourly_rate:       stRow?.hourly_rate ?? null,
        intervention_days: stRow?.intervention_days ?? null,
        total_hours:       stRow?.total_hours ?? null,
        custom_notes:      stRow?.notes ?? null,
      },
      org: {
        name:       org?.name ?? null,
        address:    org?.address ?? null,
        city:       org?.city ?? null,
        email:      org?.email ?? null,
        phone:      org?.phone ?? null,
        siret:      (org as { siret?: string | null } | null)?.siret ?? null,
        nda_number: org?.nda_number ?? null,
      },
    })

    // ── PDF via Gotenberg (ou Puppeteer en fallback) ──────────────────────────
    let pdfBuffer: Buffer | Uint8Array

    if (isGotenbergConfigured()) {
      pdfBuffer = await htmlToPdf(html, {
        format: 'A4',
        marginTop: '0.98in',
        marginBottom: '0.98in',
        marginLeft: '0.79in',
        marginRight: '0.79in',
      })
    } else {
      if (process.env.VERCEL === '1') {
        return NextResponse.json(
          { error: 'Génération PDF indisponible sur Vercel sans Gotenberg' },
          { status: 503 }
        )
      }
      puppeteerPage = await createPage()
      await puppeteerPage.setContent(html, { waitUntil: 'domcontentloaded' })
      const pdf = await puppeteerPage.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '25mm', bottom: '25mm', left: '20mm', right: '20mm' },
      })
      await puppeteerPage.close()
      puppeteerPage = null
      pdfBuffer = new Uint8Array(pdf)
    }

    const safeName = (teacherUser.full_name ?? 'formateur').replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const filename = `convention-${safeName}.pdf`

    return new NextResponse(pdfBuffer instanceof Buffer ? pdfBuffer : new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    logger.error('teacher-convention GET error', err instanceof Error ? err : new Error(String(err)), {
      error: sanitizeError(err),
    })
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 })
  } finally {
    if (lockAcquired && convLockId) await releaseOrgLock('pdf-convention', convLockId)
    if (puppeteerPage) {
      try { await puppeteerPage.close() } catch { /* ignore */ }
    }
  }
}
