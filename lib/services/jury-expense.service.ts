/**
 * Défraiements des membres du jury (table session_jury_expenses).
 *
 * Montant = vacations (heures × taux) + transport (km × taux km + autres
 * transports) + repas + hébergement. Les montants enregistrés sont calculés
 * par Postgres (colonnes générées) ; computeExpense() reproduit le calcul pour
 * l'aperçu en direct du formulaire.
 *
 * Les écritures passent par /api/jury/expenses, qui synchronise aussi la
 * charge « Jury » de la session (onglet Finances).
 */

import type { JuryMember } from './jury.service'

export type JuryExpenseStatus = 'draft' | 'sent' | 'signed'

export interface JuryExpenseAmounts {
  hours: number
  hourly_rate: number
  distance_km: number
  km_rate: number
  other_transport: number
  meals: number
  lodging: number
}

export interface JuryExpense extends JuryExpenseAmounts {
  id: string
  organization_id: string
  session_jury_id: string
  session_id: string
  jury_member_id: string
  reference: string | null
  fees: number
  transport: number
  total: number
  notes: string | null
  currency: string
  status: JuryExpenseStatus
  document_id: string | null
  signature_request_id: string | null
  sent_at: string | null
  signed_at: string | null
  session_charge_id: string | null
  created_at: string
  updated_at: string
  /** Jointure documents (PDF signé) */
  documents?: { signed_file_url: string | null; file_url: string | null } | null
}

export interface JuryExpenseInput extends Partial<JuryExpenseAmounts> {
  session_jury_id: string
  notes?: string | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Même calcul que les colonnes générées fees / transport / total */
export function computeExpense(input: Partial<Record<keyof JuryExpenseAmounts, unknown>>) {
  const hours = num(input.hours)
  const hourlyRate = num(input.hourly_rate)
  const distanceKm = num(input.distance_km)
  const kmRate = num(input.km_rate)
  const fees = round2(hours * hourlyRate)
  const transport = round2(round2(distanceKm * kmRate) + num(input.other_transport))
  const total = round2(fees + transport + num(input.meals) + num(input.lodging))
  return { fees, transport, total }
}

/** Montant au format français, sans symbole (le modèle affiche « € ») : 1 234,50 */
export function formatAmount(value: number | null | undefined): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(value ?? 0))
    .replace(/ | /g, ' ')
}

export function juryMemberFullName(member: Pick<JuryMember, 'first_name' | 'last_name'> | null | undefined): string {
  if (!member) return 'Membre du jury'
  return `${member.first_name} ${member.last_name.toUpperCase()}`.trim()
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error || 'Erreur serveur')
  return json as T
}

export const juryExpenseService = {
  getBySession: (sessionId: string) =>
    request<{ expenses: JuryExpense[] }>(`/api/jury/expenses?session_id=${encodeURIComponent(sessionId)}`).then((r) => r.expenses),

  save: (input: JuryExpenseInput) =>
    request<{ expense: JuryExpense }>('/api/jury/expenses', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.expense),

  remove: (id: string) => request<{ success: true }>(`/api/jury/expenses?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  markSent: (id: string, documentId: string, signatureRequestId: string | null) =>
    request<{ expense: JuryExpense }>(`/api/jury/expenses?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ document_id: documentId, signature_request_id: signatureRequestId }),
    }).then((r) => r.expense),
}
