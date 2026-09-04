/**
 * Construction des lignes d'écriture comptable d'une vente (facture ou avoir).
 *
 * Logique unique partagée par :
 *  - l'export FEC (`lib/services/fec-export.service.ts`)
 *  - le mode "écritures brutes" du connecteur Fulll (`lib/services/accounting/fulll.payload.ts`)
 *
 * Schéma d'une vente (plan comptable français standard, comptes paramétrables) :
 *  - 411 Clients        — débit TTC
 *  - 701 Ventes         — crédit HT
 *  - 445710 TVA collectée — crédit TVA (uniquement si TVA > 0)
 * Un avoir (`credit_note`) inverse débit/crédit et travaille en valeur absolue.
 */

export interface SaleTiers {
  /** Numéro de compte auxiliaire (apprenant ou entité) */
  num?: string
  /** Libellé du tiers */
  lib?: string
}

/**
 * Détermine le tiers d'une écriture : un apprenant nommé, ou une entité externe
 * (entreprise / OPCO) quand la facture a été émise directement à une entité.
 * Règle historique conservée depuis l'export FEC.
 */
export function resolveSaleTiers(
  student:
    | { student_number?: string | null; first_name?: string | null; last_name?: string | null }
    | null
    | undefined,
  entity: { id?: string; name?: string | null } | null | undefined
): SaleTiers {
  if (student) {
    return {
      num: student.student_number || undefined,
      lib: `${student.first_name || ''} ${student.last_name || ''}`.trim() || undefined,
    }
  }
  if (entity?.id) {
    return { num: entity.id.slice(0, 10), lib: entity.name || undefined }
  }
  return {}
}

export interface SaleLineInput {
  documentType: 'invoice' | 'credit_note'
  invoiceNumber: string | null
  /** Montant HT (peut être stocké négatif en base pour un avoir — on le normalise) */
  amountHT: number
  /** Montant de TVA */
  taxAmount: number | null
  /** Montant TTC (fallback : HT + TVA) */
  totalTTC: number | null
  currency: string | null
  tiers: SaleTiers
}

export interface SaleLineOptions {
  journalCode?: string
  journalLabel?: string
  clientAccount?: string
  clientAccountLabel?: string
  revenueAccount?: string
  revenueAccountLabel?: string
  vatAccount?: string
  vatAccountLabel?: string
}

export interface SaleLine {
  journalCode: string
  journalLabel: string
  account: string
  accountLabel: string
  auxAccount?: string
  auxAccountLabel?: string
  pieceRef: string
  label: string
  /** Montant débit, nombre positif (0 si crédit) */
  debit: number
  /** Montant crédit, nombre positif (0 si débit) */
  credit: number
  currency: string
}

const DEFAULTS = {
  journalCode: 'VT',
  journalLabel: 'Ventes',
  clientAccount: '411000',
  clientAccountLabel: 'Clients',
  revenueAccount: '701000',
  revenueAccountLabel: 'Ventes de produits finis',
  vatAccount: '445710',
  vatAccountLabel: 'TVA collectée',
} as const

/** Arrondi comptable à 2 décimales (évite les artefacts flottants). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Construit les 2 ou 3 lignes d'écriture d'une vente.
 * Les montants sont des nombres (non formatés) ; l'appelant se charge du format
 * de sortie (FEC : `toFixed(2)` séparé par `|` ; Fulll : objets JSON).
 */
export function buildSaleLines(input: SaleLineInput, options: SaleLineOptions = {}): SaleLine[] {
  const opt = { ...DEFAULTS, ...options }
  const isCreditNote = input.documentType === 'credit_note'
  const docLabel = isCreditNote ? 'Avoir' : 'Facture'

  const amountHT = Math.abs(input.amountHT || 0)
  const taxAmount = Math.abs(input.taxAmount || 0)
  const amountTTC = Math.abs(input.totalTTC ?? amountHT + taxAmount)

  const currency = input.currency || 'EUR'
  const pieceRef = input.invoiceNumber || ''
  const ecritureLabel = `${docLabel} ${input.invoiceNumber || ''}`.trim()

  const lines: SaleLine[] = []

  // 1. Client (411) — débit TTC (avoir : crédit)
  lines.push({
    journalCode: opt.journalCode,
    journalLabel: opt.journalLabel,
    account: opt.clientAccount,
    accountLabel: opt.clientAccountLabel,
    auxAccount: input.tiers.num,
    auxAccountLabel: input.tiers.lib,
    pieceRef,
    label: ecritureLabel,
    debit: isCreditNote ? 0 : round2(amountTTC),
    credit: isCreditNote ? round2(amountTTC) : 0,
    currency,
  })

  // 2. Ventes (701) — crédit HT (avoir : débit)
  lines.push({
    journalCode: opt.journalCode,
    journalLabel: opt.journalLabel,
    account: opt.revenueAccount,
    accountLabel: opt.revenueAccountLabel,
    pieceRef,
    label: ecritureLabel,
    debit: isCreditNote ? round2(amountHT) : 0,
    credit: isCreditNote ? 0 : round2(amountHT),
    currency,
  })

  // 3. TVA collectée (445710) — crédit TVA (avoir : débit), seulement si TVA > 0
  if (taxAmount > 0) {
    lines.push({
      journalCode: opt.journalCode,
      journalLabel: opt.journalLabel,
      account: opt.vatAccount,
      accountLabel: opt.vatAccountLabel,
      pieceRef,
      label: `TVA ${ecritureLabel}`.trim(),
      debit: isCreditNote ? round2(taxAmount) : 0,
      credit: isCreditNote ? 0 : round2(taxAmount),
      currency,
    })
  }

  return lines
}
