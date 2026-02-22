/**
 * Tests critiques — Webhook Stripe : une erreur 23505 (duplicate) doit être traitée comme succès (idempotent).
 */

import { describe, it, expect } from 'vitest'

function isDuplicateCommissionError(insertError: { code?: string; message?: string } | null): boolean {
  if (!insertError) return false
  const err = insertError as { code?: string; message?: string }
  return err.code === '23505' || /unique|duplicate/i.test(err.message ?? '')
}

describe('Webhook Stripe - Commission idempotence', () => {
  it('devrait considérer code 23505 comme doublon (ne pas re-throw)', () => {
    expect(isDuplicateCommissionError({ code: '23505' })).toBe(true)
    expect(isDuplicateCommissionError({ code: '23505', message: 'duplicate key' })).toBe(true)
  })

  it('devrait considérer message "unique constraint" comme doublon', () => {
    expect(isDuplicateCommissionError({ message: 'unique constraint "affiliate_commissions_stripe_invoice_id_key" violated' })).toBe(true)
    expect(isDuplicateCommissionError({ message: 'duplicate key value' })).toBe(true)
  })

  it('ne devrait pas considérer une autre erreur comme doublon', () => {
    expect(isDuplicateCommissionError({ code: '23503' })).toBe(false)
    expect(isDuplicateCommissionError({ message: 'foreign key violation' })).toBe(false)
    expect(isDuplicateCommissionError(null)).toBe(false)
  })
})
