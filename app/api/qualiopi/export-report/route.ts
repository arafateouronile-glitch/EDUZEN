/**
 * GET /api/qualiopi/export-report
 * Génère le rapport d'audit Qualiopi en PDF via Puppeteer.
 * Retourne un fichier PDF téléchargeable.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'
import {
  generateQualiopiReportHtml,
  type OrgInfo,
  type EvidenceEntry,
} from '@/lib/utils/qualiopi-report/generate-html'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 401 })

  // ── 1. Organisation ────────────────────────────────────────────────────────
  const { data: orgData } = await supabase
    .from('organizations')
    .select('name, address, city, siret, nda_number, logo_url, email, phone')
    .eq('id', orgId)
    .maybeSingle()

  const org: OrgInfo = {
    name:       orgData?.name ?? 'Organisme de formation',
    address:    orgData?.address ?? null,
    city:       orgData?.city ?? null,
    siret:      orgData?.siret ?? null,
    nda_number: orgData?.nda_number ?? null,
    logo_url:   orgData?.logo_url ?? null,
    email:      orgData?.email ?? null,
    phone:      orgData?.phone ?? null,
  }

  // ── 2. Preuves (auto + manuelles, tous indicateurs) ──────────────────────
  const { data: evidenceData } = await supabase
    .from('compliance_evidence_automated')
    .select(
      'indicator_number, title, description, status, confidence_score, event_date, entity_name'
    )
    .eq('organization_id', orgId)
    .order('indicator_number', { ascending: true })
    .order('confidence_score', { ascending: false })

  // Pour chaque indicateur : preuves valides en premier (max 4 au total)
  const evidenceByIndicator = new Map<number, EvidenceEntry[]>()
  for (const row of evidenceData ?? []) {
    const num = row.indicator_number
    if (!evidenceByIndicator.has(num)) evidenceByIndicator.set(num, [])
    const list = evidenceByIndicator.get(num)!
    if (list.length < 4) list.push(row as EvidenceEntry)
  }
  const evidence: EvidenceEntry[] = Array.from(evidenceByIndicator.values()).flat()

  // ── 3. Génération HTML ─────────────────────────────────────────────────────
  const html = generateQualiopiReportHtml(org, evidence)

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `rapport-qualiopi-${dateStr}.pdf`

  // ── 4. Conversion PDF ─────────────────────────────────────────────────────
  let puppeteerPage: Awaited<ReturnType<typeof createPage>> | null = null
  try {
    let pdfBuffer: Buffer | Uint8Array

    if (isGotenbergConfigured()) {
      pdfBuffer = await htmlToPdf(html, {
        preferCssPageSize: true, // @page A4 avec marges définies dans le HTML
        marginTop: '0',
        marginBottom: '0',
        marginLeft: '0',
        marginRight: '0',
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
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
      await puppeteerPage.close()
      puppeteerPage = null

      if (!pdf || pdf.length === 0) {
        return NextResponse.json({ error: 'PDF vide généré' }, { status: 500 })
      }
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
    if (puppeteerPage) {
      try { await puppeteerPage.close() } catch { /* ignore */ }
    }
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Erreur génération PDF : ${message}` },
      { status: 500 }
    )
  }
}
