/**
 * Couleurs des graphiques « Suivi qualité » — un seul système partout
 * (écran et rapport PDF).
 *
 * - Niveaux (étoiles / Totalement…Pas du tout) : échelle divergente
 *   bleu ↔ rouge avec un gris neutre au milieu. Chaque bras est validé
 *   (une teinte, luminosité monotone, extrémité claire ≥ 2:1 sur fond blanc).
 * - Séries (types d'évaluation) : palette catégorielle dans un ordre fixe,
 *   attribuée par type et jamais par rang — un type garde sa couleur même
 *   si d'autres types sont absents.
 */

/** Étoiles 0-5 → couleur de segment */
export const LEVEL_COLORS: Record<number, string> = {
  5: '#256abf',
  4: '#86b6ef',
  3: '#d4d3ce',
  2: '#ee9796',
  1: '#e34948',
  0: '#a82a2a',
}

export const NEUTRAL_COLOR = '#7c6fd6'

export function levelColor(star: number | undefined): string {
  if (star === undefined) return NEUTRAL_COLOR
  return LEVEL_COLORS[Math.max(0, Math.min(5, Math.round(star)))]
}

/** Palette catégorielle (ordre fixe validé daltonisme sur paires adjacentes) */
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7']

/** Couleur fixe par entité : « global » puis chaque type d'évaluation */
export const TYPE_SERIES_COLOR: Record<string, string> = {
  overall: SERIES_COLORS[0],
  pre_formation: SERIES_COLORS[1],
  hot: SERIES_COLORS[2],
  cold: SERIES_COLORS[3],
  manager: SERIES_COLORS[4],
  instructor: SERIES_COLORS[5],
  funder: SERIES_COLORS[6],
}

export const BEFORE_COLOR = SERIES_COLORS[1]
export const AFTER_COLOR = SERIES_COLORS[0]

export const CHART_TRACK = '#e8e7e3'
export const CHART_GRID = '#ecebe8'
export const CHART_AXIS_TEXT = '#6b6a66'
