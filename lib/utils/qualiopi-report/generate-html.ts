// Générateur HTML pour le rapport d'audit Qualiopi
// Destiné à être converti en PDF via Puppeteer

export type OrgInfo = {
  name: string
  address: string | null
  city: string | null
  siret: string | null
  nda_number: string | null
  logo_url: string | null
  email: string | null
  phone: string | null
}

export type EvidenceEntry = {
  indicator_number: number
  title: string
  description: string | null
  status: string | null
  confidence_score: number | null
  event_date: string | null
  entity_name: string | null
}

// ─── Référentiel statique ─────────────────────────────────────────────────────

const CRITERIA_META: {
  number: number
  label: string
  color: string
  indicators: [number, string, string][]
}[] = [
  {
    number: 1, label: 'Information du public', color: '#3B82F6',
    indicators: [
      [1,  '1.1', 'Information sur les prestations proposées'],
      [2,  '1.2', 'Indicateurs de résultats publiés'],
      [3,  '1.3', "Délais d'accès à la formation"],
    ],
  },
  {
    number: 2, label: 'Identification précise des objectifs', color: '#8B5CF6',
    indicators: [
      [4,  '2.1', 'Analyse du besoin du bénéficiaire'],
      [5,  '2.2', 'Définition des objectifs opérationnels'],
      [6,  '2.3', 'Contenu de la prestation'],
      [7,  '2.4', 'Adéquation contenus/objectifs'],
      [8,  '2.5', 'Positionnement initial et évaluation diagnostique'],
    ],
  },
  {
    number: 3, label: 'Adaptation aux publics bénéficiaires', color: '#0EA5E9',
    indicators: [
      [9,  '3.1', 'Conditions de déroulement de la prestation'],
      [10, '3.2', 'Adaptation de la prestation au bénéficiaire'],
      [11, '3.3', "Évaluation de l'atteinte des objectifs"],
      [12, '3.4', "Suivi de l'exécution et engagement des bénéficiaires"],
      [13, '3.5', 'Coordination des intervenants extérieurs et sous-traitants'],
      [14, '3.6', 'Exercice de la citoyenneté en apprentissage (CFA)'],
      [15, '3.7', 'Accompagnement socio-professionnel des apprentis (CFA)'],
      [16, '3.8', 'Accessibilité aux personnes en situation de handicap'],
    ],
  },
  {
    number: 4, label: 'Adéquation des moyens pédagogiques', color: '#10B981',
    indicators: [
      [17, '4.1', 'Moyens humains et techniques adaptés à la prestation'],
      [18, '4.2', 'Coordination pédagogique des alternants (CFA)'],
      [19, '4.3', 'Ressources pédagogiques mises à disposition des bénéficiaires'],
      [20, '4.4', "Personnel dédié à l'accompagnement handicap"],
    ],
  },
  {
    number: 5, label: 'Qualification et développement des formateurs', color: '#F59E0B',
    indicators: [
      [21, '5.1', 'Compétences et qualifications des intervenants'],
      [22, '5.2', 'Développement des compétences des intervenants'],
    ],
  },
  {
    number: 6, label: "Inscription dans l'environnement professionnel", color: '#EF4444',
    indicators: [
      [23, '6.1', 'Veille légale et réglementaire'],
      [24, '6.2', "Veille sur les mutations économiques et l'emploi"],
      [25, '6.3', 'Veille technologique et pédagogique'],
      [26, '6.4', "Mobilisation des acteurs de l'orientation et de l'emploi"],
      [27, '6.5', "Appartenance à un réseau de CFA (CFA)"],
      [28, '6.6', "Ingénierie de formation et d'ingénierie pédagogique"],
    ],
  },
  {
    number: 7, label: 'Recueil et prise en compte des appréciations', color: '#EC4899',
    indicators: [
      [29, '7.1', 'Modalités de recueil des appréciations des parties prenantes'],
      [30, '7.2', 'Traitement des réclamations des bénéficiaires et parties prenantes'],
      [31, '7.3', 'Mesures d\'amélioration mises en œuvre suite aux appréciations'],
      [32, '7.4', 'Amélioration continue de la prestation de formation'],
    ],
  },
]

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmt(date: string | null): string {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return date }
}

