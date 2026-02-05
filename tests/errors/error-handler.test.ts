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

    it('devrait convertir une Error standard (unauthorized / 401)', () => {
      const r1 = errorHandler.handleError(new Error('unauthorized'))
      expect(r1.code).toBe(ErrorCode.AUTH_REQUIRED)
      expect(r1.severity).toBe(ErrorSeverity.HIGH)
      const r2 = errorHandler.handleError(new Error('Request 401 failed'))
      expect(r2.code).toBe(ErrorCode.AUTH_REQUIRED)
    })

    it('devrait convertir une Error standard (forbidden / 403)', () => {
      const result = errorHandler.handleError(new Error('forbidden'))
      expect(result.code).toBe(ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
    })

    it('devrait convertir une Error standard (validation / invalid)', () => {
      const r1 = errorHandler.handleError(new Error('validation failed'))
      expect(r1.code).toBe(ErrorCode.VALIDATION_ERROR)
      const r2 = errorHandler.handleError(new Error('invalid input'))
      expect(r2.code).toBe(ErrorCode.VALIDATION_ERROR)
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

    it('devrait gérer une erreur Supabase 42501 (RLS)', () => {
      const result = errorHandler.handleError(
        { code: '42501', message: 'RLS policy violation' },
        {}
      )
      expect(result.code).toBe(ErrorCode.DB_RLS_POLICY_VIOLATION)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
    })

    it('devrait gérer une erreur Supabase 23503 (contrainte)', () => {
      const result = errorHandler.handleError(
        { code: '23503', message: 'Foreign key violation' },
        {}
      )
      expect(result.code).toBe(ErrorCode.DB_CONSTRAINT_VIOLATION)
      expect(result.severity).toBe(ErrorSeverity.MEDIUM)
    })

    it('devrait gérer une erreur Supabase 400 / PGRST301 (bad request)', () => {
      const r1 = errorHandler.handleError({ code: '400', message: 'Bad request' }, {})
      expect(r1.code).toBe(ErrorCode.API_BAD_REQUEST)
      const r2 = errorHandler.handleError({ code: 'PGRST301', message: 'Invalid' }, {})
      expect(r2.code).toBe(ErrorCode.API_BAD_REQUEST)
    })

    it('devrait gérer une erreur Supabase 401 (auth required)', () => {
      const result = errorHandler.handleError({ code: '401', message: 'Unauthorized' }, {})
      expect(result.code).toBe(ErrorCode.AUTH_REQUIRED)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
    })

    it('devrait gérer une erreur Supabase 403 (insufficient permissions)', () => {
      const result = errorHandler.handleError(
        { code: '403', message: 'Forbidden' },
        {}
      )
      expect(result.code).toBe(ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
    })

    it('devrait gérer une erreur Supabase 404 (not found)', () => {
      const result = errorHandler.handleError({ code: '404', message: 'Not found' }, {})
      expect(result.code).toBe(ErrorCode.API_NOT_FOUND)
      expect(result.severity).toBe(ErrorSeverity.LOW)
    })

    it('devrait gérer une erreur Supabase 500 (server error)', () => {
      const result = errorHandler.handleError({ code: '500', message: 'Server error' }, {})
      expect(result.code).toBe(ErrorCode.API_SERVER_ERROR)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
    })

    it('devrait utiliser context.code en priorité (skip switch)', () => {
      const result = errorHandler.handleError(
        { code: '23505', message: 'Duplicate' },
        { code: ErrorCode.VALIDATION_ERROR }
      )
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR)
    })

    it('devrait ajuster severity MEDIUM pour DB_FOREIGN_KEY_CONSTRAINT', () => {
      const result = errorHandler.handleError(
        { code: '23503', message: 'FK violation' },
        { code: ErrorCode.DB_FOREIGN_KEY_CONSTRAINT }
      )
      expect(result.code).toBe(ErrorCode.DB_FOREIGN_KEY_CONSTRAINT)
      expect(result.severity).toBe(ErrorSeverity.MEDIUM)
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
