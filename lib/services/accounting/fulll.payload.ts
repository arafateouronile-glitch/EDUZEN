/**
 * Construction des payloads Fulll à partir d'une facture EDUZEN (`InvoiceData`).
 *
 * ⚠️ Les noms de champs marqués `TODO(fulll-docs)` sont des hypothèses : ils doivent
 * être confirmés contre la documentation Stoplight de Fulll (accessible uniquement
 * avec un compte partenaire). Toute la surface spécifique Fulll est isolée dans ce
 * fichier + `fulll.adapter.ts` + `fulll.client.ts` + `fulll.errors.ts` pour qu'un
 * ajustement de mapping ne touche rien d'autre.
 *
 * Deux modes :
 *  - `sales_invoice` (défaut, seul exposé dans l'UI) : on envoie l'en-tête + lignes +
 *    TVA ; Fulll génère l'écriture selon SON plan de comptes.
 *  - `entries` (expérimental, sans UI) : on envoie directement les lignes 411/701/445
 *    calculées par `buildSaleLines` (logique partagée avec l'export FEC).
 */

import type { FulllMetadata, InvoiceData } from './accounting.types'
import { buildSaleLines, resolveSaleTiers, round2 } from './sale-lines'

// ---------------------------------------------------------------------------
// Types de payload (hypothèses — voir TODO(fulll-docs))
// ---------------------------------------------------------------------------

export interface FulllCustomerRef {
  /** id Fulll si déjà résolu (cache ou lookup) */
  id?: string
  /** code / référence externe stable côté EDUZEN (num. apprenant ou id entité tronqué) */
  code: string
  name: string
  email?: string
}

export interface FulllSalesInvoiceLine {
  description: string
  quantity: number
  unit_price: number // HT
  amount_excl_tax: number // HT total de la ligne
  // TODO(fulll-docs): `account` requis par ligne, ou dérivé du journal/client ?
  account?: string
  // TODO(fulll-docs): `vat_rate` (nombre) vs `vat_code` (code du plan TVA Fulll)
  vat_rate?: number
}

export interface FulllVatBreakdownEntry {
  rate: number
  base: number
  amount: number
  // TODO(fulll-docs): Fulll attend-il le compte de TVA (445xxx) ici ?
  account?: string
}

export interface FulllSalesInvoicePayload {
  // TODO(fulll-docs): `book` | `book_code` | `journal` ; code ou id ?
  book: string
  // TODO(fulll-docs): format de date attendu (`YYYY-MM-DD` supposé)
  date: string
  due_date?: string
  // TODO(fulll-docs): `reference` | `document_number` | `piece` — n° de pièce (PieceRef)
  reference: string
  // TODO(fulll-docs): Fulll déduplique-t-il sur une référence externe ?
  external_id: string
  // TODO(fulll-docs): représentation d'un avoir — `type` dédié, montants négatifs, ou endpoint séparé ?
  type: 'invoice' | 'credit_note'
  // TODO(fulll-docs): objet `customer` vs `customer_id` ; champ code = `code`|`reference`|`external_id`
  customer: FulllCustomerRef
  // TODO(fulll-docs): code ISO (`EUR`) vs identifiant Fulll de la devise
  currency: string
  lines: FulllSalesInvoiceLine[]
  total_excl_tax: number
  total_tax: number
  total_incl_tax: number
  // TVA au niveau en-tête : EDUZEN ne stocke pas de taux fiable par ligne.
  // TODO(fulll-docs): Fulll accepte-t-il une TVA en-tête, ou exige-t-il un taux par ligne ?
  vat_breakdown: FulllVatBreakdownEntry[]
}

export interface FulllEntryLine {
  account_number: string
  // TODO(fulll-docs): nom du champ compte auxiliaire / tiers
  auxiliary_account?: string
  auxiliary_label?: string
  label: string
  debit: number
  credit: number
}

