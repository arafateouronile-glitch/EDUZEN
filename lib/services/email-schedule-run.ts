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

// ── Déclenchement à la date ─────────────────────────────────────────────────

/** Inscriptions destinataires des automatisations (validées) */
export const EMAIL_AUTOMATION_ENROLLMENT_STATUSES = ['confirmed', 'completed']

/** Décale une date AAAA-MM-JJ d'un nombre de jours (calendrier, sans fuseau) */
export function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

/**
 * Vrai si aujourd'hui (heure de Paris) est le jour d'envoi : date de début − N
 * jours, ou date de fin + N jours. L'heure de la règle n'est pas bloquante :
 * le cron passe une fois par jour, le matin.
 */
export function isTriggerDay(
  triggerType: string,
  dates: { start_date?: string | null; end_date?: string | null },
  triggerDays: number | null | undefined,
  now: Date
): boolean {
  const today = parisDay(now)
  const days = triggerDays ?? 0
  if (triggerType === 'before_session_start' || triggerType === 'before_evaluation_start') {
    return !!dates.start_date && shiftDay(dates.start_date, -days) === today
  }
  if (triggerType === 'after_session_end' || triggerType === 'after_evaluation_end') {
    return !!dates.end_date && shiftDay(dates.end_date, days) === today
  }
  return false
}

// ── Portée organisme / session ──────────────────────────────────────────────

/**
 * Sessions visées par une règle. Une règle de session ne vise que sa session ;
 * une règle d'organisme vise toutes les sessions sauf celles qui ont leur
 * propre règle du même type (active ou non : la règle de session prime).
 */
export function resolveScheduleScope<T extends { id: string }>(
  schedule: { session_id?: string | null; email_type: string },
  sessions: T[],
  sessionRules: Array<{ session_id: string | null; email_type: string }>
): T[] {
  if (schedule.session_id) return sessions.filter((s) => s.id === schedule.session_id)
  const overridden = new Set(
    sessionRules.filter((r) => r.session_id && r.email_type === schedule.email_type).map((r) => r.session_id as string)
  )
  return sessions.filter((s) => !overridden.has(s.id))
}

// ── Relance d'évaluation ────────────────────────────────────────────────────

/**
 * Apprenants à relancer : évaluation à chaud attribuée mais non complétée.
 */
export function studentsWithPendingHotEvaluation(
  grades: Array<{ id: string; student_id: string | null }>,
  instances: Array<{ grade_id: string; completed_at: string | null }>
): Set<string> {
  const byGrade = new Map(instances.map((i) => [i.grade_id, i]))
  const pending = new Set<string>()
  for (const g of grades) {
    const instance = byGrade.get(g.id)
    if (g.student_id && instance && !instance.completed_at) pending.add(g.student_id)
  }
  return pending
}

// ── Émargement automatique ──────────────────────────────────────────────────

/** Minutes depuis minuit, heure de Paris */
export function parisMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return h * 60 + m
}

/**
 * Vrai si la séance (heure de début HH:MM[:SS], heure de Paris) a commencé il y
 * a 5 à 15 minutes — fenêtre adaptée à un passage toutes les 5 minutes.
 */
export function slotInLaunchWindow(slotStartTime: string | null | undefined, now: Date): boolean {
  if (!slotStartTime) return false
  const [h, m] = slotStartTime.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false
  const elapsed = parisMinutes(now) - (h * 60 + m)
  return elapsed >= 5 && elapsed <= 15
}
