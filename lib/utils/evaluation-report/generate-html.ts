/**
 * HTML du « Rapport qualité » (PDF A4) — rendu par Gotenberg ou Puppeteer.
 * Pas de JavaScript : les graphiques sont des SVG / CSS statiques, avec les
 * mêmes couleurs que l'écran (components/evaluations/analytics/chart-colors).
 */

import type {
  AttentionPoint,
  BeforeAfterComparison,
  EvaluationAnalytics,
  QuestionStats,
  TemplateStats,
} from '@/lib/services/evaluation-analytics'
import {
  AFTER_COLOR,
  BEFORE_COLOR,
  CHART_GRID,
  CHART_TRACK,
  levelColor,
  NEUTRAL_COLOR,
  SERIES_COLORS,
} from '@/components/evaluations/analytics/chart-colors'

export interface EvaluationReportData {
  organization: { name: string | null; logo_url: string | null }
  session: { name: string; start_date: string | null; end_date: string | null }
  formation: { name: string | null } | null
  /** Libellé du lot quand le rapport est restreint (sujet · type · date) */
  batchLabel: string | null
  analytics: EvaluationAnalytics
  attentionPoints: AttentionPoint[]
  beforeAfter: BeforeAfterComparison
  generatedAt: Date
}

function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function score(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

function toneColor(value: number | null): string {
  if (value === null) return '#9ca3af'
  if (value >= 8) return '#16a34a'
  if (value >= 6) return '#d97706'
  return '#dc2626'
}

function scoreBar(value: number | null): string {
  const width = value === null ? 0 : value * 10
  return `<div class="bar"><div style="width:${width}%;background:${toneColor(value)}"></div></div>`
}

// ── Graphiques SVG ───────────────────────────────────────────────────────────

function ringSvg(rate: number, label: string, respondents: number, assigned: number): string {
  const size = 70
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const filled = (rate / 100) * c
  return `
    <div class="ring">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${CHART_TRACK}" stroke-width="${stroke}"/>
        ${respondents > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${SERIES_COLORS[0]}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${filled} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
        <text x="50%" y="46%" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">${respondents}/${assigned}</text>
        <text x="50%" y="64%" text-anchor="middle" font-size="9" fill="#6b7280">${rate} %</text>
      </svg>
      <div class="ring-label">${esc(label)}</div>
    </div>`
}

/** Coupe un libellé en 2 lignes max (~20 caractères) pour les axes du radar */
function wrapLabel(label: string, max = 20): string[] {
  const words = label.split(/\s+/)
  const lines: string[] = ['']
  for (const w of words) {
    const current = lines[lines.length - 1]
    if (current && (current + ' ' + w).length > max) {
      if (lines.length === 2) {
        lines[1] = `${lines[1]}…`
        break
      }
      lines.push(w)
    } else {
      lines[lines.length - 1] = current ? `${current} ${w}` : w
    }
  }
  return lines
}

function radarSvg(points: { name: string; score10: number }[]): string {
  const width = 460
  const height = 300
  const cx = width / 2
  const cy = height / 2
  const radius = 105
  const n = points.length
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n
  const at = (i: number, value: number) => {
    const rr = (value / 10) * radius
    return [cx + rr * Math.cos(angle(i)), cy + rr * Math.sin(angle(i))]
  }

  const rings = [2, 4, 6, 8, 10]
    .map((v) => `<polygon points="${points.map((_, i) => at(i, v).join(',')).join(' ')}" fill="none" stroke="${CHART_GRID}" stroke-width="1"/>`)
    .join('')
  const spokes = points
    .map((_, i) => {
      const [x, y] = at(i, 10)
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${CHART_GRID}" stroke-width="1"/>`
    })
    .join('')
  const shape = points.map((p, i) => at(i, p.score10).join(',')).join(' ')
  const dots = points
    .map((p, i) => {
      const [x, y] = at(i, p.score10)
      return `<circle cx="${x}" cy="${y}" r="4" fill="${SERIES_COLORS[0]}" stroke="#fff" stroke-width="2"/>`
    })
    .join('')
  const labels = points
    .map((p, i) => {
      const [x, y] = at(i, 11.4)
      const cos = Math.cos(angle(i))
      const sin = Math.sin(angle(i))
      const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end'
      const lines = [...wrapLabel(p.name), `${p.score10.toFixed(1)}`]
      // Au-dessus du radar, le bloc remonte ; en dessous, il descend
      const lineHeight = 11
      const startY = sin < -0.2 ? y - (lines.length - 1) * lineHeight : sin > 0.2 ? y : y - ((lines.length - 1) * lineHeight) / 2
      return `<text x="${x}" y="${startY}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10" fill="#374151">${lines
        .map((l, li) => `<tspan x="${x}" dy="${li === 0 ? 0 : lineHeight}"${li === lines.length - 1 ? ' font-weight="700"' : ''}>${esc(l)}</tspan>`)
        .join('')}</text>`
    })
    .join('')

  return `
    <svg width="100%" height="260" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      ${rings}${spokes}
      <polygon points="${shape}" fill="${SERIES_COLORS[0]}" fill-opacity="0.18" stroke="${SERIES_COLORS[0]}" stroke-width="2"/>
      ${dots}${labels}
    </svg>`
}

function stackedBar(q: QuestionStats): string {
  if (q.kind !== 'rating' && q.kind !== 'choice') return ''
  const segments = q.distribution
    .filter((d) => d.count > 0)
    .map((d) => `<div style="width:${(d.count / q.respondents) * 100}%;background:${levelColor(d.starValue)}"></div>`)
    .join('')
  const legend = q.distribution
    .filter((d) => d.count > 0)
    .map((d) => `<span><i style="background:${levelColor(d.starValue)}"></i>${esc(q.kind === 'rating' ? `${d.label} ★` : d.label)} : ${d.count} (${d.percent} %)</span>`)
    .join('')
  return `<div class="stack">${segments}</div><div class="legend">${legend}</div>`
}

function distributionList(q: QuestionStats): string {
  if (q.kind !== 'choice' && q.kind !== 'boolean') return ''
  return `<table class="dist">${q.distribution
    .map((d) => {
      const color = d.isCorrect ? '#16a34a' : NEUTRAL_COLOR
      return `<tr>
        <td class="dist-label">${d.isCorrect ? '✓ ' : ''}${esc(d.label)}</td>
        <td class="dist-bar"><div class="bar"><div style="width:${d.percent}%;background:${color}"></div></div></td>
        <td class="dist-val">${d.count} · ${d.percent} %</td>
      </tr>`
    })
    .join('')}</table>`
}

// ── Blocs ────────────────────────────────────────────────────────────────────

function questionBlock(q: QuestionStats): string {
  const header = `<div class="q-head"><p class="q-text">${esc(q.text)}</p>${
    q.score10 !== null ? `<span class="q-score" style="color:${toneColor(q.score10)}">${score(q.score10)}<small>/10</small></span>` : ''
  }</div>`

  if (q.respondents === 0) return `<div class="q">${header}<p class="muted">Aucune réponse.</p></div>`

  let body = ''
  if (q.kind === 'rating') {
    body = `<p class="muted">Moyenne ${q.average?.toFixed(1)}/5 · ${q.respondents} votant${q.respondents > 1 ? 's' : ''}</p>${stackedBar(q)}`
  } else if (q.kind === 'choice' && q.isScale) {
    body = `<p class="muted">${q.respondents} réponse${q.respondents > 1 ? 's' : ''}</p>${stackedBar(q)}`
  } else if (q.kind === 'choice' || q.kind === 'boolean') {
    const quiz = q.kind === 'choice' && q.correctPercent !== null ? ` · <strong>${q.correctPercent} % de bonnes réponses</strong>` : ''
    body = `<p class="muted">${q.respondents} réponse${q.respondents > 1 ? 's' : ''}${quiz}</p>${distributionList(q)}`
  } else {
    body = `<div class="verbatims">${q.answers
      .map((a) => `<div class="verbatim"><strong>${esc(a.studentName)}</strong><p>${esc(a.answer)}</p></div>`)
      .join('')}</div>`
  }
  return `<div class="q">${header}${body}</div>`
}

function templateBlock(template: TemplateStats, showName: boolean): string {
  const radar = template.sections
    .filter((s) => s.name && s.score10 !== null)
    .map((s) => ({ name: s.name as string, score10: s.score10 as number }))

  const sections = template.sections
    .map((s) => {
      const head = s.name
        ? `<div class="section-head"><h4>${esc(s.name)}</h4>${
            s.score10 !== null ? `<div class="section-score">${scoreBar(s.score10)}<span style="color:${toneColor(s.score10)}">${score(s.score10)}/10</span></div>` : ''
          }</div>`
        : ''
      return `<div class="section">${head}${s.questions.map(questionBlock).join('')}</div>`
    })
    .join('')

  return `
    ${showName ? `<p class="template-name">${esc(template.name)} · ${template.respondents} réponse${template.respondents > 1 ? 's' : ''}</p>` : ''}
    ${radar.length >= 3 && template.respondents > 0 ? `<div class="card avoid-break"><h3>Notes par rubrique</h3>${radarSvg(radar)}</div>` : ''}
    ${sections}`
}

function attentionBlock(points: AttentionPoint[], hasResponses: boolean): string {
  if (!hasResponses) return ''
  if (points.length === 0) {
    return `<div class="card ok">✓ Aucun point d'attention : toutes les notes sont au-dessus de 7/10.</div>`
  }
  return `<div class="card attention avoid-break">
    <h3>Points d'attention (${points.length})</h3>
    <ul>${points
      .map(
        (p) => `<li class="${p.level}"><span class="tag">${p.level === 'critical' ? 'Critique' : 'À surveiller'}</span>
          <span><strong>${esc(p.label)}</strong><br/><small>${esc(p.typeLabel)} · ${esc(p.detail)}</small></span></li>`
      )
      .join('')}</ul>
  </div>`
}

function beforeAfterBlock(c: BeforeAfterComparison): string {
  if (!c.hasBefore || !c.hasAfter || c.pairs.length === 0) return ''
  const delta = (v: number) => `<span style="color:${v >= 0 ? '#15803d' : '#b91c1c'};font-weight:700">${v >= 0 ? '+' : ''}${v.toFixed(1)}</span>`
  const bar = (v: number, color: string) => `<div class="bar"><div style="width:${v * 10}%;background:${color}"></div></div>`
  return `<div class="card avoid-break">
    <h3>Avant / après formation ${c.averageDelta !== null ? `<span class="right">Progression moyenne ${delta(c.averageDelta)} pts</span>` : ''}</h3>
    <div class="legend"><span><i style="background:${BEFORE_COLOR}"></i>Avant (préformation)</span><span><i style="background:${AFTER_COLOR}"></i>Après</span></div>
    <table class="ba">${c.pairs
      .map(
        (p) => `<tr>
          <td class="ba-label">${esc(p.label)}<br/><small>${p.matchedBy === 'section' ? 'Rubrique' : 'Question'} · ${esc(p.afterTypeLabel)}</small></td>
          <td class="ba-bars">${bar(p.before10, BEFORE_COLOR)}${bar(p.after10, AFTER_COLOR)}</td>
          <td class="ba-val">${p.before10.toFixed(1)} → ${p.after10.toFixed(1)}<br/>${delta(p.delta)}</td>
        </tr>`
      )
      .join('')}</table>
  </div>`
}

// ── Document ─────────────────────────────────────────────────────────────────

export function generateEvaluationReportHtml(data: EvaluationReportData): string {
  const { analytics } = data
  const dates = [fmtDate(data.session.start_date), fmtDate(data.session.end_date)].filter(Boolean).join(' → ')

  const summary = analytics.types
    .map((t) => {
      const rows: string[] = []
      for (const template of t.templates) {
        for (const s of template.sections) {
          if (s.name) {
            if (s.score10 !== null) rows.push(`<div class="row"><span>${esc(s.name)} <b style="color:${toneColor(s.score10)}">${score(s.score10)}</b></span>${scoreBar(s.score10)}</div>`)
          } else {
            for (const q of s.questions) {
              if (q.score10 !== null) rows.push(`<div class="row"><span>${esc(q.text)} <b style="color:${toneColor(q.score10)}">${score(q.score10)}</b></span>${scoreBar(q.score10)}</div>`)
            }
          }
        }
      }
      return `<div class="type-summary"><div class="type-head"><span>${esc(t.label)}</span><span>${score(t.score10)}</span></div>${
        rows.join('') || `<p class="muted">${t.respondents === 0 ? 'Aucune réponse.' : 'Aucune question notée.'}</p>`
      }</div>`
    })
    .join('')

  const details = analytics.types
    .map(
      (t) => `<section class="type">
        <h2>${esc(t.label)}</h2>
        ${t.templates.length === 0 ? '<p class="muted">Pas de questionnaire associé.</p>' : t.templates.map((tpl) => templateBlock(tpl, t.templates.length > 1)).join('')}
      </section>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Rapport qualité — ${esc(data.session.name)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 10.5px; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-size: 20px; margin: 0; }
  h2 { font-size: 14px; text-transform: uppercase; color: #6d28d9; margin: 18px 0 8px; }
  h3 { font-size: 12px; margin: 0 0 8px; }
  h4 { font-size: 11px; margin: 0; }
  small, .muted { color: #6b7280; }
  .muted { margin: 2px 0 6px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
  .header img { max-height: 42px; max-width: 140px; }
  .meta { color: #4b5563; margin-top: 4px; line-height: 1.5; }
  .overview { display: flex; gap: 20px; }
  .overview-left { width: 190px; flex-shrink: 0; }
  .big-score { font-size: 54px; font-weight: 700; line-height: 1; }
  .big-score small { font-size: 18px; }
  .rings { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .ring { width: 84px; text-align: center; }
  .ring-label { font-size: 9px; color: #4b5563; line-height: 1.2; }
  .overview-right { flex: 1; }
  .type-summary { border-top: 2px solid #111827; padding-top: 5px; margin-bottom: 12px; }
  .type-head { display: flex; justify-content: space-between; font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 4px; }
  .row { margin-bottom: 4px; }
  .row b { margin-left: 6px; }
  .bar { height: 6px; background: ${CHART_TRACK}; border-radius: 4px; overflow: hidden; margin: 2px 0; }
  .bar > div { height: 100%; border-radius: 4px; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; margin: 12px 0; }
  .card .right { float: right; font-weight: 400; }
  .ok { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
  .attention { background: #fffbeb; border-color: #fde68a; }
  .attention ul { list-style: none; padding: 0; margin: 0; }
  .attention li { display: flex; gap: 8px; align-items: flex-start; padding: 4px 0; border-top: 1px solid #fde68a; }
  .attention li:first-child { border-top: 0; }
  .tag { font-size: 8.5px; font-weight: 700; text-transform: uppercase; padding: 2px 5px; border-radius: 4px; white-space: nowrap; }
  .critical .tag { background: #fee2e2; color: #b91c1c; }
  .warning .tag { background: #fef3c7; color: #b45309; }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 9px; color: #4b5563; margin: 4px 0; }
  .legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
  .stack { display: flex; gap: 2px; height: 12px; border-radius: 4px; overflow: hidden; background: #f3f4f6; }
  .stack > div { height: 100%; }
  .ba, .dist { width: 100%; border-collapse: collapse; }
  .ba td, .dist td { padding: 3px 4px; vertical-align: middle; }
  .ba-label { width: 45%; }
  .ba-bars { width: 35%; }
  .ba-val { width: 20%; text-align: right; white-space: nowrap; }
  .dist-label { width: 40%; text-align: right; color: #374151; }
  .dist-bar { width: 40%; }
  .dist-val { width: 20%; white-space: nowrap; color: #4b5563; }
  .template-name { font-weight: 700; color: #374151; }
  .section { margin-bottom: 8px; }
  .section-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; margin: 10px 0 6px; }
  .section-score { display: flex; align-items: center; gap: 8px; width: 180px; }
  .section-score .bar { flex: 1; }
  .section-score span { font-weight: 700; white-space: nowrap; }
  .q { border: 1px solid #e5e7eb; border-radius: 8px; padding: 7px 10px; margin-bottom: 6px; page-break-inside: avoid; }
  .q-head { display: flex; justify-content: space-between; gap: 10px; }
  .q-text { font-weight: 700; margin: 0 0 2px; }
  .q-score { font-weight: 700; font-size: 13px; white-space: nowrap; }
  .q-score small { font-size: 9px; color: #6b7280; }
  .verbatims { columns: 2; column-gap: 8px; }
  .verbatim { break-inside: avoid; border-left: 3px solid #ddd6fe; padding: 2px 6px; margin-bottom: 5px; }
  .verbatim p { margin: 1px 0 0; color: #4c1d95; white-space: pre-line; }
  .avoid-break { page-break-inside: avoid; }
  .footer { margin-top: 16px; color: #9ca3af; font-size: 8.5px; text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Rapport qualité</h1>
      <div class="meta">
        <strong>${esc(data.session.name)}</strong><br/>
        ${data.formation?.name ? `${esc(data.formation.name)}<br/>` : ''}
        ${dates ? `${esc(dates)}<br/>` : ''}
        ${data.batchLabel ? `Lot : ${esc(data.batchLabel)}` : ''}
      </div>
    </div>
    <div style="text-align:right">
      ${data.organization.logo_url ? `<img src="${esc(data.organization.logo_url)}" alt=""/><br/>` : ''}
      <strong>${esc(data.organization.name)}</strong>
    </div>
  </div>

  <div class="overview avoid-break">
    <div class="overview-left">
      <div class="big-score" style="color:${toneColor(analytics.overallScore10)}">${score(analytics.overallScore10)} <small>/ 10</small></div>
      <p class="muted">${analytics.totalRespondents} réponse${analytics.totalRespondents > 1 ? 's' : ''} sur ${analytics.totalAssigned} évaluation${analytics.totalAssigned > 1 ? 's' : ''}</p>
      <div class="rings">${analytics.types.map((t) => ringSvg(t.responseRate, t.label, t.respondents, t.assigned)).join('')}</div>
    </div>
    <div class="overview-right">${summary}</div>
  </div>

  ${attentionBlock(data.attentionPoints, analytics.totalRespondents > 0)}
  ${beforeAfterBlock(data.beforeAfter)}
  ${details}

  <div class="footer">Généré le ${data.generatedAt.toLocaleDateString('fr-FR')} à ${data.generatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
</body>
</html>`
}
