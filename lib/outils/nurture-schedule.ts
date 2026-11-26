/** Calendrier de la séquence marketing des leads des outils gratuits */

/** Jours après l'inscription du lead pour chaque email de la séquence */
export const NURTURE_DAY_OFFSETS = [2, 5, 9, 14, 21] as const
export const NURTURE_STEPS = NURTURE_DAY_OFFSETS.length

const DAY_MS = 24 * 60 * 60 * 1000

/** Date d'envoi de l'email `step` (0 = premier), ou null quand la séquence est terminée */
export function nurtureSendDate(createdAt: Date | string, step: number): Date | null {
  if (step < 0 || step >= NURTURE_STEPS) return null
  return new Date(new Date(createdAt).getTime() + NURTURE_DAY_OFFSETS[step] * DAY_MS)
}

export interface NurtureLeadState {
  nurture_step: number
  unsubscribed_at: string | null
  bounced_at: string | null
  converted_at: string | null
}

export function isNurtureActive(lead: NurtureLeadState): boolean {
  return !lead.unsubscribed_at && !lead.bounced_at && !lead.converted_at && lead.nurture_step < NURTURE_STEPS
}
