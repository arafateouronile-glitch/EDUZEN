/**
 * Tests unitaires pour lib/utils/csrf.ts (generateCSRFToken, verifyCSRFToken)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateCSRFToken, verifyCSRFToken } from '@/lib/utils/csrf'

describe('generateCSRFToken', () => {
  it('retourne un token en 3 parties (timestamp.random.signature)', () => {
    const token = generateCSRFToken()
    expect(typeof token).toBe('string')
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
    expect(parts[0].length).toBeGreaterThan(0)
    expect(parts[1].length).toBeGreaterThan(0)
    expect(parts[2].length).toBeGreaterThan(0)
  })

  it('genere un token different a chaque appel', () => {
    const t1 = generateCSRFToken()
    const t2 = generateCSRFToken()
    expect(t1).not.toBe(t2)
  })
})

describe('verifyCSRFToken', () => {
  it('retourne false pour une chaîne vide', () => {
    expect(verifyCSRFToken('')).toBe(false)
  })

  it('retourne false pour un token invalide (pas 3 parties)', () => {
    expect(verifyCSRFToken('a')).toBe(false)
    expect(verifyCSRFToken('a.b')).toBe(false)
    expect(verifyCSRFToken('a.b.c.d')).toBe(false)
  })

  it('retourne false pour une signature modifiee', () => {
    const token = generateCSRFToken()
    const parts = token.split('.')
    const tampered = `${parts[0]}.${parts[1]}.tampered`
    expect(verifyCSRFToken(tampered)).toBe(false)
  })

  it('retourne true pour un token fraichement genere', () => {
    const token = generateCSRFToken()
    expect(verifyCSRFToken(token)).toBe(true)
  })

  it('retourne false si token null ou non-string', () => {
    expect(verifyCSRFToken(null as any)).toBe(false)
    expect(verifyCSRFToken(undefined as any)).toBe(false)
    expect(verifyCSRFToken(123 as any)).toBe(false)
  })
})