function statusChip(evidenceStatus: string | null): string {
  if (evidenceStatus === 'valid') {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:8pt;font-weight:600;background:#dcfce7;color:#166534;border:1px solid #86efac;">✓ Conforme</span>`
  }
  if (evidenceStatus === 'pending') {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:8pt;font-weight:600;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;">⏳ En cours</span>`
  }
  if (evidenceStatus === 'invalid') {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:8pt;font-weight:600;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">✗ Non conforme</span>`
  }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:8pt;font-weight:600;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;">— Non documenté</span>`
}

function confidenceBar(score: number | null): string {
  if (score == null) return ''
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'
  return `
    <div style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle;">
      <div style="width:60px;height:5px;border-radius:3px;background:#e2e8f0;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
      </div>
      <span style="font-size:8pt;color:#64748b;">${pct}%</span>
    </div>`
}

function evidenceRow(e: EvidenceEntry): string {
  return `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <div style="font-size:8.5pt;font-weight:600;color:#1e293b;line-height:1.3;">${esc(e.title)}</div>
        ${e.entity_name ? `<div style="font-size:7.5pt;color:#94a3b8;margin-top:1px;">${esc(e.entity_name)}</div>` : ''}
        ${e.description ? `<div style="font-size:8pt;color:#475569;margin-top:3px;line-height:1.4;">${esc(e.description)}</div>` : ''}
      </td>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;white-space:nowrap;vertical-align:top;text-align:center;">${statusChip(e.status)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;white-space:nowrap;vertical-align:top;text-align:center;">${confidenceBar(e.confidence_score)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;white-space:nowrap;vertical-align:top;text-align:right;font-size:8pt;color:#94a3b8;">${fmt(e.event_date)}</td>
    </tr>`
}

// ─── Calcul statut par indicateur (depuis les preuves) ───────────────────────

function indicatorDisplayStatus(refNum: number, evidence: EvidenceEntry[]): 'valid' | 'pending' | 'none' {
  const entries = evidence.filter((e) => e.indicator_number === refNum)
  if (entries.length === 0) return 'none'
  if (entries.some((e) => e.status === 'valid')) return 'valid'
  return 'pending'
}

