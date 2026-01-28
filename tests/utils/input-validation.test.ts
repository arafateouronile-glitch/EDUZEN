/**
 * Tests unitaires pour input-validation
 */

import { describe, it, expect } from 'vitest'
import {
  validateString,
  validateEmail,
  validateUUID,
  validateInteger,
  validateFloat,
  sanitizeHTML,
  sanitizeText,
  hasSuspiciousContent,
} from '@/lib/utils/input-validation'

describe('validateString', () => {
  it('devrait valider une chaîne valide', () => {
    const result = validateString('test')
    expect(result.isValid).toBe(true)
    expect(result.sanitized).toBe('test')
  })

  it('devrait valider une chaîne vide si non requise', () => {
    const result = validateString('', { required: false })
    expect(result.isValid).toBe(true)
  })

  it('devrait rejeter une chaîne vide si requise', () => {
    const result = validateString('', { required: true })
    expect(result.isValid).toBe(false)
  })

  it('devrait valider la longueur minimale', () => {
    const result = validateString('test', { minLength: 3 })
    expect(result.isValid).toBe(true)
  })

  it('devrait rejeter si trop court', () => {
    const result = validateString('te', { minLength: 3 })
    expect(result.isValid).toBe(false)
  })

  it('devrait valider la longueur maximale', () => {
    const result = validateString('test', { maxLength: 10 })
    expect(result.isValid).toBe(true)
  })

  it('devrait rejeter si trop long', () => {
    const result = validateString('test', { maxLength: 3 })
    expect(result.isValid).toBe(false)
  })
})

describe('validateEmail', () => {
  it('devrait valider un email valide', () => {
    const result = validateEmail('test@example.com')
    expect(result.isValid).toBe(true)
  })

  it('devrait rejeter un email invalide', () => {
    const result = validateEmail('invalid-email')
    expect(result.isValid).toBe(false)
  })

  it('devrait rejeter une chaîne vide', () => {
    const result = validateEmail('')
    expect(result.isValid).toBe(false)
  })
})

describe('validateUUID', () => {
  it('devrait valider un UUID valide', () => {
    const result = validateUUID('550e8400-e29b-41d4-a716-446655440000')
    expect(result.isValid).toBe(true)
  })

  it('devrait rejeter un UUID invalide', () => {
    const result = validateUUID('invalid-uuid')
    expect(result.isValid).toBe(false)
  })

  it('devrait rejeter une chaîne vide', () => {
    const result = validateUUID('')
    expect(result.isValid).toBe(false)
  })
})

describe('validateInteger', () => {
  it('devrait valider un entier valide', () => {
    const result = validateInteger('123')
    expect(result.isValid).toBe(true)
    // validateInteger retourne sanitized comme string, pas comme number
    expect(result.sanitized).toBe('123')
  })

  it('devrait rejeter un nombre décimal', () => {
    const result = validateInteger('123.45')
    expect(result.isValid).toBe(false)
  })

  it('devrait valider les limites min/max', () => {
    const result = validateInteger('50', { min: 0, max: 100 })
    expect(result.isValid).toBe(true)
  })

  it('devrait rejeter si en dessous du minimum', () => {
    const result = validateInteger('10', { min: 20 })
    expect(result.isValid).toBe(false)
  })

  it('devrait rejeter si au-dessus du maximum', () => {
    const result = validateInteger('150', { max: 100 })
    expect(result.isValid).toBe(false)
  })
})

describe('validateFloat', () => {
  it('devrait valider un nombre décimal valide', () => {
    const result = validateFloat('123.45')
    expect(result.isValid).toBe(true)
    // validateFloat retourne sanitized comme string
    expect(result.sanitized).toBe('123.45')
  })

  it('devrait valider un entier comme float', () => {
    const result = validateFloat('123')
    expect(result.isValid).toBe(true)
    expect(result.sanitized).toBe('123')
  })

  it('devrait rejeter une chaîne non numérique', () => {
    const result = validateFloat('abc')
    expect(result.isValid).toBe(false)
  })
})

describe('sanitizeHTML', () => {
  it('devrait supprimer les balises script', () => {
    const result = sanitizeHTML('<script>alert("xss")</script><p>Safe</p>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('Safe')
  })

  it('devrait conserver les balises HTML sûres', () => {
    const result = sanitizeHTML('<p>Test</p><strong>Bold</strong>')
    expect(result).toContain('<p>')
    expect(result).toContain('<strong>')
  })

  it('devrait échapper les caractères HTML', () => {
    const result = sanitizeHTML('<>&"\'')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })
})

describe('sanitizeText', () => {
  it('devrait supprimer tous les caractères HTML', () => {
    const result = sanitizeText('<p>Test</p>')
    expect(result).toBe('Test')
  })

  it('devrait échapper les caractères spéciaux', () => {
    const result = sanitizeText('<>&"\'')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })
})

describe('hasSuspiciousContent', () => {
  it('devrait détecter les tentatives XSS avec script', () => {
    expect(hasSuspiciousContent('<script>alert("xss")</script>')).toBe(true)
  })

  it('devrait détecter les tentatives XSS avec javascript:', () => {
    expect(hasSuspiciousContent('javascript:alert("xss")')).toBe(true)
  })

  it('devrait détecter les attributs événements', () => {
    expect(hasSuspiciousContent('<div onclick="alert(1)">')).toBe(true)
    expect(hasSuspiciousContent('<img onerror="alert(1)">')).toBe(true)
  })

  it('devrait détecter les iframes', () => {
    expect(hasSuspiciousContent('<iframe src="evil.com">')).toBe(true)
  })

  it('ne devrait pas détecter de contenu suspect dans du texte normal', () => {
    expect(hasSuspiciousContent('Hello world')).toBe(false)
    expect(hasSuspiciousContent('Test email: test@example.com')).toBe(false)
  })

  // Note: hasSuspiciousContent ne détecte que les patterns XSS, pas les SQL injections
  // Les SQL injections sont gérées par sanitizeSQL
})
