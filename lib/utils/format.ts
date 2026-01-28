/**
 * Utilitaires de formatage
 */

import { format as dateFnsFormat } from 'date-fns'
import { fr } from 'date-fns/locale'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * Formate une date selon le format français
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: string = 'dd/MM/yyyy'
): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    return dateFnsFormat(dateObj, format, { locale: fr })
  } catch (error) {
    logger.error('Error formatting date', sanitizeError(error), { date, format })
    return ''
  }
}

/**
 * Formate une devise
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

/**
 * Formate un nombre
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Formate une date en temps relatif (ex: "il y a 2 heures")
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'À l\'instant'
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`
    }
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) {
      return `Il y a ${diffInWeeks} semaine${diffInWeeks > 1 ? 's' : ''}`
    }
    
    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) {
      return `Il y a ${diffInMonths} mois`
    }
    
    const diffInYears = Math.floor(diffInDays / 365)
    return `Il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`
  } catch (error) {
    logger.error('Error formatting relative time', sanitizeError(error), { date })
    return ''
  }
}

/**
 * Formate une taille de fichier en bytes en format lisible (KB, MB, GB, etc.)
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

