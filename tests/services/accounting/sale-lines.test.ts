import { describe, it, expect } from 'vitest'
import { buildSaleLines, resolveSaleTiers } from '@/lib/services/accounting/sale-lines'

describe('resolveSaleTiers', () => {
  it('prefers the student (number + full name)', () => {
    expect(
      resolveSaleTiers({ student_number: 'STU-42', first_name: 'Ada', last_name: 'Lovelace' }, { id: 'ent', name: 'X' })
    ).toEqual({ num: 'STU-42', lib: 'Ada Lovelace' })
  })

  it('falls back to the external entity (id truncated to 10)', () => {
    expect(resolveSaleTiers(null, { id: 'abcdefghijklmnop', name: 'OPCO Atlas' })).toEqual({
      num: 'abcdefghij',
      lib: 'OPCO Atlas',
    })
  })

  it('returns {} when neither is present', () => {
    expect(resolveSaleTiers(null, null)).toEqual({})
  })
})

describe('buildSaleLines', () => {
  const tiers = { num: 'STU-1', lib: 'Ada Lovelace' }

  it('builds 3 lines for an invoice with VAT (411 debit TTC / 701 credit HT / 445 credit VAT)', () => {
    const lines = buildSaleLines({
      documentType: 'invoice',
      invoiceNumber: 'FAC-001',
      amountHT: 1000,
      taxAmount: 200,
      totalTTC: 1200,
      currency: 'EUR',
      tiers,
    })
    expect(lines).toHaveLength(3)
    expect(lines[0]).toMatchObject({ account: '411000', debit: 1200, credit: 0, auxAccount: 'STU-1' })
    expect(lines[1]).toMatchObject({ account: '701000', debit: 0, credit: 1000 })
    expect(lines[2]).toMatchObject({ account: '445710', debit: 0, credit: 200, label: 'TVA Facture FAC-001' })
    // équilibré
    expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(lines.reduce((s, l) => s + l.credit, 0))
  })

  it('omits the VAT line when tax is 0', () => {
    const lines = buildSaleLines({
      documentType: 'invoice',
      invoiceNumber: 'FAC-002',
      amountHT: 500,
      taxAmount: 0,
      totalTTC: 500,
      currency: 'EUR',
      tiers,
    })
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => l.account)).toEqual(['411000', '701000'])
  })

  it('flips debit/credit for a credit note and uses absolute amounts', () => {
    const lines = buildSaleLines({
      documentType: 'credit_note',
      invoiceNumber: 'AVO-001',
      amountHT: -1000,
      taxAmount: -200,
      totalTTC: -1200,
      currency: 'EUR',
      tiers,
    })
    expect(lines[0]).toMatchObject({ account: '411000', debit: 0, credit: 1200 })
    expect(lines[1]).toMatchObject({ account: '701000', debit: 1000, credit: 0 })
    expect(lines[2]).toMatchObject({ account: '445710', debit: 200, credit: 0 })
    expect(lines[0].label).toBe('Avoir AVO-001')
    expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(lines.reduce((s, l) => s + l.credit, 0))
  })

  it('honours custom accounts / journal', () => {
    const [client, revenue] = buildSaleLines(
      { documentType: 'invoice', invoiceNumber: 'F', amountHT: 100, taxAmount: 0, totalTTC: 100, currency: 'EUR', tiers },
      { journalCode: 'VE', clientAccount: '411CLI', revenueAccount: '706000' }
    )
    expect(client).toMatchObject({ journalCode: 'VE', account: '411CLI' })
    expect(revenue.account).toBe('706000')
  })

  it('derives TTC from HT + VAT when totalTTC is null', () => {
    const [client] = buildSaleLines({
      documentType: 'invoice',
      invoiceNumber: 'F',
      amountHT: 100,
      taxAmount: 20,
      totalTTC: null,
      currency: 'EUR',
      tiers,
    })
    expect(client.debit).toBe(120)
  })
})
