/**
 * Zones de signature PDF – coordonnées relatives (%).
 * Permet un placement précis quelle que soit la résolution ou le format (A4/Letter).
 */

export interface SignZone {
  id: string
  page: number
  /** Abscisse gauche, 0–1 (0 = gauche, 1 = droite) */
  x: number
  /** Ordonnée haut, 0–1 (0 = haut, 1 = bas). PDF-lib utilise le bas : conversion au stamp. */
  y: number
  /** Largeur, 0–1 */
  w: number
  /** Hauteur, 0–1 */
  h: number
  /** Label affiché (ex. "Signature Stagiaire", "Signature OF") */
  label?: string
}

export const DEFAULT_ZONE_IDS = {
  sig_stagiaire: 'sig_stagiaire',
  sig_of: 'sig_of',
  paraphe: 'paraphe',
} as const

export function createZoneId(type: keyof typeof DEFAULT_ZONE_IDS, index?: number): string {
  return index !== undefined ? `${DEFAULT_ZONE_IDS[type]}_${index}` : DEFAULT_ZONE_IDS[type]
}