export interface FulllEntriesPayload {
  book: string
  date: string
  reference: string
  external_id: string
  currency: string
  lines: FulllEntryLine[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ref tiers stable : n° apprenant sinon id entité tronqué (règle partagée avec l'export FEC). */
export function resolveFulllCustomer(inv: InvoiceData): FulllCustomerRef {
  const tiers = resolveSaleTiers(
    inv.student_number || inv.student_name
      ? {
          student_number: inv.student_number ?? null,
          first_name: inv.student_name ?? null,
          last_name: null,
        }
      : null,
    inv.entity ? { id: inv.entity.id, name: inv.entity.name } : null
  )
  return {
    code: tiers.num || inv.entity?.id?.slice(0, 10) || inv.student_id?.slice(0, 10) || inv.id.slice(0, 10),
    name: tiers.lib || inv.entity?.name || inv.student_name || inv.invoice_number,
    email: inv.entity?.email ?? undefined,
  }
}

/** Date ISO courte `YYYY-MM-DD` — TODO(fulll-docs) confirmer le format attendu. */
export function toFulllDate(value: string | null | undefined, fallback?: string | null): string {
  const raw = value || fallback
  if (!raw) return new Date().toISOString().slice(0, 10)
  // accepte 'YYYY-MM-DD' ou ISO complet
  return raw.length >= 10 ? raw.slice(0, 10) : raw
}

/** Taux de TVA effectif déduit du couple (TVA, HT). 0 si HT nul ou pas de TVA. */
export function effectiveVatRate(amountHT: number, taxAmount: number): number {
  const ht = Math.abs(amountHT || 0)
  const tva = Math.abs(taxAmount || 0)
  if (ht === 0 || tva === 0) return 0
  // arrondi au demi-point (gère 20 / 10 / 5.5 / 2.1)
  return Math.round((tva / ht) * 100 * 2) / 2
}

// ---------------------------------------------------------------------------
// Mode `sales_invoice`
// ---------------------------------------------------------------------------

export interface BuildPayloadContext {
  /** Devise résolue côté Fulll (code ISO ou id selon TODO(fulll-docs)) */
  currencyCode?: string
  /** id client Fulll déjà connu (cache / lookup) */
  customerId?: string
}

export function buildSalesInvoicePayload(
  inv: InvoiceData,
  meta: FulllMetadata,
  ctx: BuildPayloadContext = {}
): FulllSalesInvoicePayload {
  const isCreditNote = inv.document_type === 'credit_note'
  const amountHT = round2(Math.abs(inv.amount || 0))
  const taxAmount = round2(Math.abs(inv.tax_amount || 0))
  const totalTTC = round2(Math.abs(inv.total_amount ?? amountHT + taxAmount))
  const rate = effectiveVatRate(amountHT, taxAmount)
  const currency = ctx.currencyCode || inv.currency || 'EUR'

  const customer = resolveFulllCustomer(inv)
  if (ctx.customerId) customer.id = ctx.customerId

  // Lignes : items EDUZEN si présents, sinon une ligne synthétique.
  const sourceItems =
    inv.items && inv.items.length > 0
      ? inv.items
      : [
          {
            description: (isCreditNote ? 'Avoir ' : 'Facture ') + inv.invoice_number,
            quantity: 1,
            unit_price: amountHT,
            total: amountHT,
          },
        ]

  const lines: FulllSalesInvoiceLine[] = sourceItems.map((it) => ({
    description: it.description || (isCreditNote ? 'Avoir' : 'Prestation de formation'),
    quantity: Math.abs(it.quantity || 1),
    unit_price: round2(Math.abs(it.unit_price || 0)),
    amount_excl_tax: round2(Math.abs(it.total ?? (it.quantity || 1) * (it.unit_price || 0))),
    account: meta.default_revenue_account, // TODO(fulll-docs): peut-être inutile si dérivé par Fulll
    vat_rate: rate,
  }))

  // Cale la somme des lignes sur le HT réel de la facture (arrondis items).
  const linesSum = round2(lines.reduce((s, l) => s + l.amount_excl_tax, 0))
  if (linesSum !== amountHT && lines.length > 0) {
    lines[lines.length - 1].amount_excl_tax = round2(
      lines[lines.length - 1].amount_excl_tax + (amountHT - linesSum)
    )
  }

  const vatBreakdown: FulllVatBreakdownEntry[] =
    taxAmount > 0
      ? [
          {
            rate,
            base: amountHT,
            amount: taxAmount,
            account: meta.vat_account_map[String(rate)] || meta.vat_account_map['20'],
          },
        ]
      : []

  return {
    book: inv.journal_code || meta.sales_journal_code || 'VT',
    date: toFulllDate(inv.issue_date, inv.due_date),
    due_date: toFulllDate(inv.due_date, inv.issue_date),
    reference: inv.invoice_number,
    external_id: inv.id,
    type: isCreditNote ? 'credit_note' : 'invoice',
    customer,
    currency,
    lines,
    total_excl_tax: amountHT,
    total_tax: taxAmount,
    total_incl_tax: totalTTC,
    vat_breakdown: vatBreakdown,
  }
}

// ---------------------------------------------------------------------------
// Mode `entries` (expérimental)
// ---------------------------------------------------------------------------

export function buildJournalEntriesPayload(
  inv: InvoiceData,
  meta: FulllMetadata,
  ctx: BuildPayloadContext = {}
): FulllEntriesPayload {
  const customer = resolveFulllCustomer(inv)
  const clientAccount =
    meta.customer_account_strategy === 'per_customer' && customer.code
      ? customer.code
      : meta.collective_customer_account

  const saleLines = buildSaleLines(
    {
      documentType: inv.document_type === 'credit_note' ? 'credit_note' : 'invoice',
      invoiceNumber: inv.invoice_number,
      amountHT: inv.amount || 0,
      taxAmount: inv.tax_amount,
      totalTTC: inv.total_amount ?? null,
      currency: ctx.currencyCode || inv.currency,
      tiers: {
        num: meta.customer_account_strategy === 'collective_auxiliary' ? customer.code : undefined,
        lib: customer.name,
      },
    },
    {
      journalCode: inv.journal_code || meta.sales_journal_code || 'VT',
      clientAccount,
      revenueAccount: meta.default_revenue_account,
      vatAccount: meta.vat_account_map[String(effectiveVatRate(inv.amount || 0, inv.tax_amount || 0))] ||
        meta.vat_account_map['20'],
    }
  )

  return {
    book: inv.journal_code || meta.sales_journal_code || 'VT',
    date: toFulllDate(inv.issue_date, inv.due_date),
    reference: inv.invoice_number,
    external_id: inv.id,
    currency: ctx.currencyCode || inv.currency || 'EUR',
    lines: saleLines.map((l) => ({
      account_number: l.account,
      auxiliary_account: l.auxAccount,
      auxiliary_label: l.auxAccountLabel,
      label: l.label,
      debit: l.debit,
      credit: l.credit,
    })),
  }
}
