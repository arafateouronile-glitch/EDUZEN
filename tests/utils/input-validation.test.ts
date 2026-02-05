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
  escapeHTML,
  sanitizeSQL,
  sanitizeNoSQL,
  sanitizeCommand,
  sanitizePath,
  validateURL,
  validatePhone,
  validateDate,
  validateSIRET,
  validateVAT,
  validatePostalCode,
  validateJSON,
  validateObject,
  truncate,
  normalizeWhitespace,
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

  it('devrait valider avec pattern', () => {
    const result = validateString('abc123', { pattern: /^[a-z0-9]+$/ })
    expect(result.isValid).toBe(true)
  })

  it('devrait rejeter si pattern non respecté', () => {
    const result = validateString('abc-123', { pattern: /^[a-z0-9]+$/ })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Format invalide')
  })

  it('devrait valider avec allowedChars', () => {
    const result = validateString('abc', { allowedChars: /^[a-z]+$/ })
    expect(result.isValid).toBe(true)
  })

  it('devrait rejeter si caractères non autorisés', () => {
    const result = validateString('abc123', { allowedChars: /^[a-z]+$/ })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Caractères non autorisés détectés')
  })

  it('devrait valider avec customValidator', () => {
    const result = validateString('ok', { customValidator: (s) => s === 'ok' })
    expect(result.isValid).toBe(true)
  })

  it('devrait rejeter si customValidator échoue', () => {
    const result = validateString('no', { customValidator: (s) => s === 'ok' })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Validation personnalisée échouée')
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

  it('devrait retourner une chaîne vide pour input vide', () => {
    expect(sanitizeHTML('')).toBe('')
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

  it('devrait retourner une chaîne vide pour input vide', () => {
    expect(sanitizeText('')).toBe('')
  })
})

describe('escapeHTML', () => {
  it('devrait encoder les entités HTML', () => {
    expect(escapeHTML('<')).toBe('&lt;')
    expect(escapeHTML('>')).toBe('&gt;')
    expect(escapeHTML('&')).toBe('&amp;')
    expect(escapeHTML('"')).toBe('&quot;')
  })

  it('devrait retourner une chaîne vide pour input vide', () => {
    expect(escapeHTML('')).toBe('')
  })
})

describe('sanitizeSQL', () => {
  it('devrait échapper les apostrophes et retirer caractères dangereux', () => {
    expect(sanitizeSQL("O'Brien")).toContain("''")
    expect(sanitizeSQL('a;--b')).not.toContain(';')
    expect(sanitizeSQL('a;--b')).not.toContain('--')
    expect(sanitizeSQL('union')).not.toContain('union')
  })

  it('devrait retourner une chaîne vide pour input vide', () => {
    expect(sanitizeSQL('')).toBe('')
  })
})

describe('sanitizeNoSQL', () => {
  it('devrait retourner les primitives inchangées', () => {
    expect(sanitizeNoSQL('a')).toBe('a')
    expect(sanitizeNoSQL(1)).toBe(1)
    expect(sanitizeNoSQL(null)).toBe(null)
  })

  it('devrait retirer les clés commençant par $', () => {
    const out = sanitizeNoSQL({ $gt: 1, ok: 2 }) as Record<string, unknown>
    expect(out.$gt).toBeUndefined()
    expect(out.ok).toBe(2)
  })

  it('devrait sanitizer récursivement les objets imbriqués', () => {
    const out = sanitizeNoSQL({ a: { $where: 1, b: 2 } }) as Record<string, unknown>
    const inner = out.a as Record<string, unknown>
    expect(inner.$where).toBeUndefined()
    expect(inner.b).toBe(2)
  })
})

describe('sanitizeCommand', () => {
  it('devrait retirer les caractères shell dangereux', () => {
    expect(sanitizeCommand('a;b|c')).not.toMatch(/[;&|]/)
  })

  it('devrait retourner une chaîne vide pour input vide', () => {
    expect(sanitizeCommand('')).toBe('')
  })
})

describe('sanitizePath', () => {
  it('devrait retirer .. et normaliser les slashes', () => {
    expect(sanitizePath('a/../b')).not.toContain('..')
    expect(sanitizePath('a//b')).toContain('/')
    expect(sanitizePath('a\\b')).toContain('/')
  })

  it('devrait retourner une chaîne vide pour input vide', () => {
    expect(sanitizePath('')).toBe('')
  })
})

describe('validateURL', () => {
  it('devrait valider une URL avec protocole', () => {
    const r = validateURL('https://example.com')
    expect(r.isValid).toBe(true)
    expect(r.sanitized).toBe('https://example.com')
  })

  it('devrait rejeter une URL sans protocole', () => {
    const r = validateURL('example.com')
    expect(r.isValid).toBe(false)
  })

  it('devrait rejeter une chaîne vide', () => {
    expect(validateURL('').isValid).toBe(false)
  })
})

describe('validatePhone', () => {
  it('devrait valider un numéro français', () => {
    const r = validatePhone('0612345678')
    expect(r.isValid).toBe(true)
  })

  it('devrait rejeter une chaîne vide', () => {
    expect(validatePhone('').isValid).toBe(false)
  })

  it('devrait rejeter un format invalide', () => {
    expect(validatePhone('abc').isValid).toBe(false)
  })
})

describe('validateDate', () => {
  it('devrait valider une date ISO', () => {
    const r = validateDate('2024-01-15T10:00:00Z')
    expect(r.isValid).toBe(true)
  })

  it('devrait rejeter une chaîne vide', () => {
    expect(validateDate('').isValid).toBe(false)
  })

  it('devrait rejeter un format invalide', () => {
    expect(validateDate('15/01/2024').isValid).toBe(false)
  })
})

describe('validateSIRET', () => {
  it('devrait rejeter une chaîne vide', () => {
    expect(validateSIRET('').isValid).toBe(false)
  })

  it('devrait rejeter si pas 14 chiffres', () => {
    expect(validateSIRET('123').isValid).toBe(false)
  })

  it('devrait rejeter si Luhn échoue', () => {
    expect(validateSIRET('12345678901234').isValid).toBe(false)
  })
})

describe('validateVAT', () => {
  it('devrait valider un format FR typique', () => {
    const r = validateVAT('FR12345678901')
    expect(r.isValid).toBe(true)
  })

  it('devrait rejeter une chaîne vide', () => {
    expect(validateVAT('').isValid).toBe(false)
  })

  it('devrait rejeter un format invalide', () => {
    expect(validateVAT('XX1').isValid).toBe(false)
  })
})

describe('validatePostalCode', () => {
  it('devrait valider un code FR 5 chiffres', () => {
    const r = validatePostalCode('75001', 'FR')
    expect(r.isValid).toBe(true)
  })

  it('devrait valider un code BE 4 chiffres', () => {
    const r = validatePostalCode('1000', 'BE')
    expect(r.isValid).toBe(true)
  })

  it('devrait valider un code CH 4 chiffres', () => {
    const r = validatePostalCode('1200', 'CH')
    expect(r.isValid).toBe(true)
  })

  it('devrait rejeter une chaîne vide', () => {
    expect(validatePostalCode('').isValid).toBe(false)
  })

  it('devrait rejeter un format invalide pour FR', () => {
    expect(validatePostalCode('123', 'FR').isValid).toBe(false)
  })
})

describe('validateJSON', () => {
  it('devrait valider un JSON valide', () => {
    const r = validateJSON('{"a":1}')
    expect(r.isValid).toBe(true)
    expect(r.sanitized).toBeDefined()
  })

  it('devrait rejeter une chaîne vide', () => {
    expect(validateJSON('').isValid).toBe(false)
  })

  it('devrait rejeter un JSON invalide', () => {
    expect(validateJSON('{invalid}').isValid).toBe(false)
  })
})

describe('validateObject', () => {
  it('devrait valider un objet conforme au schéma', () => {
    const r = validateObject(
      { name: 'x', age: '25' },
      {
        name: (v) => (typeof v === 'string' && v.length > 0 ? { isValid: true, sanitized: v } : { isValid: false, errors: ['name'] }),
        age: (v) => (String(v).match(/^\d+$/) ? { isValid: true, sanitized: String(v) } : { isValid: false, errors: ['age'] }),
      }
    )
    expect(r.isValid).toBe(true)
    expect(r.sanitized?.name).toBe('x')
    expect(r.sanitized?.age).toBe('25')
  })

  it('devrait rejeter si un champ échoue', () => {
    const r = validateObject(
      { name: '' },
      { name: (v) => (typeof v === 'string' && v.length > 0 ? { isValid: true, sanitized: v } : { isValid: false, errors: ['required'] }) }
    )
    expect(r.isValid).toBe(false)
    expect(r.errors?.name).toContain('required')
  })
})

describe('truncate', () => {
  it('devrait tronquer si plus long que maxLength', () => {
    expect(truncate('abcdef', 3)).toBe('abc')
  })

  it('devrait laisser inchangé si plus court ou égal', () => {
    expect(truncate('ab', 5)).toBe('ab')
    expect(truncate('abc', 3)).toBe('abc')
  })

  it('devrait gérer input vide ou null', () => {
    expect(truncate('', 5)).toBe('')
  })
})

describe('normalizeWhitespace', () => {
  it('devrait remplacer espaces multiples par un seul et trim', () => {
    expect(normalizeWhitespace('  a   b  ')).toBe('a b')
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
