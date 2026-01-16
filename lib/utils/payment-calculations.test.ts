import { describe, it, expect } from 'vitest'
import {
  calculateRemainingAmount,
  isValidPaymentAmount,
  calculateInvoiceStatus,
  isValidDateRange,
  generateInvoiceNumber,
} from './payment-calculations'

describe('payment-calculations', () => {
  describe('calculateRemainingAmount', () => {
    it('devrait calculer correctement le reste à payer', () => {
      expect(calculateRemainingAmount(1000, 300)).toBe(700)
      expect(calculateRemainingAmount(1000, 0)).toBe(1000)
      expect(calculateRemainingAmount(1000, 1000)).toBe(0)
    })

    it('ne devrait pas retourner un montant négatif', () => {
      expect(calculateRemainingAmount(1000, 1500)).toBe(0)
    })
  })

  describe('isValidPaymentAmount', () => {
    it('devrait accepter un montant valide', () => {
      const result = isValidPaymentAmount(500, 1000, 300)
      expect(result.valid).toBe(true)
      expect(result.remainingAmount).toBe(700)
    })

    it('devrait rejeter un montant négatif ou zéro', () => {
      const result1 = isValidPaymentAmount(0, 1000, 300)
      expect(result1.valid).toBe(false)
      expect(result1.error).toContain('supérieur à 0')

      const result2 = isValidPaymentAmount(-100, 1000, 300)
      expect(result2.valid).toBe(false)
    })

    it('devrait rejeter un montant qui dépasse le reste à payer', () => {
      const result = isValidPaymentAmount(800, 1000, 300)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('ne peut pas dépasser')
      expect(result.remainingAmount).toBe(700)
    })

    it('devrait accepter un paiement égal au reste à payer', () => {
      const result = isValidPaymentAmount(700, 1000, 300)
      expect(result.valid).toBe(true)
    })
  })

  describe('calculateInvoiceStatus', () => {
    it('devrait retourner "sent" si aucun paiement', () => {
      expect(calculateInvoiceStatus(1000, 0)).toBe('sent')
    })

    it('devrait retourner "paid" si le montant payé est égal au total', () => {
      expect(calculateInvoiceStatus(1000, 1000)).toBe('paid')
    })

    it('devrait retourner "paid" si le montant payé dépasse le total', () => {
      expect(calculateInvoiceStatus(1000, 1200)).toBe('paid')
    })

    it('devrait retourner "partial" si le montant payé est partiel', () => {
      expect(calculateInvoiceStatus(1000, 500)).toBe('partial')
      expect(calculateInvoiceStatus(1000, 999)).toBe('partial')
    })
  })

  describe('isValidDateRange', () => {
    it('devrait accepter une plage de dates valide', () => {
      const result = isValidDateRange('2024-01-01', '2024-01-31')
      expect(result.valid).toBe(true)
    })

    it('devrait accepter des dates égales', () => {
      const result = isValidDateRange('2024-01-01', '2024-01-01')
      expect(result.valid).toBe(true)
    })

    it('devrait rejeter une date de fin antérieure à la date de début', () => {
      const result = isValidDateRange('2024-01-31', '2024-01-01')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('postérieure')
    })

    it('devrait rejeter des dates invalides', () => {
      const result1 = isValidDateRange('invalid-date', '2024-01-01')
      expect(result1.valid).toBe(false)
      expect(result1.error).toContain('début')

      const result2 = isValidDateRange('2024-01-01', 'invalid-date')
      expect(result2.valid).toBe(false)
      expect(result2.error).toContain('fin')
    })

    it('devrait fonctionner avec des objets Date', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-31')
      const result = isValidDateRange(start, end)
      expect(result.valid).toBe(true)
    })
  })

  describe('generateInvoiceNumber', () => {
    it('devrait générer un numéro de facture correct', () => {
      const number = generateInvoiceNumber('ORG', 2024, 1, 'invoice')
      expect(number).toBe('FAC-ORG-24-000001')
    })

    it('devrait générer un numéro de devis correct', () => {
      const number = generateInvoiceNumber('ORG', 2024, 1, 'quote')
      expect(number).toBe('DEV-ORG-24-000001')
    })

    it('devrait formater correctement la séquence', () => {
      const number = generateInvoiceNumber('ORG', 2024, 123, 'invoice')
      expect(number).toBe('FAC-ORG-24-000123')
    })

    it('devrait gérer les grandes séquences', () => {
      const number = generateInvoiceNumber('ORG', 2024, 999999, 'invoice')
      expect(number).toBe('FAC-ORG-24-999999')
    })
  })
})

