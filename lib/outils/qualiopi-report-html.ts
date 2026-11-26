/**
 * Rapport d'auto-évaluation Qualiopi envoyé par email (outil gratuit) :
 * score global, score par critère et plan d'action indicateur par indicateur.
 */

import { EDUZEN_MENTION, QUALIOPI_ANSWER_LABELS } from '@/lib/outils/tools'
import { scoreVerdict, type QualiopiScore } from '@/lib/outils/qualiopi-score'

function esc(value: string | null | undefined): string {
  return (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function scoreColor(score: number | null): string {
  if (score === null) return '#9ca3af'
  if (score >= 90) return '#059669'
  if (score >= 70) return '#2563eb'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

export function buildQualiopiReportHtml(input: { organizationName: string; date: string; result: QualiopiScore }): string {
  const { organizationName, date, result } = input
  const color = scoreColor(result.score)

  const criteriaRows = result.criteria
    .map((c) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">Critère ${c.number} — ${esc(c.name)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;width:170px;">
          <div style="background:#f3f4f6;border-radius:4px;height:10px;width:120px;display:inline-block;vertical-align:middle;">
            <div style="background:${scoreColor(c.score)};height:10px;border-radius:4px;width:${c.score ?? 0}%;"></div>
          </div>
          <strong style="margin-left:6px;">${c.score === null ? '—' : `${c.score}%`}</strong>
        </td>
      </tr>`)
    .join('')

  const actions = result.toImprove.length
    ? result.toImprove
        .map((i) => `
      <div style="border-left:3px solid ${i.answer === 'non' ? '#dc2626' : '#d97706'};padding:6px 10px;margin:0 0 8px 0;page-break-inside:avoid;">
        <p style="margin:0;font-weight:bold;">Indicateur ${i.number} — ${esc(i.name)} <span style="font-weight:normal;color:#6b7280;">(${QUALIOPI_ANSWER_LABELS[i.answer]})</span></p>
        <p style="margin:2px 0 0 0;color:#374151;">${esc(i.description)}</p>
        ${i.methodology ? `<p style="margin:4px 0 0 0;color:#1f2937;"><em>À faire :</em> ${esc(i.methodology)}</p>` : ''}
      </div>`)
        .join('')
    : '<p>Aucun indicateur à travailler : vous déclarez être conforme sur l’ensemble du référentiel.</p>'

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Auto-évaluation Qualiopi</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111827; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 4px 0; }
  h2 { font-size: 12pt; margin: 18px 0 8px 0; color: #1f2937; }
  table { border-collapse: collapse; width: 100%; }
</style></head>
<body>
  <h1>Auto-évaluation Qualiopi</h1>
  <p style="margin:0;color:#6b7280;">${esc(organizationName)} — ${esc(date)}</p>

  <div style="margin:16px 0;padding:14px;border:1px solid #e5e7eb;border-radius:8px;">
    <span style="font-size:30pt;font-weight:bold;color:${color};">${result.score === null ? '—' : `${result.score}%`}</span>
    <span style="font-size:12pt;margin-left:10px;">${esc(scoreVerdict(result.score))}</span>
    <p style="margin:6px 0 0 0;color:#6b7280;">
      ${result.counts.oui} conforme(s) · ${result.counts.partiel} en partie · ${result.counts.non} non conforme(s) · ${result.counts.na} non concerné(s), sur les 32 indicateurs du Référentiel national qualité.
    </p>
  </div>

  <h2>Score par critère</h2>
  <table>${criteriaRows}</table>

  <h2>Votre plan d'action</h2>
  ${actions}

  <div style="margin-top:18px;padding:12px;background:#eff6ff;border-radius:8px;page-break-inside:avoid;">
    <p style="margin:0;font-weight:bold;">Préparer l'audit sans y passer vos soirées</p>
    <p style="margin:4px 0 0 0;">EduZen centralise automatiquement vos preuves Qualiopi (émargements, évaluations, conventions, réclamations) indicateur par indicateur. Essai gratuit de 14 jours sur eduzen.io.</p>
  </div>

  <p style="margin-top:14px;font-size:8pt;color:#9ca3af;text-align:center;">
    Auto-évaluation indicative fondée sur vos réponses ; elle ne remplace pas l'audit d'un organisme certificateur. ${esc(EDUZEN_MENTION)}
  </p>
</body></html>`
}
