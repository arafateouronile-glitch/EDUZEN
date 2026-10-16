/**
 * GET /api/sessions/[id]/evaluation-report
 * Génère le « Rapport qualité » PDF (A4) du tableau Suivi qualité.
 * Mêmes paramètres de lot optionnels que /evaluation-analytics.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { acquireOrgLock, releaseOrgLock } from '@/lib/utils/sync-lock'
import {
  ASSESSMENT_TYPE_LABELS,
  buildAttentionPoints,
  buildBeforeAfter,
} from '@/lib/services/evaluation-analytics'
import { batchFromSearchParams, loadSessionAnalytics } from '@/lib/services/evaluation-analytics.server'
import { generateEvaluationReportHtml } from '@/lib/utils/evaluation-report/generate-html'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(
  req: NextRequest,
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
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

    lockAcquired = await acquireOrgLock('pdf-evaluation-report', sessionId, 60)
    if (!lockAcquired) {
      return NextResponse.json({ error: 'Génération en cours, réessayez dans quelques secondes' }, { status: 429 })
    }

    const batch = batchFromSearchParams(req.nextUrl.searchParams)

    const [sessionResult, orgResult, analytics] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, name, start_date, end_date, formations(name)')
        .eq('id', sessionId)
        .eq('organization_id', orgId)
        .single(),
      supabase.from('organizations').select('name, logo_url').eq('id', orgId).single(),
      loadSessionAnalytics(supabase, orgId, sessionId, batch),
    ])

    const session = sessionResult.data as
      | { name: string; start_date: string | null; end_date: string | null; formations: { name: string | null } | null }
      | null
    if (sessionResult.error || !session) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    const batchLabel = batch.subject || batch.assessment_type || batch.graded_at
      ? [
          batch.subject,
          batch.assessment_type ? ASSESSMENT_TYPE_LABELS[batch.assessment_type] ?? batch.assessment_type : null,
          batch.graded_at ? new Date(batch.graded_at).toLocaleDateString('fr-FR') : null,
        ].filter(Boolean).join(' · ')
      : null

    const html = generateEvaluationReportHtml({
      organization: { name: orgResult.data?.name ?? null, logo_url: orgResult.data?.logo_url ?? null },
      session: { name: session.name, start_date: session.start_date, end_date: session.end_date },
      formation: session.formations ?? null,
      batchLabel,
      analytics,
      attentionPoints: buildAttentionPoints(analytics),
      beforeAfter: buildBeforeAfter(analytics),
      generatedAt: new Date(),
    })

    const safeName = session.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const filename = `rapport-qualite-${safeName}.pdf`

    let pdfBuffer: Buffer | Uint8Array
    if (isGotenbergConfigured()) {
      pdfBuffer = await htmlToPdf(html, {
        preferCssPageSize: true, // @page { size: A4 } défini dans le HTML
        marginTop: '0',
        marginBottom: '0',
        marginLeft: '0',
        marginRight: '0',
      })
    } else {
      // Fallback Puppeteer (dev local sans Gotenberg)
      if (process.env.VERCEL === '1') {
        return NextResponse.json({ error: 'Génération PDF indisponible sur Vercel sans Gotenberg' }, { status: 503 })
      }
      puppeteerPage = await createPage()
      await puppeteerPage.setContent(html, { waitUntil: 'networkidle0' })
      const pdf = await puppeteerPage.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
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
    logger.error('evaluation-report error', err instanceof Error ? err : new Error(String(err)), {
      error: sanitizeError(err),
    })
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport' }, { status: 500 })
  } finally {
    if (lockAcquired && sessionId) await releaseOrgLock('pdf-evaluation-report', sessionId)
    if (puppeteerPage) {
      try { await puppeteerPage.close() } catch { /* ignore */ }
    }
  }
}
