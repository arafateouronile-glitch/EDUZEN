/**
 * Règles d'exécution des envois programmés (logique pure, testée) :
 * statut du journal et protection contre un double envoi le même jour.
 */

export type ScheduleRunStatus = 'success' | 'partial' | 'failed'

export function runStatus(successfulSends: number, failedSends: number): ScheduleRunStatus {
  if (failedSends === 0) return 'success'
  if (successfulSends === 0) return 'failed'
  return 'partial'
}

/** Date du jour (AAAA-MM-JJ) en heure de Paris */
export function parisDay(date: Date): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/**
 * Vrai si la règle a déjà envoyé aujourd'hui (heure de Paris). Une exécution
 * entièrement en échec peut être rejouée.
 */
export function alreadyRanToday(lastRunAt: string | null | undefined, lastRunStatus: string | null | undefined, now: Date): boolean {
  if (!lastRunAt || lastRunStatus === 'failed') return false
  const last = new Date(lastRunAt)
  if (Number.isNaN(last.getTime())) return false
  return parisDay(last) === parisDay(now)
}
