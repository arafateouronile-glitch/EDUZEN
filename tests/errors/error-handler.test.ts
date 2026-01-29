/**
 * Tests unitaires pour lib/errors (index + error-handler)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AppError,
  ErrorCode,
  ErrorSeverity,
  errorHandler,
  handleError,
  createValidationError,
  createAuthError,
  createDatabaseError,
  createNotFoundError,
  NotFoundError,
} from '@/lib/errors'

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('lib/errors', () => {
  describe('AppError', () => {
    it('devrait créer une AppError avec message et code', () => {
      const err = new AppError('Test message', ErrorCode.VALIDATION_ERROR, ErrorSeverity.LOW)
      expect(err.message).toBe('Test message')
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(err.severity).toBe(ErrorSeverity.LOW)
      expect(err.name).toBe('AppError')
      expect(err.userMessage).toBeTruthy()
      expect(err.context).toHaveProperty('code', ErrorCode.VALIDATION_ERROR)
    })

    it('devrait utiliser le message utilisateur du contexte si fourni', () => {
      const err = new AppError('Internal', ErrorCode.DB_NOT_FOUND, ErrorSeverity.LOW, {
        userMessage: 'Ressource introuvable',
      })
      expect(err.userMessage).toBe('Ressource introuvable')
    })

    it('devrait déterminer retryable selon le code', () => {
      const errNetwork = new AppError('Net', ErrorCode.NETWORK_ERROR, ErrorSeverity.MEDIUM)
      expect(errNetwork.retryable).toBe(true)
      const errValid = new AppError('Valid', ErrorCode.VALIDATION_ERROR, ErrorSeverity.LOW)
      expect(errValid.retryable).toBe(false)
    })

    it('devrait sérialiser en JSON avec stack en dev', () => {
      process.env.NODE_ENV = 'development'
      const err = new AppError('Test', ErrorCode.INTERNAL_ERROR, ErrorSeverity.MEDIUM)
      const json = err.toJSON()
      expect(json.name).toBe('AppError')
      expect(json.message).toBe('Test')
      expect(json.code).toBe(ErrorCode.INTERNAL_ERROR)
      expect(json.stack).toBeDefined()
    })

    it('devrait accepter originalError', () => {
      const original = new Error('Original')
      const err = new AppError('Wrapped', ErrorCode.INTERNAL_ERROR, ErrorSeverity.HIGH, {}, original)
      expect(err.originalError).toBe(original)
    })
  })

  describe('errorHandler.handleError', () => {
    it('devrait retourner une AppError telle quelle', () => {
      const appErr = new AppError('Already AppError', ErrorCode.AUTH_REQUIRED, ErrorSeverity.HIGH)
      const result = errorHandler.handleError(appErr)
      expect(result).toBe(appErr)
    })

    it('devrait convertir une Error standard (network)', () => {
      const result = errorHandler.handleError(new Error('Network request failed'))
      expect(result).toBeInstanceOf(AppError)
      expect(result.code).toBe(ErrorCode.NETWORK_ERROR)
    })

    it('devrait convertir une Error standard (timeout)', () => {
      const result = errorHandler.handleError(new Error('Request timeout'))
      expect(result.code).toBe(ErrorCode.API_TIMEOUT)
    })

    it('devrait convertir une Error standard (not found)', () => {
      const result = errorHandler.handleError(new Error('Resource not found'))
      expect(result.code).toBe(ErrorCode.DB_NOT_FOUND)
    })

    it('devrait gérer une erreur Supabase PGRST116', () => {
      const result = errorHandler.handleError(
        { code: 'PGRST116', message: 'No rows', status: 200 },
        {}
      )
      expect(result).toBeInstanceOf(AppError)
      expect(result.code).toBe(ErrorCode.DB_NOT_FOUND)
    })

    it('devrait gérer une erreur Supabase 23505 (unique)', () => {
      const result = errorHandler.handleError(
        { code: '23505', message: 'Duplicate key' },
        {}
      )
      expect(result.code).toBe(ErrorCode.VALIDATION_UNIQUE_CONSTRAINT)
    })

    it('devrait gérer une erreur inconnue', () => {
      const result = errorHandler.handleError('string error', {})
      expect(result).toBeInstanceOf(AppError)
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR)
    })
  })

  describe('handleError (helper)', () => {
    it('devrait appeler errorHandler.handleError', () => {
      const result = handleError(new Error('Test'))
      expect(result).toBeInstanceOf(AppError)
      expect(result.message).toBe('Test')
    })
  })

  describe('createValidationError', () => {
    it('devrait créer une erreur de validation', () => {
      const err = createValidationError('Champ invalide', 'email')
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(err.severity).toBe(ErrorSeverity.LOW)
      expect(err.context.field).toBe('email')
    })
  })

  describe('createAuthError', () => {
    it('devrait créer une erreur d\'auth', () => {
      const err = createAuthError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Bad credentials')
      expect(err.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS)
      expect(err.severity).toBe(ErrorSeverity.HIGH)
      expect(err.message).toBe('Bad credentials')
    })
  })

  describe('createDatabaseError', () => {
    it('devrait créer une erreur de base de données', () => {
      const err = createDatabaseError('Connection failed', new Error('ECONNREFUSED'))
      expect(err.code).toBe(ErrorCode.DB_QUERY_ERROR)
      expect(err.originalError).toBeInstanceOf(Error)
    })
  })

  describe('createNotFoundError', () => {
    it('devrait créer une erreur Not Found', () => {
      const err = createNotFoundError('Document introuvable', { id: 'doc-1' })
      expect(err.code).toBe(ErrorCode.DB_NOT_FOUND)
      expect(err.context.id).toBe('doc-1')
    })
  })

  describe('NotFoundError (alias)', () => {
    it('devrait être un alias de createNotFoundError', () => {
      const err = NotFoundError('Item missing')
      expect(err.code).toBe(ErrorCode.DB_NOT_FOUND)
    })
  })
})
