import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Éclaircit une couleur hex vers le blanc (0 = inchangée, 1 = blanc).
 * Utilisé pour dériver un dégradé à deux tons à partir d'une seule couleur
 * de marque dynamique (ex: catalogue public par organisation).
 */
export function lightenHexColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '')
  const bigint = parseInt(normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized, 16)
  if (Number.isNaN(bigint)) return hex
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Placeholder "shimmer" générique en base64, à utiliser comme `blurDataURL` pour les
 * images distantes (uploadées par les organismes) dont on ne peut pas calculer de vrai
 * blurhash à la volée. Donne un fondu de chargement plutôt qu'un "pop-in" brutal.
 */
export function shimmerDataURL(width: number, height: number): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#e5e7eb" offset="20%" />
          <stop stop-color="#f3f4f6" offset="50%" />
          <stop stop-color="#e5e7eb" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="#e5e7eb" />
      <rect width="${width}" height="${height}" fill="url(#g)" />
    </svg>`
  const toBase64 = typeof window === 'undefined' ? (str: string) => Buffer.from(str).toString('base64') : btoa
  return `data:image/svg+xml;base64,${toBase64(svg)}`
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'À l\'instant'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} min`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `Il y a ${diffInHours}h`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `Il y a ${diffInDays}j`
  }

  return formatDate(date)
}

export function formatDate(date: Date | string | null | undefined, locale: string = 'fr-FR'): string {
  if (!date) return ''
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string, locale: string = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function generateStudentNumber(orgCode: string, year: string, sequence: number): string {
  const yearSuffix = year.slice(-2)
  return `${orgCode}${yearSuffix}${sequence.toString().padStart(4, '0')}`
}

export function generateInvoiceNumber(orgCode: string, year: string, sequence: number): string {
  return `INV-${orgCode}-${year}-${sequence.toString().padStart(6, '0')}`
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
