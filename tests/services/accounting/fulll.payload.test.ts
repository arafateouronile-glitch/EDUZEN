import { describe, it, expect } from 'vitest'
import {
  buildSalesInvoicePayload,
  buildJournalEntriesPayload,
  effectiveVatRate,
  toFulllDate,
} from '@/lib/services/accounting/fulll.payload'
import { FULLL_METADATA_DEFAULTS, type InvoiceData } from '@/lib/services/accounting/accounting.types'

const meta = FULLL_METADATA_DEFAULTS

function invoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
  return {
    id: 'inv-1',
    invoice_number: 'FAC-2026-001',
    issue_date: '2026-03-01',
    due_date: '2026-03-31',
    amount: 1000,
    tax_amount: 200,
    total_amount: 1200,
    currency: 'EUR',
    status: 'sent',
    student_id: 'stu-1',
    student_name: 'Ada Lovelace',
    student_number: 'STU-42',
    document_type: 'invoice',
    items: [{ description: 'Formation React', quantity: 1, unit_price: 1000, total: 1000 }],
    ...overrides,
  }
}

describe('effectiveVatRate', () => {
  it('derives 20 / 10 / 5.5 / 0', () => {
    expect(effectiveVatRate(1000, 200)).toBe(20)
    expect(effectiveVatRate(1000, 100)).toBe(10)
    expect(effectiveVatRate(1000, 55)).toBe(5.5)
    expect(effectiveVatRate(1000, 0)).toBe(0)
    expect(effectiveVatRate(0, 0)).toBe(0)
  })
})

describe('toFulllDate', () => {
  it('normalises to YYYY-MM-DD and falls back', () => {
    expect(toFulllDate('2026-03-01T12:00:00Z')).toBe('2026-03-01')
    expect(toFulllDate(null, '2026-04-02')).toBe('2026-04-02')
  })
})

describe('buildSalesInvoicePayload', () => {
  it('maps a standard invoice', () => {
    const p = buildSalesInvoicePayload(invoice(), meta, { customerId: 'fulll-cust-1' })
    expect(p).toMatchObject({
      book: 'VT',
      date: '2026-03-01',
      due_date: '2026-03-31',
      reference: 'FAC-2026-001',
      external_id: 'inv-1',
      type: 'invoice',
      currency: 'EUR',
      total_excl_tax: 1000,
      total_tax: 200,
      total_incl_tax: 1200,
    })
    expect(p.customer).toMatchObject({ id: 'fulll-cust-1', code: 'STU-42', name: 'Ada Lovelace' })
    expect(p.lines).toHaveLength(1)
    expect(p.vat_breakdown).toEqual([{ rate: 20, base: 1000, amount: 200, account: '445710' }])
  })

  it('emits a synthetic line when the invoice has no items and reconciles the HT total', () => {
    const p = buildSalesInvoicePayload(invoice({ items: [] }), meta)
    expect(p.lines).toHaveLength(1)
    expect(p.lines[0].amount_excl_tax).toBe(1000)
  })

  it('has no vat_breakdown for a 0% invoice', () => {
    const p = buildSalesInvoicePayload(invoice({ tax_amount: 0, total_amount: 1000 }), meta)
    expect(p.vat_breakdown).toEqual([])
  })

  it('marks a credit note with type credit_note and positive totals', () => {
    const p = buildSalesInvoicePayload(
      invoice({ document_type: 'credit_note', amount: -1000, tax_amount: -200, total_amount: -1200, invoice_number: 'AVO-1' }),
      meta
    )
    expect(p.type).toBe('credit_note')
    expect(p.total_excl_tax).toBe(1000)
    expect(p.total_incl_tax).toBe(1200)
  })

  it('resolves the customer to the external entity when there is no student', () => {
    const p = buildSalesInvoicePayload(
      invoice({ student_id: null, student_name: undefined, student_number: null, entity: { id: 'abcdefghijklmnop', name: 'OPCO Atlas' } }),
      meta
    )
    expect(p.customer).toMatchObject({ code: 'abcdefghij', name: 'OPCO Atlas' })
  })
})

describe('buildJournalEntriesPayload', () => {
  it('produces a balanced set of raw entry lines', () => {
    const p = buildJournalEntriesPayload(invoice(), meta)
    const debit = p.lines.reduce((s, l) => s + l.debit, 0)
    const credit = p.lines.reduce((s, l) => s + l.credit, 0)
    expect(debit).toBe(credit)
    expect(p.lines.map((l) => l.account_number)).toEqual(['411000', '701000', '445710'])
    expect(p.reference).toBe('FAC-2026-001')
  })
})
