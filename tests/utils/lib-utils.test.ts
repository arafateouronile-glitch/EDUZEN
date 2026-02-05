/**
 * Tests unitaires pour lib/utils.ts (cn, formatCurrency, formatRelativeTime, etc.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatCurrency,
  formatRelativeTime,
  formatDate,
  formatDateTime,
  generateStudentNumber,
  generateInvoiceNumber,
  debounce,
  truncate,
  formatFileSize,
} from '@/lib/utils'

describe('lib/utils', () => {
  describe('cn', () => {
    it('devrait fusionner des classes avec clsx et tailwind-merge', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
      expect(cn(false && 'hidden', 'block')).toBe('block')
    })
  })

  describe('formatCurrency', () => {
    it('devrait formater un montant en EUR par défaut', () => {
      expect(formatCurrency(1234.56)).toMatch(/1[\s ]234[,.]56\s*€/)
      expect(formatCurrency(0)).toContain('0')
      expect(formatCurrency(0)).toContain('€')
    })

    it('devrait accepter une devise personnalisée', () => {
      const result = formatCurrency(100, 'USD')
      expect(result).toContain('100')
      expect(result).toMatch(/\$|USD/)
    })
  })

  describe('formatRelativeTime', () => {
    it('devrait retourner "À l\'instant" pour une date très récente', () => {
      const now = new Date()
      expect(formatRelativeTime(now)).toBe("À l'instant")
      expect(formatRelativeTime(now.toISOString())).toBe("À l'instant")
    })

    it('devrait retourner des minutes', () => {
      const d = new Date(Date.now() - 5 * 60 * 1000)
      expect(formatRelativeTime(d)).toBe('Il y a 5 min')
    })

    it('devrait retourner des heures', () => {
      const d = new Date(Date.now() - 2 * 60 * 60 * 1000)
      expect(formatRelativeTime(d)).toBe('Il y a 2h')
    })

    it('devrait retourner des jours', () => {
      const d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      expect(formatRelativeTime(d)).toBe('Il y a 3j')
    })

    it('devrait appeler formatDate pour plus de 7 jours', () => {
      const d = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      const result = formatRelativeTime(d)
      expect(result).not.toBe("À l'instant")
      expect(result).not.toMatch(/^Il y a \d+ (min|h|j)$/)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('formatDate', () => {
    it('devrait formater une date en français', () => {
      const result = formatDate('2024-06-15')
      expect(result).toMatch(/2024/)
      expect(result).toMatch(/juin|June|15/)
    })

    it('devrait retourner une chaîne vide pour null/undefined', () => {
      expect(formatDate(null)).toBe('')
      expect(formatDate(undefined)).toBe('')
    })

    it('devrait accepter un objet Date', () => {
      const d = new Date('2024-01-01')
      expect(formatDate(d)).toMatch(/2024/)
    })
  })

  describe('formatDateTime', () => {
    it('devrait formater date et heure', () => {
      const result = formatDateTime('2024-06-15T14:30:00')
      expect(result).toMatch(/2024/)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('generateStudentNumber', () => {
    it('devrait générer un numéro étudiant avec préfixe et séquence', () => {
      expect(generateStudentNumber('ORG', '2024', 1)).toBe('ORG240001')
      expect(generateStudentNumber('EDU', '2023', 42)).toBe('EDU230042')
      expect(generateStudentNumber('X', '2025', 9999)).toBe('X259999')
    })
  })

  describe('generateInvoiceNumber', () => {
    it('devrait générer un numéro de facture', () => {
      expect(generateInvoiceNumber('ORG', '2024', 1)).toBe('INV-ORG-2024-000001')
      expect(generateInvoiceNumber('EDU', '2023', 123)).toBe('INV-EDU-2023-000123')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('devrait retarder l\'exécution de la fonction', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)
      debounced('a')
      expect(fn).not.toHaveBeenCalled()
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('a')
    })

    it('devrait annuler l\'appel précédent si rappelé avant la fin du délai', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)
      debounced('a')
      debounced('b')
      vi.advanceTimersByTime(50)
      debounced('c')
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('c')
    })
  })

  describe('truncate', () => {
    it('devrait retourner le texte tel quel si plus court que la longueur', () => {
      expect(truncate('hello', 10)).toBe('hello')
      expect(truncate('hi', 2)).toBe('hi')
    })

    it('devrait tronquer et ajouter ... si plus long', () => {
      expect(truncate('hello world', 5)).toBe('hello...')
      expect(truncate('abcdefgh', 3)).toBe('abc...')
    })
  })

  describe('formatFileSize', () => {
    it('devrait retourner "0 Bytes" pour 0', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
    })

    it('devrait formater en Bytes, KB, MB, GB', () => {
      expect(formatFileSize(500)).toMatch(/\d+ Bytes/)
      expect(formatFileSize(1024)).toMatch(/\d+ KB/)
      expect(formatFileSize(1024 * 1024)).toMatch(/\d+ MB/)
      expect(formatFileSize(1024 * 1024 * 1024)).toMatch(/\d+ GB/)
    })
  })
})
