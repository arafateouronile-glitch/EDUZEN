/**
 * Tests unitaires pour CurrencyService (audit - réduction services sans tests)
 * Couverture : convert (même devise, fallback taux), getSupportedCurrencies, getCurrencySymbol, formatAmount
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CurrencyService } from '@/lib/services/currency.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('CurrencyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('convert', () => {
    it('retourne le même montant quand from et to sont identiques', async () => {
      const mockSupabase = createMockSupabase({ data: null, error: null })
      const service = new CurrencyService(mockSupabase)

      const result = await service.convert(100, 'EUR', 'EUR')

      expect(result).toBe(100)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('utilise le taux en base quand la table ne fournit pas de taux', async () => {
      const mockSupabase = createMockSupabase({ data: null, error: null })
      const service = new CurrencyService(mockSupabase)

      const result = await service.convert(100, 'EUR', 'USD')

      expect(result).toBeCloseTo(110, 2)
      expect(mockSupabase.from).toHaveBeenCalledWith('exchange_rates')
    })
  })

  describe('getSupportedCurrencies', () => {
    it('retourne la liste des devises supportées', () => {
      const service = new CurrencyService(createMockSupabase({ data: null, error: null }))
      expect(service.getSupportedCurrencies()).toEqual(['EUR', 'XOF', 'USD', 'GBP'])
    })
  })

  describe('getCurrencySymbol', () => {
    it('retourne le symbole pour une devise connue', () => {
      const service = new CurrencyService(createMockSupabase({ data: null, error: null }))
      expect(service.getCurrencySymbol('EUR')).toBe('€')
      expect(service.getCurrencySymbol('USD')).toBe('$')
    })

    it('retourne le code devise si inconnu', () => {
      const service = new CurrencyService(createMockSupabase({ data: null, error: null }))
      expect(service.getCurrencySymbol('XXX')).toBe('XXX')
    })
  })

  describe('formatAmount', () => {
    it('formate un montant avec la locale et la devise', () => {
      const service = new CurrencyService(createMockSupabase({ data: null, error: null }))
      const formatted = service.formatAmount(99.5, 'EUR', 'fr-FR')
      expect(formatted).toMatch(/\d[\s,]+\d+\s*€/)
    })
  })
})