function indicatorChip(status: 'valid' | 'pending' | 'none'): string {
  if (status === 'valid')   return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:8pt;font-weight:600;background:#dcfce7;color:#166534;border:1px solid #86efac;">✓ Conforme</span>`
  if (status === 'pending') return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:8pt;font-weight:600;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;">⏳ En cours</span>`
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:8pt;font-weight:600;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;">— Non documenté</span>`
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function criterionSection(
  crit: (typeof CRITERIA_META)[number],
  evidence: EvidenceEntry[]
): string {
  const indicators = crit.indicators
  const validCount = indicators.filter(([ref]) => indicatorDisplayStatus(ref, evidence) === 'valid').length
  const total = indicators.length
  const rate  = total > 0 ? Math.round((validCount / total) * 100) : 0

  const indRows = indicators.map(([ref, code, label]) => {
    const status    = indicatorDisplayStatus(ref, evidence)
    const entries   = evidence.filter((e) => e.indicator_number === ref).slice(0, 4)

    return `
      <div style="margin-bottom:16px;">
        <!-- Indicator header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-left:3px solid ${crit.color};border-radius:0 6px 6px 0;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${crit.color};color:white;font-size:8pt;font-weight:700;flex-shrink:0;">${code}</span>
            <span style="font-size:9pt;font-weight:600;color:#1e293b;">${esc(label)}</span>
          </div>
          ${indicatorChip(status)}
        </div>
        <!-- Evidence table -->
        ${entries.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:5px 10px;text-align:left;font-size:7.5pt;font-weight:600;color:#94a3b8;border-bottom:1px solid #e2e8f0;">PREUVE</th>
              <th style="padding:5px 10px;text-align:center;font-size:7.5pt;font-weight:600;color:#94a3b8;border-bottom:1px solid #e2e8f0;white-space:nowrap;">STATUT</th>
              <th style="padding:5px 10px;text-align:center;font-size:7.5pt;font-weight:600;color:#94a3b8;border-bottom:1px solid #e2e8f0;white-space:nowrap;">SCORE</th>
              <th style="padding:5px 10px;text-align:right;font-size:7.5pt;font-weight:600;color:#94a3b8;border-bottom:1px solid #e2e8f0;white-space:nowrap;">DATE</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(evidenceRow).join('')}
          </tbody>
        </table>` : `
        <div style="padding:8px 12px;font-size:8pt;color:#94a3b8;font-style:italic;background:#fafafa;border-radius:6px;">
          Aucune preuve automatique — à documenter manuellement.
        </div>`}
      </div>`
  }).join('')

  return `
    <div style="page-break-before:always;padding:0 0 24px 0;">
      <!-- Criterion header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:${crit.color};color:white;border-radius:10px;margin-bottom:20px;">
        <div>
          <div style="font-size:9pt;letter-spacing:1px;opacity:0.85;margin-bottom:4px;">CRITÈRE ${crit.number}</div>
          <div style="font-size:14pt;font-weight:700;">${esc(crit.label)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:22pt;font-weight:800;">${validCount}/${total}</div>
          <div style="font-size:9pt;opacity:0.85;">${rate}% conforme</div>
        </div>
      </div>
      ${indRows}
    </div>`
}

function summaryTable(evidence: EvidenceEntry[], date: string): string {
  const totalValid = CRITERIA_META.reduce((acc, c) => {
    return acc + c.indicators.filter(([ref]) => indicatorDisplayStatus(ref, evidence) === 'valid').length
  }, 0)
  const globalRate = Math.round((totalValid / 32) * 100)

  const rows = CRITERIA_META.map((c) => {
    const validN  = c.indicators.filter(([ref]) => indicatorDisplayStatus(ref, evidence) === 'valid').length
    const pendN   = c.indicators.filter(([ref]) => indicatorDisplayStatus(ref, evidence) === 'pending').length
    const total   = c.indicators.length
    const rate    = Math.round((validN / total) * 100)
    const rateColor = rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'

    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${c.color};color:white;font-size:8pt;font-weight:700;margin-right:8px;">${c.number}</span>
          <span style="font-size:9pt;font-weight:600;color:#1e293b;">${esc(c.label)}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:9pt;">
          <span style="color:#16a34a;font-weight:700;">${validN}</span>
          <span style="color:#94a3b8;"> / ${total}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:9pt;color:#d97706;">${pendN}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">
          <span style="font-size:10pt;font-weight:800;color:${rateColor};">${rate}%</span>
        </td>
      </tr>`
  }).join('')

  return `
    <div style="padding:0 0 24px 0;">
      <h2 style="font-size:13pt;font-weight:700;color:#274472;margin-bottom:16px;">Tableau de synthèse</h2>
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px;padding:16px 20px;background:#f0f7ff;border-radius:10px;border:1px solid #bfdbfe;">
        <div style="text-align:center;">
          <div style="font-size:28pt;font-weight:900;color:#274472;">${globalRate}%</div>
          <div style="font-size:9pt;color:#64748b;">Score global</div>
        </div>
        <div style="flex:1;padding-left:20px;border-left:2px solid #bfdbfe;">
          <div style="font-size:9pt;color:#475569;margin-bottom:6px;">
            <strong style="color:#274472;">${totalValid}/32</strong> indicateurs conformes sur l'ensemble des 7 critères
          </div>
          <div style="font-size:8.5pt;color:#64748b;">Rapport généré le ${date}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;font-size:8pt;font-weight:600;color:#94a3b8;border-bottom:2px solid #e2e8f0;">CRITÈRE</th>
            <th style="padding:8px 12px;text-align:center;font-size:8pt;font-weight:600;color:#94a3b8;border-bottom:2px solid #e2e8f0;">CONFORMES</th>
            <th style="padding:8px 12px;text-align:center;font-size:8pt;font-weight:600;color:#94a3b8;border-bottom:2px solid #e2e8f0;">EN COURS</th>
            <th style="padding:8px 12px;text-align:right;font-size:8pt;font-weight:600;color:#94a3b8;border-bottom:2px solid #e2e8f0;">TAUX</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#f8fafc;">
            <td style="padding:8px 12px;font-size:9pt;font-weight:700;color:#274472;">Total</td>
            <td style="padding:8px 12px;text-align:center;font-size:9pt;font-weight:700;color:#16a34a;">${totalValid}/32</td>
            <td style="padding:8px 12px;text-align:center;font-size:9pt;color:#64748b;">—</td>
            <td style="padding:8px 12px;text-align:right;font-size:11pt;font-weight:900;color:${globalRate >= 80 ? '#16a34a' : globalRate >= 50 ? '#d97706' : '#dc2626'};">${globalRate}%</td>
          </tr>
        </tfoot>
      </table>
    </div>`
}

function coverPage(org: OrgInfo, date: string, totalValid: number): string {
  const rate = Math.round((totalValid / 32) * 100)
  const rateColor = rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'

  return `
    <div style="min-height:100vh;display:flex;flex-direction:column;background:linear-gradient(145deg,#1a2f50 0%,#274472 60%,#2c5282 100%);color:white;position:relative;">
      <!-- Top bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:28px 40px;">
        ${org.logo_url
          ? `<img src="${esc(org.logo_url)}" alt="Logo" style="max-height:52px;max-width:160px;object-fit:contain;filter:brightness(0) invert(1);" />`
          : `<div style="font-size:11pt;font-weight:700;opacity:0.9;">${esc(org.name)}</div>`
        }
        <div style="text-align:right;font-size:8.5pt;opacity:0.7;">
          <div>DOCUMENT CONFIDENTIEL</div>
          <div>${date}</div>
        </div>
      </div>

      <!-- Center content -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 60px 40px;">
        <div style="font-size:9pt;letter-spacing:4px;opacity:0.6;margin-bottom:14px;text-transform:uppercase;">Rapport d'audit interne</div>
        <div style="font-size:32pt;font-weight:900;letter-spacing:-0.5px;line-height:1.1;margin-bottom:8px;">Certification</div>
        <div style="font-size:32pt;font-weight:900;color:#93c5fd;letter-spacing:3px;margin-bottom:36px;">QUALIOPI</div>

        <div style="border-top:1px solid rgba(255,255,255,0.2);border-bottom:1px solid rgba(255,255,255,0.2);padding:24px 48px;margin-bottom:36px;">
          <div style="font-size:18pt;font-weight:700;margin-bottom:4px;">${esc(org.name)}</div>
          ${org.siret ? `<div style="font-size:9pt;opacity:0.7;">SIRET : ${esc(org.siret)}</div>` : ''}
          ${org.nda_number ? `<div style="font-size:9pt;opacity:0.7;">N° de déclaration d'activité : ${esc(org.nda_number)}</div>` : ''}
        </div>

        <!-- Score global -->
        <div style="display:flex;align-items:center;gap:24px;padding:20px 40px;background:rgba(255,255,255,0.08);border-radius:14px;border:1px solid rgba(255,255,255,0.15);">
          <div style="text-align:center;">
            <div style="font-size:42pt;font-weight:900;color:${rate >= 80 ? '#86efac' : rate >= 50 ? '#fcd34d' : '#fca5a5'};">${rate}%</div>
            <div style="font-size:8.5pt;opacity:0.7;letter-spacing:1px;text-transform:uppercase;">Score de conformité</div>
          </div>
          <div style="width:1px;height:60px;background:rgba(255,255,255,0.2);"></div>
          <div style="text-align:center;">
            <div style="font-size:42pt;font-weight:900;">${totalValid}<span style="font-size:20pt;opacity:0.6;">/32</span></div>
            <div style="font-size:8.5pt;opacity:0.7;letter-spacing:1px;text-transform:uppercase;">Indicateurs conformes</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.15);display:flex;justify-content:space-between;align-items:center;font-size:8pt;opacity:0.6;">
        <div>${org.email ? esc(org.email) : ''}</div>
        <div>Généré par EDUZEN — ${date}</div>
      </div>
    </div>`
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function generateQualiopiReportHtml(
  org: OrgInfo,
  evidence: EvidenceEntry[]
): string {
  const date      = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const totalValid = CRITERIA_META.reduce((acc, c) =>
    acc + c.indicators.filter(([ref]) => indicatorDisplayStatus(ref, evidence) === 'valid').length, 0
  )

  const criteriaSections = CRITERIA_META.map((c) => criterionSection(c, evidence)).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rapport Qualiopi — ${esc(org.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a1a; background: white; }
    @page { size: A4; margin: 18mm 16mm; }
    @page :first { margin: 0; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <!-- Page 1 : Couverture (pas de marges) -->
  ${coverPage(org, date, totalValid)}

  <!-- Page 2 : Synthèse -->
  <div style="padding: 32px 0;">
    ${summaryTable(evidence, date)}
  </div>

  <!-- Pages 3+ : Critères détaillés -->
  ${criteriaSections}

  <!-- Page finale : Notice -->
  <div style="page-break-before:always;padding:32px 0;">
    <h2 style="font-size:13pt;font-weight:700;color:#274472;margin-bottom:16px;">Modalités de lecture du rapport</h2>
    <div style="font-size:9pt;color:#475569;line-height:1.7;space-y:12px;">
      <p style="margin-bottom:12px;">
        Ce rapport synthétise les preuves automatiquement collectées par EDUZEN pour chacun des 32 indicateurs du référentiel Qualiopi
        (Décret n° 2019-564 du 6 juin 2019).
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">
        <div style="padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <div style="font-weight:700;margin-bottom:6px;">Statuts des indicateurs</div>
          <div style="margin-bottom:4px;"><span style="background:#dcfce7;color:#166534;border:1px solid #86efac;padding:1px 8px;border-radius:99px;font-size:8pt;">✓ Conforme</span> — Preuve documentée et validée</div>
          <div style="margin-bottom:4px;"><span style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:1px 8px;border-radius:99px;font-size:8pt;">⏳ En cours</span> — Preuve partielle ou à compléter</div>
          <div><span style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;padding:1px 8px;border-radius:99px;font-size:8pt;">— Non documenté</span> — Aucune preuve enregistrée</div>
        </div>
        <div style="padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <div style="font-weight:700;margin-bottom:6px;">Score de confiance</div>
          <p>Le score (0-100%) indique le niveau de complétude de la preuve automatique.
          Un score de 100% signifie que toutes les données requises sont présentes.</p>
        </div>
      </div>
      <p style="font-size:8pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:16px;">
        Ce document est généré automatiquement à partir des données enregistrées dans EDUZEN.
        Il ne constitue pas un rapport d'audit certifié et doit être complété par les preuves manuelles
        (comptes-rendus, PV de réunion, pièces justificatives) avant toute présentation à un organisme certificateur.
      </p>
    </div>
  </div>
</body>
</html>`
}
