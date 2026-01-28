/**
 * Tests unitaires pour les fonctions de formatage
 */

import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatCurrency,
  formatNumber,
  formatRelativeTime,
  formatFileSize,
} from '@/lib/utils/format'

describe('formatDate', () => {
  it('devrait formater une date correctement', () => {
    const date = new Date('2024-01-15')
    const result = formatDate(date, 'dd/MM/yyyy')
    expect(result).toBe('15/01/2024')
  })

  it('devrait retourner une chaîne vide pour une date invalide', () => {
    const result = formatDate(null)
    expect(result).toBe('')
  })

  it('devrait gérer les dates en chaîne de caractères', () => {
    const dateString = '2024-01-15T10:30:00Z'
    const result = formatDate(dateString, 'dd/MM/yyyy')
    expect(result).toBe('15/01/2024')
  })
})

describe('formatCurrency', () => {
  it('devrait formater une devise en EUR par défaut', () => {
    const result = formatCurrency(1000)
    // Accepte espace normal ou insécable
    expect(result).toMatch(/1[\s\u202F]000/)
    expect(result).toContain('€')
  })

  it('devrait formater une devise XOF', () => {
    const result = formatCurrency(1000, 'XOF')
    // Accepte espace normal ou insécable
    expect(result).toMatch(/1[\s\u202F]000/)
    // XOF est affiché comme "F CFA" en français
    expect(result).toMatch(/CFA|XOF/)
  })

  it('devrait gérer les nombres décimaux', () => {
    const result = formatCurrency(1234.56, 'EUR')
    // Accepte espace normal ou insécable
    expect(result).toMatch(/1[\s\u202F]234,56/)
  })
})

describe('formatNumber', () => {
  it('devrait formater un nombre avec 2 décimales par défaut', () => {
    const result = formatNumber(1234.567)
    // Accepte espace normal ou insécable
    expect(result).toMatch(/1[\s\u202F]234,57/)
  })

  it('devrait formater un nombre avec un nombre spécifique de décimales', () => {
    const result = formatNumber(1234.567, 1)
    // Accepte espace normal ou insécable
    expect(result).toMatch(/1[\s\u202F]234,6/)
  })

  it('devrait gérer les nombres entiers', () => {
    const result = formatNumber(1000)
    // Accepte espace normal ou insécable
    expect(result).toMatch(/1[\s\u202F]000,00/)
  })
})

describe('formatRelativeTime', () => {
  it('devrait formater "À l\'instant" pour les dates récentes', () => {
    const date = new Date()
    const result = formatRelativeTime(date)
    expect(result).toBe('À l\'instant')
  })

  it('devrait formater "Il y a X minutes"', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000) // Il y a 5 minutes
    const result = formatRelativeTime(date)
    expect(result).toBe('Il y a 5 minutes')
  })

  it('devrait formater "Il y a X heures"', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000) // Il y a 3 heures
    const result = formatRelativeTime(date)
    expect(result).toBe('Il y a 3 heures')
  })

  it('devrait formater "Il y a X jours"', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // Il y a 2 jours
    const result = formatRelativeTime(date)
    expect(result).toBe('Il y a 2 jours')
  })

  it('devrait formater "Il y a X semaines"', () => {
    const date = new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000) // Il y a 2 semaines
    const result = formatRelativeTime(date)
    expect(result).toBe('Il y a 2 semaines')
  })

  it('devrait formater "Il y a X mois"', () => {
    const date = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000) // Il y a ~3 mois
    const result = formatRelativeTime(date)
    expect(result).toContain('mois')
  })

  it('devrait retourner une chaîne vide pour une date invalide', () => {
    const result = formatRelativeTime(null as any)
    expect(result).toBe('')
  })
})

describe('formatFileSize', () => {
  it('devrait formater les bytes en B', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('devrait formater en KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('devrait formater en MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })

  it('devrait formater en GB', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB')
  })

  it('devrait formater en TB', () => {
    expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB')
  })

  it('devrait retourner "0 B" pour null ou undefined', () => {
    expect(formatFileSize(null)).toBe('0 B')
    expect(formatFileSize(undefined)).toBe('0 B')
  })

  it('devrait arrondir correctement', () => {
    expect(formatFileSize(1024 + 512)).toBe('1.5 KB')
    expect(formatFileSize(1024 * 1024 + 512 * 1024)).toBe('1.5 MB')
  })
})

