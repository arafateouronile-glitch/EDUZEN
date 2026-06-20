import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'

export const runtime = 'nodejs'
export const maxDuration = 60

interface OrdreMissionBody {
  teacher: {
    user_id: string
    full_name: string
    email: string
    specialization?: string | null
  }
  session: {
    name?: string
    period_start: string
    period_end: string
    daily_rate?: number | null
    intervention_days?: number | null
    specialization?: string | null
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function buildOrdreMissionHtml(body: OrdreMissionBody, org: Record<string, any>): string {
  const { teacher, session } = body
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const specialization = session.specialization || teacher.specialization || ''
  const ref = `OM-${Date.now().toString().slice(-6)}`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.5; }
  .page { padding: 20mm 18mm; }
  h1 { font-size: 16pt; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4mm; }
  .subtitle { text-align: center; font-size: 10pt; color: #555; margin-bottom: 3mm; }
  .legal { text-align: center; font-size: 8.5pt; color: #777; font-style: italic; margin-bottom: 10mm; }
  .ref-row { display: flex; justify-content: space-between; font-size: 8.5pt; color: #666; margin-bottom: 10mm; border-bottom: 1px solid #eee; padding-bottom: 4mm; }
  .parties { display: flex; gap: 8mm; margin-bottom: 10mm; }
  .partie { flex: 1; border-left: 3px solid #1a1a1a; padding: 4mm 5mm; background: #f9f9f9; }
  .partie-label { font-size: 7.5pt; text-transform: uppercase; color: #888; letter-spacing: 0.5px; margin-bottom: 4mm; }
  .partie p { font-size: 9.5pt; margin-bottom: 1.5mm; }
  .section { margin-bottom: 8mm; }
  .section h2 { font-size: 10.5pt; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 2mm; margin-bottom: 5mm; color: #1a1a1a; }
  .highlight { background: #f9f9f9; border-left: 3px solid #1a1a1a; padding: 4mm 5mm; margin-bottom: 4mm; border-radius: 0 2px 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 4mm 0; }
  th { background: #1a1a1a; color: white; padding: 4mm 6mm; text-align: left; font-size: 8.5pt; }
  th:last-child { text-align: right; }
  td { padding: 4mm 6mm; border-bottom: 1px solid #e5e7eb; }
  td:last-child { text-align: right; font-weight: bold; }
  tr.alt td { background: #f9f9f9; }
  .grid2 { display: grid; grid-template-columns: 38% 62%; gap: 0; margin: 4mm 0; }
  .grid2-label { padding: 4mm 6mm; background: #f2f2f2; font-weight: bold; border: 1px solid #ddd; font-size: 9.5pt; }
  .grid2-value { padding: 4mm 6mm; border: 1px solid #ddd; border-left: none; font-size: 9.5pt; }
  .note { font-size: 8.5pt; color: #666; font-style: italic; margin-top: 3mm; }
  ul { padding-left: 5mm; line-height: 1.8; font-size: 9.5pt; }
  .signatures { display: flex; gap: 12mm; margin-top: 15mm; }
  .sig-block { flex: 1; text-align: center; }
  .sig-block p { font-size: 9.5pt; margin-bottom: 2mm; }
  .sig-line { border-top: 1px solid #333; margin: 20mm auto 3mm; width: 80%; }
  .sig-label { font-size: 8.5pt; color: #666; }
</style>
</head>
<body>
<div class="page">
  <h1>Ordre de Mission</h1>
  <p class="subtitle">Formation Professionnelle Continue</p>
  <p class="legal">(Arrêté du 20 décembre 2002 relatif aux frais professionnels — Barèmes URSSAF en vigueur)</p>

  <div class="ref-row">
    <span>Réf. mission : <strong>${ref}</strong></span>
    ${org.nda_number ? `<span>NDA : ${org.nda_number}</span>` : ''}
    <span>Émis le : ${today}</span>
  </div>

  <p style="font-weight:bold;font-size:10pt;margin-bottom:8mm;">L'ORGANISME MANDANT DONNE ORDRE À :</p>

  <div class="parties">
    <div class="partie">
      <div class="partie-label">Organisme mandant</div>
      <p><strong>${org.name ?? ''}</strong></p>
      ${org.siret ? `<p>SIRET : ${org.siret}</p>` : ''}
      ${org.nda_number ? `<p>NDA : ${org.nda_number}</p>` : ''}
      ${org.address ? `<p>${org.address}${org.city ? ', ' + org.city : ''}</p>` : ''}
      ${org.email ? `<p>${org.email}</p>` : ''}
    </div>
    <div class="partie">
      <div class="partie-label">Formateur missionnaire</div>
      <p><strong>${teacher.full_name}</strong></p>
      ${specialization ? `<p>Spécialité : ${specialization}</p>` : ''}
      <p>${teacher.email}</p>
    </div>
  </div>

  <div class="section">
    <h2>Article 1 — Objet de la mission</h2>
    <div class="highlight">
      <p style="font-weight:bold;font-size:11pt;margin-bottom:3mm;">${session.name || 'Session de formation'}</p>
      ${specialization ? `<p style="font-size:9.5pt;color:#555;">Domaine : ${specialization}</p>` : ''}
    </div>
    <p style="font-size:9.5pt;line-height:1.6;">
      Le missionnaire est autorisé à se déplacer pour réaliser la mission de formation définie ci-dessus, dans le cadre des activités de formation professionnelle continue de l'organisme (art. L.6313-1 et suivants du Code du Travail).
    </p>
  </div>

  <div class="section">
    <h2>Article 2 — Lieu, dates et durée</h2>
    <div class="grid2">
      <div class="grid2-label">Période</div>
      <div class="grid2-value">Du ${formatDate(session.period_start)} au ${formatDate(session.period_end)}</div>
      ${session.intervention_days != null ? `
      <div class="grid2-label">Durée</div>
      <div class="grid2-value">${session.intervention_days} jour${Number(session.intervention_days) > 1 ? 's' : ''} d'intervention</div>
      ` : ''}
      <div class="grid2-label">Transport autorisé</div>
      <div class="grid2-value">Véhicule personnel — Transport en commun — Train</div>
    </div>
  </div>

  <div class="section">
    <h2>Article 3 — Remboursement des frais professionnels</h2>
    <p style="font-size:9.5pt;line-height:1.6;margin-bottom:5mm;">
      Conformément à l'arrêté du 20 décembre 2002 relatif aux frais professionnels déductibles pour le calcul des cotisations de sécurité sociale et aux barèmes URSSAF en vigueur, les frais engagés sont remboursés dans les limites suivantes :
    </p>
    <table>
      <thead>
        <tr>
          <th style="width:45%">Nature des frais</th>
          <th style="width:35%;text-align:center">Base de remboursement</th>
          <th>Plafond</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Indemnités kilométriques (véhicule personnel)</td>
          <td style="text-align:center">Barème fiscal en vigueur (arrêté 27/03/2024)</td>
          <td>Selon puissance fiscale</td>
        </tr>
        <tr class="alt">
          <td>Repas du midi (hors résidence habituelle)</td>
          <td style="text-align:center">Sur justificatif — art. 4 arrêté 20/12/2002</td>
          <td>20,90 €</td>
        </tr>
        <tr>
          <td>Repas du soir (grand déplacement)</td>
          <td style="text-align:center">Sur justificatif — art. 4 arrêté 20/12/2002</td>
          <td>20,90 €</td>
        </tr>
        <tr class="alt">
          <td>Hébergement + petit-déjeuner (nuit complète)</td>
          <td style="text-align:center">Sur justificatif — plafond URSSAF</td>
          <td>70 € / 82,30 € (IdF)</td>
        </tr>
      </tbody>
    </table>
    <p class="note">
      Est considéré comme « grand déplacement » tout déplacement à plus de 50 km du domicile habituel ne pouvant donner lieu à retour quotidien (circ. DSS/SDFSS/5B du 7 janvier 2003). Justificatifs originaux à remettre sous 30 jours suivant la fin de la mission.
    </p>
    ${session.daily_rate != null ? `
    <p style="font-size:9.5pt;margin-top:4mm;">
      <strong>Honoraires de prestation :</strong> ${Number(session.daily_rate).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}/jour × ${session.intervention_days ?? '—'} jour(s) = <strong>${session.intervention_days != null ? (Number(session.daily_rate) * Number(session.intervention_days)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : '—'} HT</strong> (réglés selon convention de prestation séparée).
    </p>` : ''}
  </div>

  <div class="section">
    <h2>Article 4 — Obligations du missionnaire</h2>
    <ul>
      <li>Respecter le programme de formation et les horaires fixés ;</li>
      <li>Émarger les feuilles de présence à chaque séance (exigence Qualiopi — Indicateur 7 du RNQ) ;</li>
      <li>Signaler immédiatement tout incident ou modification affectant le déroulement de la mission ;</li>
      <li>Remettre l'intégralité des justificatifs originaux dans les 30 jours suivant la fin de la mission ;</li>
      <li>Respecter la confidentialité des données des stagiaires (RGPD — Règlement UE 2016/679) ;</li>
      <li>N'effectuer que les déplacements strictement nécessaires à l'exécution de la mission.</li>
    </ul>
  </div>

  <div class="section">
    <h2>Article 5 — Annulation et force majeure</h2>
    <p style="font-size:9.5pt;line-height:1.6;">
      En cas d'annulation ou de report, seuls les frais engagés et justifiés avant l'annulation sont remboursés. En cas de force majeure au sens de l'article 1218 du Code civil, le présent ordre de mission est suspendu sans pénalité, avec report éventuel sur accord des parties.
    </p>
  </div>

  <div class="signatures">
    <div class="sig-block">
      <p>Pour <strong>${org.name ?? "l'organisme"}</strong></p>
      <p style="font-size:8.5pt;color:#666">Nom, qualité et signature</p>
      <div class="sig-line"></div>
      <p class="sig-label">Fait à ${org.city ?? '____________'}, le ${today}</p>
    </div>
    <div class="sig-block">
      <p><strong>${teacher.full_name}</strong></p>
      <p style="font-size:8.5pt;color:#666">Lu et approuvé — Bon pour accord</p>
      <div class="sig-line"></div>
      <p class="sig-label">Fait à ____________, le ${today}</p>
    </div>
  </div>

  <p style="text-align:center;font-size:8pt;color:#888;margin-top:10mm;border-top:1px solid #eee;padding-top:3mm;">
    Ordre de mission ${ref} — ${org.name ?? ''} — ${today}
    ${org.siret ? ` — SIRET ${org.siret}` : ''}${org.nda_number ? ` — NDA ${org.nda_number}` : ''}
  </p>
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

    const body = await request.json() as OrdreMissionBody

    if (!body.teacher?.user_id || !body.session?.period_start || !body.session?.period_end) {
      return NextResponse.json({ error: 'Données incomplètes (enseignant, période requise)' }, { status: 400 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name, address, city, email, phone, siret, nda_number')
      .eq('id', userData.organization_id!)
      .single()

    const html = buildOrdreMissionHtml(body, org ?? {})

    if (isGotenbergConfigured()) {
      const pdfBuffer = await htmlToPdf(html, { format: 'A4', marginTop: '0.98in', marginBottom: '0.98in', marginLeft: '0.79in', marginRight: '0.79in' })
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ordre-mission-${body.teacher.full_name.replace(/\s+/g, '-')}.pdf"`,
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
      margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
    })
    await page.close()
    page = null

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ordre-mission-${body.teacher.full_name.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (error: unknown) {
    if (page) { try { await page.close() } catch {} }
    logger.error('Erreur génération ordre de mission', error)
    return NextResponse.json({ error: "Erreur lors de la génération de l'ordre de mission" }, { status: 500 })
  }
}
