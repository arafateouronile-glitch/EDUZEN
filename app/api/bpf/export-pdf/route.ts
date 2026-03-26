/**
 * POST /api/bpf/export-pdf
 *
 * Génère le PDF du Bilan Pédagogique et Financier (Cerfa 2486) pour une année donnée.
 * Nécessite une session authentifiée admin.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bpfService } from '@/lib/services/bpf.service'
import { logger } from '@/lib/utils/logger'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'
import type { BPFCerfaData } from '@/lib/services/bpf.service'
import { heavyRateLimiter, createRateLimitResponse } from '@/lib/utils/rate-limiter'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── HTML Cerfa ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num)
}

function generateCerfaHTML(data: BPFCerfaData): string {
  const { organization, year, cadreF, cadreG, cadreH } = data

  const row = (label: string, ref: string, value: string) => `
    <tr>
      <td class="ref">${ref}</td>
      <td class="label">${label}</td>
      <td class="value">${value}</td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>BPF ${year} — ${organization.name}</title>
  <style>
    @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9pt; color: #1a1a1a; background: #fff; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 12px; }
    .page-header h1 { font-size: 13pt; font-weight: 700; color: #1e3a5f; }
    .page-header .cerfa-ref { font-size: 8pt; color: #666; text-align: right; }

    .org-block { background: #f5f7fa; border: 1px solid #cdd5e0; border-radius: 4px;
      padding: 10px 14px; margin-bottom: 14px; display: grid;
      grid-template-columns: 1fr 1fr; gap: 4px 24px; }
    .org-block .field { display: flex; gap: 6px; }
    .org-block .field-label { color: #555; font-size: 8pt; min-width: 100px; }
    .org-block .field-value { font-weight: 600; font-size: 8.5pt; }

    .section { margin-bottom: 14px; }
    .section-title { background: #1e3a5f; color: #fff; padding: 5px 10px;
      font-size: 9pt; font-weight: 700; margin-bottom: 0; }
    .section-sub { font-size: 7.5pt; font-weight: 400; opacity: 0.85; }

    table.cerfa { width: 100%; border-collapse: collapse; }
    table.cerfa td, table.cerfa th { border: 1px solid #c0c8d4; padding: 4px 8px; }
    table.cerfa thead tr { background: #dbe4f0; }
    table.cerfa thead th { font-size: 8pt; font-weight: 700; text-align: left; }
    table.cerfa td.ref { width: 48px; font-weight: 700; color: #1e3a5f; text-align: center; font-size: 8pt; }
    table.cerfa td.label { color: #333; }
    table.cerfa td.value { width: 120px; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
    table.cerfa tr.total { background: #eef2f8; font-weight: 700; }
    table.cerfa tr.total td.value { color: #1e3a5f; }
    table.cerfa tr:nth-child(even) { background: #f9fafb; }
    table.cerfa tr.total { background: #dbe4f0 !important; }

    .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

    .footer { margin-top: 18px; border-top: 1px solid #cdd5e0; padding-top: 8px;
      font-size: 7.5pt; color: #888; display: flex; justify-content: space-between; }

    .warnings { margin-bottom: 12px; }
    .warning-item { border-left: 3px solid #f59e0b; background: #fffbeb;
      padding: 5px 10px; margin-bottom: 4px; font-size: 8pt; color: #92400e; }
    .warning-item.critical { border-color: #ef4444; background: #fef2f2; color: #991b1b; }
  </style>
</head>
<body>

  <div class="page-header">
    <div>
      <h1>Bilan Pédagogique et Financier — ${year}</h1>
      <div style="font-size:8pt;color:#555;margin-top:3px;">Cerfa n° 2486 — Article L.6352-11 du Code du travail</div>
    </div>
    <div class="cerfa-ref">
      <div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
      <div style="margin-top:2px;">EDUZEN</div>
    </div>
  </div>

  <div class="org-block">
    <div class="field"><span class="field-label">Organisme :</span><span class="field-value">${organization.name}</span></div>
    <div class="field"><span class="field-label">SIRET :</span><span class="field-value">${organization.siret || '—'}</span></div>
    <div class="field"><span class="field-label">Adresse :</span><span class="field-value">${organization.address || '—'}</span></div>
    <div class="field"><span class="field-label">N° DA :</span><span class="field-value">${organization.nda_number || '—'}</span></div>
    <div class="field"><span class="field-label">Ville :</span><span class="field-value">${[organization.postal_code, organization.city].filter(Boolean).join(' ') || '—'}</span></div>
    <div class="field"><span class="field-label">Année :</span><span class="field-value">${year}</span></div>
  </div>

  ${data.hasWarnings ? `
  <div class="warnings">
    ${data.inconsistencies.slice(0, 5).map(inc => `
      <div class="warning-item${inc.severity === 'critical' ? ' critical' : ''}">
        ⚠ ${inc.description}
      </div>`).join('')}
    ${data.inconsistencies.length > 5 ? `<div class="warning-item">… et ${data.inconsistencies.length - 5} autre(s) incohérence(s)</div>` : ''}
  </div>` : ''}

  <!-- CADRE F -->
  <div class="section">
    <div class="section-title">CADRE F — Produits de la formation professionnelle
      <span class="section-sub">(hors taxes)</span>
    </div>
    <table class="cerfa">
      <thead><tr>
        <th style="width:48px">Réf.</th>
        <th>Source de financement</th>
        <th style="width:120px;text-align:right">Montant (€)</th>
      </tr></thead>
      <tbody>
        ${row('Mon Compte Formation (CPF)', 'F1', formatCurrency(cadreF.cpf))}
        ${row('Opérateurs de Compétences (OPCO)', 'F2', formatCurrency(cadreF.opco))}
        ${row('Entreprises', 'F3', formatCurrency(cadreF.companies))}
        ${row('Particuliers', 'F4', formatCurrency(cadreF.individuals))}
        ${row('Pôle Emploi / France Travail', 'F5', formatCurrency(cadreF.pole_emploi))}
        ${row('Conseils régionaux', 'F6', formatCurrency(cadreF.regions))}
        ${row('État', 'F7', formatCurrency(cadreF.state))}
        ${row('Autres financements', 'F8', formatCurrency(cadreF.other))}
        <tr class="total">
          <td class="ref">F9</td>
          <td class="label"><strong>Total des produits</strong></td>
          <td class="value">${formatCurrency(cadreF.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="two-cols">
    <!-- CADRE G -->
    <div class="section">
      <div class="section-title">CADRE G — Stagiaires formés</div>
      <table class="cerfa">
        <thead><tr><th>Réf.</th><th>Catégorie</th><th style="text-align:right">Nb</th></tr></thead>
        <tbody>
          ${row('Hommes', 'G1', formatNumber(cadreG.men))}
          ${row('Femmes', 'G2', formatNumber(cadreG.women))}
          ${row('Moins de 26 ans', 'G3', formatNumber(cadreG.under_26))}
          ${row('45 ans et plus', 'G4', formatNumber(cadreG.over_45))}
          ${row('Personnes handicapées', 'G5', formatNumber(cadreG.disabled))}
          <tr class="total">
            <td class="ref">G6</td>
            <td class="label"><strong>Total stagiaires</strong></td>
            <td class="value">${formatNumber(cadreG.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CADRE H -->
    <div class="section">
      <div class="section-title">CADRE H — Activité de formation</div>
      <table class="cerfa">
        <thead><tr><th>Réf.</th><th>Indicateur</th><th style="text-align:right">Valeur</th></tr></thead>
        <tbody>
          ${row('Heures de formation dispensées', 'H1', formatNumber(cadreH.total_hours))}
          ${row('Heures-stagiaires', 'H2', formatNumber(cadreH.trainee_hours))}
          ${row('Nombre de sessions', 'H3', formatNumber(cadreH.sessions_count))}
          ${row('Nombre de programmes', 'H4', formatNumber(cadreH.programs_count))}
          ${row("Taux d'assiduité moyen", 'H5', `${cadreH.attendance_rate.toFixed(1)} %`)}
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <span>Document généré automatiquement par EDUZEN — à vérifier avant dépôt officiel</span>
    <span>${organization.name} — BPF ${year}</span>
  </div>

</body>
</html>`
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limiting — 5 req/min (génération PDF lourde)
  const rl = await heavyRateLimiter.check(request)
  if (!rl.allowed) {
    return createRateLimitResponse(rl.remaining, rl.resetTime) as unknown as NextResponse
  }

  let page: Awaited<ReturnType<typeof createPage>> | null = null

  try {
    // Auth
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { year } = body as { year?: number }

    if (!year || typeof year !== 'number') {
      return NextResponse.json({ error: 'Paramètre "year" requis' }, { status: 400 })
    }

    // Récupérer l'organisation de l'utilisateur
    const supabase = createAdminClient()
    const { data: userRow } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userRow?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    // Préparer les données Cerfa
    const cerfaData = await bpfService.prepareCerfaData(userRow.organization_id, year)
    const html = generateCerfaHTML(cerfaData)
    const filename = `BPF_${year}_${cerfaData.organization.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

    // Gotenberg (moteur principal)
    if (isGotenbergConfigured()) {
      try {
        const pdfBuffer = await htmlToPdf(html, {
          format: 'A4',
          marginTop: '0.59in',
          marginBottom: '0.59in',
          marginLeft: '0.59in',
          marginRight: '0.59in',
        })

        if (pdfBuffer && pdfBuffer.length > 0) {
          logger.info('[BPF PDF] Généré via Gotenberg', { year, org: cerfaData.organization.name })
          return new NextResponse(pdfBuffer as any, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
              'X-PDF-Engine': 'gotenberg',
            },
          })
        }
      } catch (err) {
        logger.warn('[BPF PDF] Gotenberg échoué, bascule Puppeteer', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Puppeteer (fallback)
    page = await createPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    })
    await page.close()
    page = null

    if (!pdf || pdf.length === 0) {
      return NextResponse.json({ error: 'PDF généré vide' }, { status: 500 })
    }

    logger.info('[BPF PDF] Généré via Puppeteer', { year, org: cerfaData.organization.name })
    return new NextResponse(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-PDF-Engine': 'puppeteer',
      },
    })
  } catch (error) {
    logger.error('[BPF PDF] Erreur', error instanceof Error ? error : new Error(String(error)))
    if (page) {
      try { await page.close() } catch { /* ignore */ }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
