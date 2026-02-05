/**
 * Tests des réexports de lib/errors/index.ts
 * Vérifie que l'API publique du module erreurs est bien exposée.
 */

import { describe, it, expect } from 'vitest'
import {
  ErrorHandler,
  errorHandler,
  handleError,
  createValidationError,
  createAuthError,
  createDatabaseError,
  createNotFoundError,
  NotFoundError,
  AppError,
  ErrorCode,
  ErrorSeverity,
} from '@/lib/errors'
import type { AppErrorContext } from '@/lib/errors'

describe('lib/errors index', () => {
  it('devrait exporter ErrorHandler et errorHandler', () => {
    expect(ErrorHandler).toBeDefined()
    expect(typeof ErrorHandler).toBe('function')
    expect(errorHandler).toBeDefined()
    expect(errorHandler).toBeInstanceOf(ErrorHandler)
  })

  it('devrait exporter les helpers handleError et create*Error', () => {
    expect(typeof handleError).toBe('function')
    expect(typeof createValidationError).toBe('function')
    expect(typeof createAuthError).toBe('function')
    expect(typeof createDatabaseError).toBe('function')
    expect(typeof createNotFoundError).toBe('function')
  })

  it('devrait exporter NotFoundError et AppError', () => {
    expect(NotFoundError).toBeDefined()
    expect(AppError).toBeDefined()
    expect(typeof AppError).toBe('function')
  })

  it('devrait exporter ErrorCode et ErrorSeverity', () => {
    expect(ErrorCode).toBeDefined()
    expect(typeof ErrorCode).toBe('object')
    expect(ErrorSeverity).toBeDefined()
    expect(typeof ErrorSeverity).toBe('object')
  })

  it('devrait permettre de créer une AppError via createValidationError', () => {
    const err = createValidationError('Champ invalide', 'field')
    expect(err).toBeInstanceOf(AppError)
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(err.message).toContain('Champ invalide')
  })

  it('devrait exposer le type AppErrorContext', () => {
    const ctx: AppErrorContext = { operation: 'test' }
    expect(ctx).toHaveProperty('operation', 'test')
  })
})
