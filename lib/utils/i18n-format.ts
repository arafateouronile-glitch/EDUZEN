/**
 * Utilitaires de formatage avec support i18n
 * Utilise next-intl pour la locale
 */

import { format as dateFnsFormat, formatRelative } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { getLocale } from 'next-intl/server'

// Mapping des locales next-intl vers date-fns
const dateFnsLocales: Record<string, typeof fr> = {
  fr,
  en: enUS,
}

/**
 * Formate une date selon la locale actuelle
 */
export async function formatDateI18n(
  date: string | Date | null | undefined,
  format: string = 'P' // Format court par défaut (dd/MM/yyyy pour fr, MM/dd/yyyy pour en)
): Promise<string> {
  if (!date) return ''
  
  try {
    const locale = await getLocale()
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    const dateFnsLocale = dateFnsLocales[locale] || fr
    return dateFnsFormat(dateObj, format, { locale: dateFnsLocale })
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * Formate une date en temps relatif selon la locale actuelle
 */
export async function formatRelativeTimeI18n(date: string | Date): Promise<string> {
  if (!date) return ''
  
  try {
    const locale = await getLocale()
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    const dateFnsLocale = dateFnsLocales[locale] || fr
    return formatRelative(dateObj, new Date(), { locale: dateFnsLocale })
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return ''
  }
}

/**
 * Formate une devise selon la locale actuelle
 */
export async function formatCurrencyI18n(
  amount: number,
  currency: string = 'EUR',
  locale?: string
): Promise<string> {
  try {
    const currentLocale = locale || (await getLocale())
    // Mapping des locales next-intl vers Intl locales
    const intlLocales: Record<string, string> = {
      fr: 'fr-FR',
      en: 'en-US',
    }
    const intlLocale = intlLocales[currentLocale] || 'fr-FR'
    
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: currency,
    }).format(amount)
  } catch (error) {
    console.error('Error formatting currency:', error)
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }
}

/**
 * Formate un nombre selon la locale actuelle
 */
export async function formatNumberI18n(
  value: number,
  decimals: number = 2,
  locale?: string
): Promise<string> {
  try {
    const currentLocale = locale || (await getLocale())
    // Mapping des locales next-intl vers Intl locales
    const intlLocales: Record<string, string> = {
      fr: 'fr-FR',
      en: 'en-US',
    }
    const intlLocale = intlLocales[currentLocale] || 'fr-FR'
    
    return new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  } catch (error) {
    console.error('Error formatting number:', error)
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }
}

/**
 * Hook client pour formater les dates/devises
 * Utilise useLocale de next-intl
 */
export function useFormatting() {
  // Cette fonction sera utilisée côté client
  // Pour le client, on utilisera directement useLocale de next-intl
  return {
    formatDate: (date: string | Date | null | undefined, format?: string) => {
      // Cette fonction sera implémentée côté client avec useLocale
      return ''
    },
    formatCurrency: (amount: number, currency?: string) => {
      return ''
    },
  }
}

