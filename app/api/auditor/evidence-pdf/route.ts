/**
 * GET /api/auditor/evidence-pdf?token=XXX&id=EVIDENCE_ID
 * Génère un PDF "fiche de preuve" pour un élément de conformité Qualiopi.
 * Accessible publiquement via token auditeur — pas de cookie auth requis.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { AuditorPortalService } from '@/lib/services/auditor-portal.service'
import { logger } from '@/lib/utils/logger'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'

export const runtime = 'nodejs'
export const maxDuration = 60

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function buildFicheHtml(evidence: Record<string, unknown>, orgName: string): string {
  const eventDate = evidence.event_date ? new Date(evidence.event_date as string) : null
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : 'Date inconnue'
  const formattedTime = eventDate
    ? eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : ''
  const generatedAt = new Date().toLocaleString('fr-FR')

  const statusLabels: Record<string, string> = {
    valid: 'Valide', pending: 'En attente', invalid: 'Invalide', expired: 'Expiré',
  }
  const statusLabel = statusLabels[evidence.status as string] ?? String(evidence.status ?? '')

  const typeLabels: Record<string, string> = {
    document: 'Document', event: 'Événement', data_point: 'Donnée système',
    signature: 'Signature', attendance: 'Présence', evaluation: 'Évaluation',
    feedback: 'Retour', contract: 'Contrat', certificate: 'Certificat',
    system_generated: 'Généré automatiquement',
  }
  const typeLabel = typeLabels[evidence.evidence_type as string] ?? String(evidence.evidence_type ?? '')

  const sourceLabels: Record<string, string> = {
    system: 'Système EDUZEN', manual_upload: 'Upload manuel',
    integration: 'Intégration', automated_detection: 'Détection automatique',
  }
  const sourceLabel = sourceLabels[evidence.source as string] ?? String(evidence.source ?? '')

  const metadata = (evidence.metadata as Record<string, unknown> | null) ?? {}
  const metaEntries = Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined && v !== '')

  const metaRows = metaEntries.map(([k, v]) => `
    <tr>
      <td style="padding:6px 10px;font-size:11pt;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;">${k}</td>
      <td style="padding:6px 10px;font-size:11pt;color:#111827;border:1px solid #e5e7eb;">${typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111827; background: #fff; padding: 32px; }
  .header { border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; }
  .header-left h2 { font-size: 16pt; font-weight: bold; margin-top: 4px; }
  .header-left p { font-size: 10pt; color: #6b7280; margin-top: 2px; }
  .header-right { text-align: right; font-size: 9pt; color: #6b7280; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10pt; font-weight: bold; }
  .badge-valid { background: #d1fae5; color: #065f46; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-invalid { background: #fee2e2; color: #991b1b; }
  .section { margin-bottom: 20px; }
  .section h3 { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px; }
  .field-label { font-size: 9pt; color: #6b7280; margin-bottom: 2px; }
  .field-value { font-size: 11pt; color: #111827; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #9ca3af; display: flex; justify-content: space-between; }
  .hash { font-family: monospace; font-size: 8pt; word-break: break-all; color: #9ca3af; }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>Fiche de preuve Qualiopi</h1>
    <h2>${String(evidence.title ?? '')}</h2>
    <p>${orgName}</p>
  </div>
  <div class="header-right">
    <span class="badge badge-${String(evidence.status ?? '')}">${statusLabel}</span>
    <p style="margin-top:8px;">Ind. n°${String(evidence.indicator_number ?? '')}</p>
  </div>
</div>

<div class="section">
  <h3>Identification de la preuve</h3>
  <div class="grid">
    <div class="field">
      <div class="field-label">Type de preuve</div>
      <div class="field-value">${typeLabel}</div>
    </div>
    <div class="field">
      <div class="field-label">Source</div>
      <div class="field-value">${sourceLabel}</div>
    </div>
    <div class="field">
      <div class="field-label">Date de l'événement</div>
      <div class="field-value">${formattedDate}${formattedTime ? ` à ${formattedTime}` : ''}</div>
    </div>
    <div class="field">
      <div class="field-label">Score de confiance</div>
      <div class="field-value">${String(evidence.confidence_score ?? '—')}%</div>
    </div>
    ${evidence.entity_type ? `<div class="field"><div class="field-label">Type d'entité</div><div class="field-value">${String(evidence.entity_type)}</div></div>` : ''}
    ${evidence.entity_name ? `<div class="field"><div class="field-label">Entité liée</div><div class="field-value">${String(evidence.entity_name)}</div></div>` : ''}
  </div>
</div>

${evidence.description ? `<div class="section"><h3>Description</h3><p style="font-size:11pt;color:#374151;line-height:1.6;">${String(evidence.description)}</p></div>` : ''}

${metaEntries.length > 0 ? `
<div class="section">
  <h3>Métadonnées</h3>
  <table>
    <thead><tr>
      <th style="padding:6px 10px;font-size:10pt;text-align:left;background:#f3f4f6;border:1px solid #e5e7eb;">Clé</th>
      <th style="padding:6px 10px;font-size:10pt;text-align:left;background:#f3f4f6;border:1px solid #e5e7eb;">Valeur</th>
    </tr></thead>
    <tbody>${metaRows}</tbody>
  </table>
</div>
` : ''}

<div class="section">
  <h3>Intégrité de la preuve</h3>
  <div class="field">
    <div class="field-label">Identifiant unique</div>
    <div class="hash">${String(evidence.id ?? '')}</div>
  </div>
  ${evidence.action_hash ? `<div class="field" style="margin-top:8px;"><div class="field-label">Hash d'intégrité</div><div class="hash">${String(evidence.action_hash)}</div></div>` : ''}
</div>

<div class="footer">
  <span>Fiche générée le ${generatedAt} via EDUZEN</span>
  <span>Portail Auditeur – Données immuables</span>
</div>

</body>
</html>`
}

async function generatePdf(html: string): Promise<Buffer> {
  // Essayer Gotenberg avec timeout court
  if (isGotenbergConfigured()) {
    try {
      const buf = await Promise.race([
        htmlToPdf(html, { format: 'A4', marginTop: '0.6in', marginBottom: '0.6in', marginLeft: '0.7in', marginRight: '0.7in' }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
      ])
      if (buf && buf.length > 0) return buf
    } catch {
      logger.warn('[evidence-pdf] Gotenberg indisponible, fallback Puppeteer')
    }
  }

  // Fallback Puppeteer
  const puppeteer = (await import('puppeteer')).default
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const buf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0.6in', bottom: '0.6in', left: '0.7in', right: '0.7in' } })
    return Buffer.from(buf)
  } finally {
    await browser.close()
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const evidenceId = searchParams.get('id')

  if (!evidenceId) {
    return NextResponse.json({ error: 'id requis' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  let orgId: string

  if (token) {
    const service = new AuditorPortalService(supabase)
    const link = await service.validateToken(token)
    if (!link) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    }
    orgId = link.organization_id
  } else {
    // Mode preview : authentification par session
    const sessionClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 403 })
    }
    orgId = userData.organization_id
  }

  try {
    const [{ data: evidence, error: evError }, { data: org }] = await Promise.all([
      supabase
        .from('compliance_evidence_automated')
        .select('*')
        .eq('id', evidenceId)
        .eq('organization_id', orgId)
        .single(),
      supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single(),
    ])

    if (evError || !evidence) {
      return NextResponse.json({ error: 'Preuve introuvable' }, { status: 404 })
    }

    const orgName = (org as { name?: string } | null)?.name ?? 'Organisme de formation'
    const html = buildFicheHtml(evidence as Record<string, unknown>, orgName)
    const filename = `preuve-qualiopi-${String(evidence.id).slice(0, 8)}.pdf`

    const pdfBuffer = await generatePdf(html)

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return NextResponse.json({ error: 'Échec de génération PDF' }, { status: 500 })
    }

    return new NextResponse(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    logger.error('[evidence-pdf] Error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
