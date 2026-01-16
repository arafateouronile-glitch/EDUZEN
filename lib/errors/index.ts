/**
 * Export centralisé de tous les types et utilitaires d'erreurs
 */

export {
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
  type AppErrorContext,
} from './error-handler'

