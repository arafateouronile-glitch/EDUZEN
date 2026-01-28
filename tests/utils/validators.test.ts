/**
 * Tests unitaires pour les validateurs
 */

import { describe, it, expect } from 'vitest'
import {
  validateRequired,
  validateEmail,
  validatePositiveAmount,
  validateDate,
  validateFutureDate,
} from '@/lib/utils/validators'
import { errorHandler } from '@/lib/errors'

describe('validateRequired', () => {
  it('devrait valider que tous les champs requis sont présents', () => {
    const data = {
      name: 'Test',
      email: 'test@example.com',
      age: 25,
    }

    expect(() => validateRequired(data, ['name', 'email'])).not.toThrow()
  })

  it('devrait lancer une erreur si un champ requis est manquant', () => {
    const data = {
      name: 'Test',
      email: '',
    }

    expect(() => validateRequired(data, ['name', 'email'])).toThrow()
  })

  it('devrait lancer une erreur si un champ requis est null', () => {
    const data = {
      name: 'Test',
      email: null,
    }

    expect(() => validateRequired(data, ['name', 'email'])).toThrow()
  })

  it('devrait lancer une erreur si un champ requis est undefined', () => {
    const data = {
      name: 'Test',
      email: undefined,
    }

    expect(() => validateRequired(data, ['name', 'email'])).toThrow()
  })
})

describe('validateEmail', () => {
  it('devrait valider un email valide', () => {
    expect(() => validateEmail('test@example.com')).not.toThrow()
    expect(() => validateEmail('user.name@domain.co.uk')).not.toThrow()
  })

  it('devrait lancer une erreur pour un email invalide', () => {
    expect(() => validateEmail('invalid-email')).toThrow()
    expect(() => validateEmail('test@')).toThrow()
    expect(() => validateEmail('@example.com')).toThrow()
    expect(() => validateEmail('test@example')).toThrow()
  })

  it('devrait lancer une erreur pour une chaîne vide', () => {
    expect(() => validateEmail('')).toThrow()
  })
})

describe('validatePositiveAmount', () => {
  it('devrait valider un montant positif', () => {
    expect(() => validatePositiveAmount(100)).not.toThrow()
    expect(() => validatePositiveAmount(0.01)).not.toThrow()
    expect(() => validatePositiveAmount(1000.50)).not.toThrow()
  })

  it('devrait lancer une erreur pour un montant négatif', () => {
    expect(() => validatePositiveAmount(-100)).toThrow()
  })

  it('devrait lancer une erreur pour zéro', () => {
    expect(() => validatePositiveAmount(0)).toThrow()
  })

  it('devrait utiliser le nom de champ personnalisé', () => {
    try {
      validatePositiveAmount(-100, 'price')
    } catch (error: any) {
      expect(error.context?.field).toBe('price')
    }
  })
})

describe('validateDate', () => {
  it('devrait valider une date valide', () => {
    expect(() => validateDate('2024-01-15')).not.toThrow()
    expect(() => validateDate('2024-01-15T10:30:00Z')).not.toThrow()
  })

  it('devrait lancer une erreur pour une date invalide', () => {
    expect(() => validateDate('invalid-date')).toThrow()
    expect(() => validateDate('2024-13-45')).toThrow()
  })

  it('devrait lancer une erreur pour une chaîne vide', () => {
    expect(() => validateDate('')).toThrow()
  })

  it('devrait utiliser le nom de champ personnalisé', () => {
    try {
      validateDate('invalid', 'startDate')
    } catch (error: any) {
      expect(error.context?.field).toBe('startDate')
    }
  })
})

describe('validateFutureDate', () => {
  it('devrait valider une date dans le futur', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    
    expect(() => validateFutureDate(futureDate.toISOString())).not.toThrow()
  })

  it('devrait lancer une erreur pour une date dans le passé', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    
    expect(() => validateFutureDate(pastDate.toISOString())).toThrow()
  })

  it('devrait lancer une erreur pour la date actuelle', () => {
    const now = new Date().toISOString()
    
    expect(() => validateFutureDate(now)).toThrow()
  })

  it('devrait lancer une erreur pour une date invalide', () => {
    expect(() => validateFutureDate('invalid-date')).toThrow()
  })

  it('devrait utiliser le nom de champ personnalisé', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    
    try {
      validateFutureDate(pastDate.toISOString(), 'endDate')
    } catch (error: any) {
      expect(error.context?.field).toBe('endDate')
    }
  })
})
