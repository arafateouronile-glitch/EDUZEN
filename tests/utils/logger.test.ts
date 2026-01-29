/**
 * Tests unitaires pour le logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  logger,
  sanitizeError,
  maskEmail,
  maskId,
  maskToken,
  maskPhone,
  sanitizeUser,
  sanitizeStudent,
} from '@/lib/utils/logger'

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

describe('logger helpers (apiError, mutationError, queryError)', () => {
  let originalConsole: { error: typeof console.error }
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    originalConsole = { error: console.error }
    console.error = vi.fn()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    console.error = originalConsole.error
    vi.clearAllMocks()
  })

  it('apiError devrait appeler error avec le bon message', () => {
    logger.apiError('/api/users', new Error('Failed'))
    expect(console.error).toHaveBeenCalledWith(
      '❌ [ERROR]',
      expect.stringContaining('API Error'),
      expect.objectContaining({ context: expect.objectContaining({ endpoint: '/api/users' }) })
    )
  })

  it('mutationError devrait appeler error avec le bon message', () => {
    logger.mutationError('createUser', new Error('Failed'))
    expect(console.error).toHaveBeenCalledWith(
      '❌ [ERROR]',
      expect.stringContaining('Mutation Error'),
      expect.objectContaining({ context: expect.objectContaining({ mutationName: 'createUser' }) })
    )
  })

  it('queryError devrait appeler error avec le bon message', () => {
    logger.queryError('users', new Error('Failed'))
    expect(console.error).toHaveBeenCalledWith(
      '❌ [ERROR]',
      expect.stringContaining('Query Error'),
      expect.objectContaining({ context: expect.objectContaining({ queryKey: 'users' }) })
    )
  })
})

describe('maskEmail', () => {
  it('devrait masquer un email valide', () => {
    expect(maskEmail('john.doe@example.com')).toBe('jo***@example.com')
  })
  it('devrait retourner [NO_EMAIL] si null/undefined', () => {
    expect(maskEmail(null)).toBe('[NO_EMAIL]')
    expect(maskEmail(undefined)).toBe('[NO_EMAIL]')
  })
  it('devrait retourner [INVALID_EMAIL] sans domaine', () => {
    expect(maskEmail('invalid')).toBe('[INVALID_EMAIL]')
  })
})

describe('maskId', () => {
  it('devrait garder les 8 premiers caractères', () => {
    expect(maskId('abc12345xyz')).toBe('abc12345...')
  })
  it('devrait retourner [NO_ID] si null/undefined', () => {
    expect(maskId(null)).toBe('[NO_ID]')
    expect(maskId(undefined)).toBe('[NO_ID]')
  })
})

describe('maskToken', () => {
  it('devrait retourner [REDACTED]', () => {
    expect(maskToken('secret-token')).toBe('[REDACTED]')
  })
  it('devrait retourner [NO_TOKEN] si null/undefined', () => {
    expect(maskToken(null)).toBe('[NO_TOKEN]')
    expect(maskToken(undefined)).toBe('[NO_TOKEN]')
  })
})

describe('maskPhone', () => {
  it('devrait masquer en gardant les 4 derniers chiffres', () => {
    expect(maskPhone('+33612345678')).toBe('***5678')
  })
  it('devrait retourner [NO_PHONE] si null/undefined', () => {
    expect(maskPhone(null)).toBe('[NO_PHONE]')
    expect(maskPhone(undefined)).toBe('[NO_PHONE]')
  })
  it('devrait retourner *** si moins de 4 caractères', () => {
    expect(maskPhone('12')).toBe('***')
  })
})

describe('sanitizeUser', () => {
  it('devrait masquer id et email', () => {
    const user = { id: 'user-123-long', email: 'a@b.com', role: 'admin', organization_id: 'org-1' }
    const out = sanitizeUser(user)
    expect(out.id).toBe('user-123...')
    expect(out.email).toBe('a***@b.com')
    expect(out.role).toBe('admin')
    expect(out.organizationId).toBe('org-1...')
  })
  it('devrait retourner {} si null/undefined', () => {
    expect(sanitizeUser(null)).toEqual({})
    expect(sanitizeUser(undefined)).toEqual({})
  })
})

describe('sanitizeStudent', () => {
  it('devrait masquer id, email et noms', () => {
    const student = { id: 'stu-1', email: 'x@y.com', first_name: 'John', last_name: 'Doe' }
    const out = sanitizeStudent(student)
    expect(out.id).toBe('stu-1...')
    expect(out.email).toBe('x***@y.com')
    expect(out.firstName).toBe('J***')
    expect(out.lastName).toBe('D***')
  })
  it('devrait retourner {} si null/undefined', () => {
    expect(sanitizeStudent(null)).toEqual({})
    expect(sanitizeStudent(undefined)).toEqual({})
  })
  it('devrait gérer [NO_NAME] si pas de first_name/last_name', () => {
    const student = { id: '1', email: null, first_name: null, last_name: null }
    const out = sanitizeStudent(student)
    expect(out.firstName).toBe('[NO_NAME]')
    expect(out.lastName).toBe('[NO_NAME]')
  })
})
