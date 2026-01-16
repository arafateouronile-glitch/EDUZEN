'use client'

/**
 * Hook client pour formater les dates/devises selon la locale actuelle
 */

import { useLocale } from 'next-intl'
import { format as dateFnsFormat, formatRelative } from 'date-fns'
import { fr, enUS, type Locale } from 'date-fns/locale'

// Mapping des locales next-intl vers date-fns
const dateFnsLocales: Record<string, Locale> = {
  fr,
  en: enUS,
}

// Mapping des locales next-intl vers Intl locales
const intlLocales: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
}

export function useFormatting() {
  const locale = useLocale()
  const dateFnsLocale = dateFnsLocales[locale] || fr
  const intlLocale = intlLocales[locale] || 'fr-FR'

  /**
   * Formate une date selon la locale actuelle
   */
  const formatDate = (
    date: string | Date | null | undefined,
    format: string = 'P' // Format court par défaut
  ): string => {
    if (!date) return ''
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      if (isNaN(dateObj.getTime())) return ''
      
      return dateFnsFormat(dateObj, format, { locale: dateFnsLocale })
    } catch (error) {
      console.error('Error formatting date:', error)
      return ''
    }
  }

  /**
   * Formate une date en temps relatif selon la locale actuelle
   */
  const formatRelativeTime = (date: string | Date): string => {
    if (!date) return ''
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      if (isNaN(dateObj.getTime())) return ''
      
      return formatRelative(dateObj, new Date(), { locale: dateFnsLocale })
    } catch (error) {
      console.error('Error formatting relative time:', error)
      return ''
    }
  }

  /**
   * Formate une devise selon la locale actuelle
   */
  const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    try {
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
  const formatNumber = (value: number, decimals: number = 2): string => {
    try {
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

  return {
    formatDate,
    formatRelativeTime,
    formatCurrency,
    formatNumber,
    locale,
  }
}

