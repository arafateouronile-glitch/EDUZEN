/**
 * Tests unitaires pour le logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, sanitizeError } from '@/lib/utils/logger'

describe('logger', () => {
  let originalConsole: {
    error: typeof console.error
    warn: typeof console.warn
    info: typeof console.info
    debug: typeof console.debug
  }
  let originalEnv: string | undefined

  beforeEach(() => {
    // Sauvegarder NODE_ENV
    originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    // Sauvegarder les méthodes console originales
    originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    }

    // Mock console methods
    console.error = vi.fn()
    console.warn = vi.fn()
    console.info = vi.fn()
    console.debug = vi.fn()
  })

  afterEach(() => {
    // Restaurer NODE_ENV
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv
    } else {
      delete process.env.NODE_ENV
    }

    // Restaurer les méthodes console originales
    console.error = originalConsole.error
    console.warn = originalConsole.warn
    console.info = originalConsole.info
    console.debug = originalConsole.debug
    vi.clearAllMocks()
  })

  describe('error', () => {
    it('devrait logger une erreur avec message', () => {
      logger.error('Test error message')

      expect(console.error).toHaveBeenCalled()
    })

    it('devrait logger une erreur avec Error object', () => {
      const error = new Error('Test error')
      logger.error('Test error message', error)

      expect(console.error).toHaveBeenCalled()
    })

    it('devrait logger une erreur avec contexte', () => {
      logger.error('Test error', undefined, { userId: 'user-1', action: 'test' })

      expect(console.error).toHaveBeenCalled()
    })

    it('devrait logger une erreur complète', () => {
      const error = new Error('Test error')
      logger.error('Test error message', error, { userId: 'user-1' })

      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('warn', () => {
    it('devrait appeler warn sans erreur', () => {
      // warn log seulement en développement
      // Vérifier que la méthode existe et peut être appelée
      expect(() => logger.warn('Test warning')).not.toThrow()
      
      // Si en développement, console.warn devrait être appelé
      if (process.env.NODE_ENV === 'development') {
        expect(console.warn).toHaveBeenCalled()
      }
    })

    it('devrait appeler warn avec contexte sans erreur', () => {
      expect(() => logger.warn('Test warning', { userId: 'user-1' })).not.toThrow()
      
      if (process.env.NODE_ENV === 'development') {
        expect(console.warn).toHaveBeenCalled()
      }
    })
  })

  describe('info', () => {
    it('devrait appeler info sans erreur', () => {
      expect(() => logger.info('Test info')).not.toThrow()
      
      if (process.env.NODE_ENV === 'development') {
        expect(console.info).toHaveBeenCalled()
      }
    })

    it('devrait appeler info avec contexte sans erreur', () => {
      expect(() => logger.info('Test info', { userId: 'user-1' })).not.toThrow()
      
      if (process.env.NODE_ENV === 'development') {
        expect(console.info).toHaveBeenCalled()
      }
    })
  })

  describe('debug', () => {
    it('devrait appeler debug sans erreur', () => {
      expect(() => logger.debug('Test debug')).not.toThrow()
      
      if (process.env.NODE_ENV === 'development') {
        expect(console.debug).toHaveBeenCalled()
      }
    })

    it('devrait appeler debug avec contexte sans erreur', () => {
      expect(() => logger.debug('Test debug', { userId: 'user-1' })).not.toThrow()
      
      if (process.env.NODE_ENV === 'development') {
        expect(console.debug).toHaveBeenCalled()
      }
    })
  })
})

  describe('sanitizeError', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv
    } else {
      delete process.env.NODE_ENV
    }
  })

  it('devrait retourner un objet Error normalisé', () => {
    const error = new Error('Test error')
    const sanitized = sanitizeError(error)

    expect(sanitized).toHaveProperty('name', 'Error')
    expect(sanitized).toHaveProperty('message', 'Test error')
    // Stack seulement en développement
    if (process.env.NODE_ENV === 'development') {
      expect(sanitized).toHaveProperty('stack')
    }
  })

  it('devrait gérer les erreurs non-Error', () => {
    const error = 'String error'
    const sanitized = sanitizeError(error)

    // sanitizeError retourne seulement message, code, name, stack
    expect(sanitized).toHaveProperty('message', undefined) // String n'a pas de .message
  })

  it('devrait gérer les objets d\'erreur', () => {
    const error = { code: 'ERR_TEST', message: 'Test error' }
    const sanitized = sanitizeError(error)

    expect(sanitized).toHaveProperty('message', 'Test error')
    expect(sanitized).toHaveProperty('code', 'ERR_TEST')
  })

  it('devrait gérer null/undefined', () => {
    // sanitizeError retourne {} si error est null/undefined
    expect(sanitizeError(null)).toEqual({})
    expect(sanitizeError(undefined)).toEqual({})
  })

  it('devrait inclure le stack en développement', () => {
    const error = new Error('Test error')
    error.stack = 'Error: Test error\n    at /path/to/file.js:1:1'
    const sanitized = sanitizeError(error)

    if (process.env.NODE_ENV === 'development') {
      expect(sanitized).toHaveProperty('stack')
      expect(sanitized.stack).toContain('Error: Test error')
    }
  })

  it('ne devrait pas inclure le stack en production', () => {
    process.env.NODE_ENV = 'production'
    const error = new Error('Test error')
    error.stack = 'Error: Test error\n    at /path/to/file.js:1:1'
    const sanitized = sanitizeError(error)

    expect(sanitized).not.toHaveProperty('stack')
  })
})
