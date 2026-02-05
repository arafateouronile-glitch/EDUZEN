/**
 * Tests unitaires pour api-validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  validateQueryParams,
  validateRequestBody,
  validateObject,
  createValidationErrorResponse,
  withQueryValidation,
  withBodyValidation,
  paginationSchema,
  searchSchema,
  type ValidationSchema,
} from '@/lib/utils/api-validation'

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('api-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateQueryParams', () => {
    it('devrait valider des query params conformes au schéma', async () => {
      const req = new NextRequest('http://localhost/api?page=1&limit=10')
      const r = await validateQueryParams(req, paginationSchema)
      expect(r.isValid).toBe(true)
      expect(r.data).toHaveProperty('page')
      expect(r.data).toHaveProperty('limit')
      expect([1, '1']).toContain(r.data?.page)
      expect([10, '10']).toContain(r.data?.limit)
    })

    it('devrait retourner erreur si champ requis manquant', async () => {
      const req = new NextRequest('http://localhost/api?limit=5')
      const r = await validateQueryParams(req, searchSchema)
      expect(r.isValid).toBe(false)
      expect(r.errors).toHaveLength(1)
      expect(r.errors![0].field).toBe('q')
      expect(r.errors![0].errors).toContain('Paramètre requis')
    })

    it('devrait ignorer les champs absents non requis', async () => {
      const req = new NextRequest('http://localhost/api')
      const r = await validateQueryParams(req, paginationSchema)
      expect(r.isValid).toBe(true)
      expect(r.data).toEqual({})
    })

    it('devrait affecter result.sanitized à data[field] quand validation OK (l.98)', async () => {
      const schema: ValidationSchema = {
        x: { type: 'string', required: true },
      }
      const req = new NextRequest('http://localhost/api?x=hello')
      const r = await validateQueryParams(req, schema)
      expect(r.isValid).toBe(true)
      expect(r.data).toHaveProperty('x', 'hello')
    })
  })

  describe('validateRequestBody', () => {
    it('devrait valider un body JSON conforme', async () => {
      const schema: ValidationSchema = {
        name: { type: 'string', required: true, minLength: 1 },
        count: { type: 'integer', required: false, min: 0 },
      }
      const req = new NextRequest('http://localhost/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', count: 5 }),
      })
      const r = await validateRequestBody(req, schema)
      expect(r.isValid).toBe(true)
      expect(r.data).toHaveProperty('name', 'Test')
      expect(r.data).toHaveProperty('count')
      expect([5, '5']).toContain(r.data?.count)
    })

    it('devrait retourner erreur si body JSON invalide', async () => {
      const req = new NextRequest('http://localhost/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      })
      const r = await validateRequestBody(req, { x: { type: 'string' } })
      expect(r.isValid).toBe(false)
      expect(r.errors).toHaveLength(1)
      expect(r.errors![0].field).toBe('_body')
      expect(r.errors![0].errors).toContain('Corps de requête invalide (JSON attendu)')
    })
  })

  describe('validateObject', () => {
    it('devrait valider un objet conforme au schéma', () => {
      const schema: ValidationSchema = {
        id: { type: 'uuid', required: true },
        name: { type: 'string', required: false },
      }
      const r = validateObject(
        { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Foo' },
        schema,
        '/api/test'
      )
      expect(r.isValid).toBe(true)
      expect(r.data).toMatchObject({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Foo' })
    })

    it('devrait retourner erreur si champ requis manquant', () => {
      const schema: ValidationSchema = {
        id: { type: 'uuid', required: true },
      }
      const r = validateObject({}, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors).toHaveLength(1)
      expect(r.errors![0].field).toBe('id')
      expect(r.errors![0].errors).toContain('Champ requis')
    })

    it('devrait valider type boolean (true/false, 1/0)', () => {
      const schema: ValidationSchema = {
        ok: { type: 'boolean', required: false },
      }
      expect(validateObject({ ok: true }, schema).isValid).toBe(true)
      expect(validateObject({ ok: 'true' }, schema).isValid).toBe(true)
      expect(validateObject({ ok: '1' }, schema).isValid).toBe(true)
      expect(validateObject({ ok: 'false' }, schema).isValid).toBe(true)
      expect(validateObject({ ok: '0' }, schema).isValid).toBe(true)
      const r = validateObject({ ok: 'invalid' }, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors![0].errors).toContain('Boolean attendu (true/false)')
    })

    it('devrait valider type date (ISO 8601)', () => {
      const schema: ValidationSchema = {
        d: { type: 'date', required: false },
      }
      const r1 = validateObject({ d: '2024-01-15T10:00:00.000Z' }, schema)
      expect(r1.isValid).toBe(true)
      expect(r1.data?.d).toMatch(/^\d{4}-\d{2}-\d{2}/)
      const r2 = validateObject({ d: 'not-a-date' }, schema)
      expect(r2.isValid).toBe(false)
      expect(r2.errors![0].errors).toContain('Date invalide')
      const r3 = validateObject({ d: 123 }, schema)
      expect(r3.isValid).toBe(false)
      expect(r3.errors![0].errors).toContain('Date ISO 8601 attendue')
    })

    it('devrait valider type html (sanitize + maxLength)', () => {
      const schema: ValidationSchema = {
        h: { type: 'html', required: false, maxLength: 5 },
      }
      expect(validateObject({ h: 'Hi' }, schema).isValid).toBe(true)
      const r = validateObject({ h: '123456' }, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors![0].errors.some((e) => e.includes('Maximum'))).toBe(true)
      const r2 = validateObject({ h: 1 }, schema)
      expect(r2.isValid).toBe(false)
      expect(r2.errors![0].errors).toContain('HTML attendu')
    })

    it('devrait valider type url (http/https uniquement)', () => {
      const schema: ValidationSchema = {
        u: { type: 'url', required: false },
      }
      expect(validateObject({ u: 'https://example.com' }, schema).isValid).toBe(true)
      expect(validateObject({ u: 'http://a.co' }, schema).isValid).toBe(true)
      const r1 = validateObject({ u: 'ftp://x.co' }, schema)
      expect(r1.isValid).toBe(false)
      expect(r1.errors![0].errors).toContain('Seuls les protocoles HTTP et HTTPS sont autorisés')
      const r2 = validateObject({ u: 'not-a-url' }, schema)
      expect(r2.isValid).toBe(false)
      expect(r2.errors![0].errors).toContain('URL invalide')
      const r3 = validateObject({ u: 1 }, schema)
      expect(r3.isValid).toBe(false)
      expect(r3.errors![0].errors).toContain('URL attendue')
    })

    it('devrait valider allowedValues pour string', () => {
      const schema: ValidationSchema = {
        x: { type: 'string', required: true, allowedValues: ['a', 'b'] },
      }
      expect(validateObject({ x: 'a' }, schema).isValid).toBe(true)
      const r = validateObject({ x: 'c' }, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors![0].errors.some((e) => e.includes('Valeur non autorisée'))).toBe(true)
    })

    it('devrait valider type json (l.249)', () => {
      const schema: ValidationSchema = {
        j: { type: 'json', required: false },
      }
      expect(validateObject({ j: '{"a":1}' }, schema).isValid).toBe(true)
      expect(validateObject({ j: '[]' }, schema).isValid).toBe(true)
      const r = validateObject({ j: 'not json' }, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors![0].errors.some((e) => e.includes('JSON') || e.includes('invalide'))).toBe(true)
    })

    it('devrait retourner "Type de validation non supporté" pour type inconnu (default, l.258)', () => {
      const schema: ValidationSchema = {
        x: { type: 'binary' as any, required: false },
      }
      const r = validateObject({ x: 'foo' }, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors![0].errors).toContain('Type de validation non supporté')
    })

    it('devrait retourner "Chaîne de caractères attendue" si value non-string pour champ string (l.270)', () => {
      const schema: ValidationSchema = {
        x: { type: 'string', required: false },
      }
      const r = validateObject({ x: 123 }, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors![0].errors).toContain('Chaîne de caractères attendue')
    })

    it('devrait valider type email (l.225)', () => {
      const schema: ValidationSchema = {
        e: { type: 'email', required: false },
      }
      expect(validateObject({ e: 'a@b.co' }, schema).isValid).toBe(true)
      const r = validateObject({ e: 'not-an-email' }, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors![0].errors.some((e) => e.includes('Email') || e.includes('invalide'))).toBe(true)
    })

    it('devrait continuer (skip) si optional + pattern et value chaîne vide (l.171-172)', () => {
      const schema: ValidationSchema = {
        x: { type: 'string', required: false, pattern: /a+/ },
      }
      const r = validateObject({ x: '' }, schema)
      expect(r.isValid).toBe(true)
      expect(r.data).not.toHaveProperty('x')
    })

    it('devrait rejeter le contenu suspect (hasSuspiciousContent, l.208-216)', () => {
      const schema: ValidationSchema = {
        x: { type: 'string', required: false },
      }
      const r = validateObject({ x: '<script>alert(1)</script>' }, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors).toHaveLength(1)
      expect(r.errors![0].errors).toContain('Contenu suspect détecté')
    })

    it('devrait accepter customValidator quand result string est valide', () => {
      const schema: ValidationSchema = {
        x: {
          type: 'string',
          required: true,
          customValidator: (v) => (String(v).length >= 2 ? { isValid: true, sanitized: v } : { isValid: false, errors: ['Trop court'] }),
        },
      }
      expect(validateObject({ x: 'ab' }, schema).isValid).toBe(true)
      const r = validateObject({ x: 'a' }, schema)
      expect(r.isValid).toBe(false)
      expect(r.errors![0].errors).toContain('Trop court')
    })
  })

  describe('createValidationErrorResponse', () => {
    it('devrait retourner une NextResponse 400 avec erreurs formatées', async () => {
      const res = createValidationErrorResponse([
        { field: 'email', errors: ['Email invalide'] },
        { field: 'name', errors: ['Champ requis'] },
      ])
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Validation échouée')
      expect(json.errors).toHaveProperty('email')
      expect(json.errors.email).toContain('Email invalide')
      expect(json.errors).toHaveProperty('name')
      expect(json.errors.name).toContain('Champ requis')
    })
  })

  describe('withQueryValidation', () => {
    it('devrait appeler le handler si validation OK', async () => {
      const req = new NextRequest('http://localhost/api?page=1&limit=5')
      const handler = vi.fn().mockResolvedValue(new Response('ok'))
      const res = await withQueryValidation(req, paginationSchema, handler)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(req, expect.any(Object))
      expect(handler.mock.calls[0][1]).toHaveProperty('page')
      expect(handler.mock.calls[0][1]).toHaveProperty('limit')
      expect(res.status).toBe(200)
    })

    it('devrait retourner 400 si validation échoue', async () => {
      const req = new NextRequest('http://localhost/api')
      const handler = vi.fn()
      const res = await withQueryValidation(req, searchSchema, handler)
      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Validation échouée')
    })
  })

  describe('withBodyValidation', () => {
    it('devrait appeler le handler si validation OK', async () => {
      const schema: ValidationSchema = {
        title: { type: 'string', required: true },
      }
      const req = new NextRequest('http://localhost/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hello' }),
      })
      const handler = vi.fn().mockResolvedValue(new Response('ok'))
      const res = await withBodyValidation(req, schema, handler)
      expect(handler).toHaveBeenCalledWith(req, expect.objectContaining({ title: 'Hello' }))
      expect(res.status).toBe(200)
    })

    it('devrait retourner 400 si validation échoue', async () => {
      const schema: ValidationSchema = {
        title: { type: 'string', required: true },
      }
      const req = new NextRequest('http://localhost/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const handler = vi.fn()
      const res = await withBodyValidation(req, schema, handler)
      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toBe(400)
    })
  })
})
