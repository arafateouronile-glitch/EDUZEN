/**
 * Tests unitaires pour Gotenberg (réduction services sans tests)
 */
import { describe, it, expect } from 'vitest'
import { isGotenbergConfigured, GotenbergError } from '@/lib/services/gotenberg.service'

describe('gotenberg.service', () => {

  describe('isGotenbergConfigured', () => {
    it('retourne un booléen (lecture au chargement du module)', () => {
      expect(typeof isGotenbergConfigured()).toBe('boolean')
    })
  })

  describe('GotenbergError', () => {
    it('crée une erreur avec message et propriétés optionnelles', () => {
      const err = new GotenbergError('Conversion failed', 502, 'Bad Gateway')
      expect(err.message).toBe('Conversion failed')
      expect(err.name).toBe('GotenbergError')
      expect(err.statusCode).toBe(502)
      expect(err.body).toBe('Bad Gateway')
    })
  })
})
