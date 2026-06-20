import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ConventionBody {
  teacher: {
    user_id: string
    full_name: string
    email: string
    specialization?: string | null
  }
  convention: {
    period_start: string
    period_end: string
    hourly_rate?: number | null
    total_hours?: number | null
    specialization?: string | null
    custom_notes?: string | null
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function buildConventionHtml(body: ConventionBody, org: Record<string, any>): string {
  const { teacher, convention } = body
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const specialization = convention.specialization || teacher.specialization || ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; }
  .page { padding: 25mm 20mm; }
  h1 { font-size: 16pt; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6mm; }
  .subtitle { text-align: center; font-size: 11pt; color: #555; margin-bottom: 12mm; }
  .parties { display: flex; gap: 8mm; margin-bottom: 8mm; }
  .partie { flex: 1; border: 1px solid #d0d0d0; border-radius: 4px; padding: 5mm; }
  .partie h3 { font-size: 10pt; text-transform: uppercase; color: #555; margin-bottom: 3mm; border-bottom: 1px solid #eee; padding-bottom: 2mm; }
  .partie p { font-size: 10pt; margin-bottom: 2mm; }
  .section { margin-bottom: 6mm; }
  .section h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #335ACF; color: #335ACF; padding-bottom: 1mm; margin-bottom: 4mm; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 4mm; }
  .field { background: #f8f9fa; border-radius: 3px; padding: 3mm 4mm; }
  .field-label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .field-value { font-size: 11pt; font-weight: bold; }
  .notes { background: #f8f9fa; border-left: 3px solid #335ACF; padding: 4mm; border-radius: 0 3px 3px 0; white-space: pre-wrap; font-size: 10pt; }
  .signatures { display: flex; gap: 15mm; margin-top: 15mm; }
  .sig-block { flex: 1; text-align: center; }
  .sig-block p { font-size: 10pt; margin-bottom: 2mm; }
  .sig-line { border-bottom: 1px solid #333; height: 20mm; margin-bottom: 2mm; }
  .footer { text-align: center; font-size: 8pt; color: #888; margin-top: 10mm; }
  .ref-row { display: flex; justify-content: space-between; font-size: 9pt; color: #666; margin-bottom: 8mm; }
</style>
</head>
<body>
<div class="page">
  <h1>Convention de prestation</h1>
  <p class="subtitle">Intervention de formateur indépendant</p>

  <div class="ref-row">
    <span>Date : ${today}</span>
    ${org.nda_number ? `<span>NDA : ${org.nda_number}</span>` : ''}
    ${org.siret ? `<span>SIRET : ${org.siret}</span>` : ''}
  </div>

  <div class="parties">
    <div class="partie">
      <h3>L'organisme de formation</h3>
      <p><strong>${org.name ?? ''}</strong></p>
      ${org.address ? `<p>${org.address}</p>` : ''}
      ${org.city ? `<p>${org.city}</p>` : ''}
      ${org.email ? `<p>${org.email}</p>` : ''}
      ${org.phone ? `<p>${org.phone}</p>` : ''}
    </div>
    <div class="partie">
      <h3>Le(la) formateur(trice)</h3>
      <p><strong>${teacher.full_name}</strong></p>
      <p>${teacher.email}</p>
      ${specialization ? `<p>Spécialité : ${specialization}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <h2>Objet de la convention</h2>
    <p>Dans le cadre de ses activités de formation professionnelle, <strong>${org.name ?? "l'organisme"}</strong> fait appel aux services de <strong>${teacher.full_name}</strong> pour assurer des prestations de formation${specialization ? ` en <em>${specialization}</em>` : ""}, conformément aux dispositions de l’article L.6351-1 du Code du travail.</p>
  </div>

  <div class="section">
    <h2>Détails de la prestation</h2>
    <div class="grid">
      <div class="field">
        <div class="field-label">Début de la convention</div>
        <div class="field-value">${formatDate(convention.period_start)}</div>
      </div>
      <div class="field">
        <div class="field-label">Fin de la convention</div>
        <div class="field-value">${formatDate(convention.period_end)}</div>
      </div>
      ${convention.hourly_rate != null ? `
      <div class="field">
        <div class="field-label">Tarif horaire HT</div>
        <div class="field-value">${Number(convention.hourly_rate).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
      </div>` : ''}
      ${convention.total_hours != null ? `
      <div class="field">
        <div class="field-label">Volume horaire prévu</div>
        <div class="field-value">${convention.total_hours} heures</div>
      </div>
      ${convention.hourly_rate != null ? `
      <div class="field">
        <div class="field-label">Montant total estimé HT</div>
        <div class="field-value">${(Number(convention.hourly_rate) * Number(convention.total_hours)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
      </div>` : ''}` : ''}
    </div>
  </div>

  ${convention.custom_notes ? `
  <div class="section">
    <h2>Clauses particulières</h2>
    <div class="notes">${convention.custom_notes}</div>
  </div>` : ''}

  <div class="section">
    <h2>Obligations des parties</h2>
    <p>L'organisme s'engage à fournir au formateur toutes les informations nécessaires à la bonne exécution des prestations. Le formateur s'engage à réaliser les prestations conformément aux objectifs pédagogiques convenus, dans le respect des dispositions légales et réglementaires applicables à la formation professionnelle.</p>
  </div>

  <div class="signatures">
    <div class="sig-block">
      <p>Pour <strong>${org.name ?? "l'organisme"}</strong></p>
      <p style="font-size:9pt;color:#888">Nom, qualité et signature</p>
      <div class="sig-line"></div>
      <p>Fait à ____________, le ${today}</p>
    </div>
    <div class="sig-block">
      <p><strong>${teacher.full_name}</strong></p>
      <p style="font-size:9pt;color:#888">Signature précédée de la mention « Lu et approuvé »</p>
      <div class="sig-line"></div>
      <p>Fait à ____________, le ${today}</p>
    </div>
  </div>

  <div class="footer">
    Convention de prestation — ${org.name ?? ''} — ${today}
    ${org.siret ? ` — SIRET ${org.siret}` : ''}
  </div>
</div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  let page: Awaited<ReturnType<typeof createPage>> | null = null
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, organization_id')
      .eq('id', user.id)
      .single()

    if (!userData || !['admin', 'secretary'].includes(userData.role ?? '')) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    const body = await request.json() as ConventionBody

    if (!body.teacher?.user_id || !body.convention?.period_start || !body.convention?.period_end) {
      return NextResponse.json({ error: 'Données incomplètes (enseignant, période requise)' }, { status: 400 })
    }

    // Récupérer les infos de l'organisation
    const { data: org } = await supabase
      .from('organizations')
      .select('name, address, city, email, phone, siret, nda_number')
      .eq('id', userData.organization_id!)
      .single()

    const html = buildConventionHtml(body, org ?? {})

    // Génération PDF via Gotenberg (ou Puppeteer en fallback)
    if (isGotenbergConfigured()) {
      const pdfBuffer = await htmlToPdf(html, { format: 'A4', marginTop: '0.98in', marginBottom: '0.98in', marginLeft: '0.79in', marginRight: '0.79in' })
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="convention-${body.teacher.full_name.replace(/\s+/g, '-')}.pdf"`,
        },
      })
    }

    if (process.env.VERCEL === '1') {
      return NextResponse.json({ error: 'Génération PDF indisponible sur Vercel sans Gotenberg' }, { status: 503 })
    }

    page = await createPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '25mm', bottom: '25mm', left: '20mm', right: '20mm' },
    })
    await page.close()
    page = null

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="convention-${body.teacher.full_name.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (error: unknown) {
    if (page) { try { await page.close() } catch {} }
    logger.error('Erreur génération convention formateur', error)
    return NextResponse.json({ error: 'Erreur lors de la génération de la convention' }, { status: 500 })
  }
}
