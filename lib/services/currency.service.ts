/**
 * Service de gestion des devises et conversions
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

// Taux de change par défaut (à remplacer par une API réelle)
const DEFAULT_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  EUR: {
    XOF: 655.957, // 1 EUR = 655.957 XOF (taux fixe)
    USD: 1.10,
    GBP: 0.85,
  },
  XOF: {
    EUR: 0.0015, // 1 XOF = 0.0015 EUR
    USD: 0.0017,
    GBP: 0.0013,
  },
  USD: {
    EUR: 0.91,
    XOF: 596.33,
    GBP: 0.77,
  },
  GBP: {
    EUR: 1.18,
    XOF: 771.03,
    USD: 1.30,
  },
}

export class CurrencyService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Convertit un montant d'une devise à une autre
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount
    }

    try {
      // Essayer de récupérer le taux de change depuis la base de données
      const { data: rate, error } = await this.supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error && rate?.rate) {
        return amount * rate.rate
      }

      // Fallback sur les taux par défaut
      const exchangeRate =
        DEFAULT_EXCHANGE_RATES[fromCurrency]?.[toCurrency] ||
        (1 / (DEFAULT_EXCHANGE_RATES[toCurrency]?.[fromCurrency] || 1))

      return amount * exchangeRate
    } catch (error) {
      logger.warn('Error converting currency, using default rate', { error })
      // Utiliser les taux par défaut en cas d'erreur
      const exchangeRate =
        DEFAULT_EXCHANGE_RATES[fromCurrency]?.[toCurrency] ||
        (1 / (DEFAULT_EXCHANGE_RATES[toCurrency]?.[fromCurrency] || 1))

      return amount * exchangeRate
    }
  }

  /**
   * Formate un montant selon la devise et la locale
   */
  formatAmount(amount: number, currency: string, locale: string = 'fr-FR'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
      }).format(amount)
    } catch (error) {
      logger.warn('Error formatting currency, using fallback', { error })
      return `${amount} ${currency}`
    }
  }

  /**
   * Récupère la liste des devises supportées
   */
  getSupportedCurrencies(): string[] {
    return ['EUR', 'XOF', 'USD', 'GBP']
  }

  /**
   * Récupère le symbole d'une devise
   */
  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      EUR: '€',
      XOF: 'CFA',
      USD: '$',
      GBP: '£',
    }
    return symbols[currency] || currency
  }
}

export const currencyService = new CurrencyService()



