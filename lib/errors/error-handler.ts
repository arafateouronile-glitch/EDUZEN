/**
 * ErrorHandler Global - Gestion centralisée des erreurs
 * 
 * Fournit :
 * - Types d'erreurs personnalisés
 * - Classification automatique des erreurs
 * - Messages utilisateur traduits
 * - Logging automatique
 * - Formatage cohérent
 */

import { logger } from '@/lib/utils/logger'
import type { LogContext } from '@/lib/utils/logger'

// ============================================================================
// TYPES D'ERREURS PERSONNALISÉS
// ============================================================================

export enum ErrorCode {
  // Erreurs d'authentification (1000-1999)
  AUTH_REQUIRED = 'AUTH_1001',
  AUTH_INVALID_CREDENTIALS = 'AUTH_1002',
  AUTH_SESSION_EXPIRED = 'AUTH_1003',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_1004',
  AUTH_2FA_REQUIRED = 'AUTH_1005',
  AUTH_2FA_INVALID = 'AUTH_1006',

  // Erreurs de validation (2000-2999)
  VALIDATION_ERROR = 'VALID_2001',
  VALIDATION_REQUIRED_FIELD = 'VALID_2002',
  VALIDATION_INVALID_FORMAT = 'VALID_2003',
  VALIDATION_UNIQUE_CONSTRAINT = 'VALID_2004',

  // Erreurs de base de données (3000-3999)
  DB_CONNECTION_ERROR = 'DB_3001',
  DB_QUERY_ERROR = 'DB_3002',
  DB_NOT_FOUND = 'DB_3003',
  DB_CONSTRAINT_VIOLATION = 'DB_3004',
  DB_FOREIGN_KEY_CONSTRAINT = 'DB_3006',
  DB_RLS_POLICY_VIOLATION = 'DB_3005',

  // Erreurs réseau/API (4000-4999)
  NETWORK_ERROR = 'NET_4001',
  API_TIMEOUT = 'NET_4002',
  API_RATE_LIMIT = 'NET_4003',
  API_SERVER_ERROR = 'NET_4004',
  API_NOT_FOUND = 'NET_4005',
  API_BAD_REQUEST = 'NET_4006',

  // Erreurs métier (5000-5999)
  BUSINESS_LOGIC_ERROR = 'BIZ_5001',
  RESOURCE_LOCKED = 'BIZ_5002',
  OPERATION_NOT_ALLOWED = 'BIZ_5003',
  QUOTA_EXCEEDED = 'BIZ_5004',

  // Erreurs système (6000-6999)
  INTERNAL_ERROR = 'SYS_6001',
  CONFIGURATION_ERROR = 'SYS_6002',
  SERVICE_UNAVAILABLE = 'SYS_6003',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AppErrorContext extends LogContext {
  code?: ErrorCode
  severity?: ErrorSeverity
  userMessage?: string
  retryable?: boolean
  timestamp?: string
}

/**
 * Classe d'erreur personnalisée pour l'application
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly severity: ErrorSeverity
  public readonly userMessage: string
  public readonly retryable: boolean
  public readonly context: AppErrorContext
  public readonly originalError?: Error | unknown

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: AppErrorContext = {},
    originalError?: Error | unknown
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.severity = severity
    this.userMessage = context.userMessage || this.getDefaultUserMessage(code)
    this.retryable = context.retryable ?? this.isRetryable(code)
    this.context = {
      ...context,
      code,
      severity,
      timestamp: new Date().toISOString(),
    }
    this.originalError = originalError

    // Maintenir la stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /**
   * Messages utilisateur par défaut selon le code d'erreur
   */
  private getDefaultUserMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      // Auth
      [ErrorCode.AUTH_REQUIRED]: 'Vous devez être connecté pour effectuer cette action.',
      [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Email ou mot de passe incorrect.',
      [ErrorCode.AUTH_SESSION_EXPIRED]: 'Votre session a expiré. Veuillez vous reconnecter.',
      [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: "Vous n'avez pas les permissions nécessaires.",
      [ErrorCode.AUTH_2FA_REQUIRED]: 'Authentification à deux facteurs requise.',
      [ErrorCode.AUTH_2FA_INVALID]: 'Code d\'authentification invalide.',

      // Validation
      [ErrorCode.VALIDATION_ERROR]: 'Les données fournies ne sont pas valides.',
      [ErrorCode.VALIDATION_REQUIRED_FIELD]: 'Certains champs obligatoires sont manquants.',
      [ErrorCode.VALIDATION_INVALID_FORMAT]: 'Le format des données est incorrect.',
      [ErrorCode.VALIDATION_UNIQUE_CONSTRAINT]: 'Cette valeur existe déjà.',

      // Database
      [ErrorCode.DB_CONNECTION_ERROR]: 'Impossible de se connecter à la base de données.',
      [ErrorCode.DB_QUERY_ERROR]: 'Erreur lors de l\'exécution de la requête.',
      [ErrorCode.DB_NOT_FOUND]: 'Ressource introuvable.',
      [ErrorCode.DB_CONSTRAINT_VIOLATION]: 'Cette opération viole une contrainte de la base de données.',
      [ErrorCode.DB_FOREIGN_KEY_CONSTRAINT]: 'Cette opération viole une contrainte de clé étrangère.',
      [ErrorCode.DB_RLS_POLICY_VIOLATION]: 'Vous n\'avez pas accès à cette ressource.',

      // Network
      [ErrorCode.NETWORK_ERROR]: 'Erreur de connexion réseau. Vérifiez votre connexion internet.',
      [ErrorCode.API_TIMEOUT]: 'La requête a pris trop de temps. Veuillez réessayer.',
      [ErrorCode.API_RATE_LIMIT]: 'Trop de requêtes. Veuillez patienter quelques instants.',
      [ErrorCode.API_SERVER_ERROR]: 'Erreur serveur. Veuillez réessayer plus tard.',
      [ErrorCode.API_NOT_FOUND]: 'Ressource introuvable.',
      [ErrorCode.API_BAD_REQUEST]: 'Requête invalide.',

      // Business
      [ErrorCode.BUSINESS_LOGIC_ERROR]: 'Cette opération n\'est pas autorisée dans le contexte actuel.',
      [ErrorCode.RESOURCE_LOCKED]: 'Cette ressource est actuellement verrouillée.',
      [ErrorCode.OPERATION_NOT_ALLOWED]: 'Cette opération n\'est pas autorisée.',
      [ErrorCode.QUOTA_EXCEEDED]: 'Vous avez atteint la limite autorisée.',

      // System
      [ErrorCode.INTERNAL_ERROR]: 'Une erreur interne est survenue. Veuillez réessayer.',
      [ErrorCode.CONFIGURATION_ERROR]: 'Erreur de configuration du système.',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporairement indisponible.',
    }

    return messages[code] || 'Une erreur inattendue est survenue.'
  }

  /**
   * Détermine si une erreur est retryable selon son code
   */
  private isRetryable(code: ErrorCode): boolean {
    const retryableCodes = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.API_TIMEOUT,
      ErrorCode.API_SERVER_ERROR,
      ErrorCode.DB_CONNECTION_ERROR,
      ErrorCode.SERVICE_UNAVAILABLE,
    ]
    return retryableCodes.includes(code)
  }

  /**
   * Convertit l'erreur en objet JSON pour logging
   * SÉCURITÉ: Les stack traces sont masquées en production
   */
  toJSON() {
    const isProduction = process.env.NODE_ENV === 'production'

    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      userMessage: this.userMessage,
      retryable: this.retryable,
      context: this.context,
      // Masquer les stack traces en production pour éviter la fuite d'informations
      stack: isProduction ? undefined : this.stack,
      originalError: this.originalError instanceof Error
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            // Masquer la stack trace de l'erreur originale en production
            stack: isProduction ? undefined : this.originalError.stack,
          }
        : (isProduction ? undefined : this.originalError),
    }
  }
}

// ============================================================================
// ERROR HANDLER PRINCIPAL
// ============================================================================

export class ErrorHandler {
  /**
   * Analyse et classe une erreur inconnue
   */
  handleError(error: unknown, context: AppErrorContext = {}): AppError {
    // Si c'est déjà une AppError, la retourner telle quelle
    if (error instanceof AppError) {
      this.logError(error)
      return error
    }

    // Si c'est une Error standard, la convertir
    if (error instanceof Error) {
      return this.handleStandardError(error, context)
    }

    // Si c'est une erreur Supabase
    if (this.isSupabaseError(error)) {
      return this.handleSupabaseError(error, context)
    }

    // Erreur inconnue
    const appError = new AppError(
      'Une erreur inattendue est survenue.',
      ErrorCode.INTERNAL_ERROR,
      ErrorSeverity.HIGH,
      context,
      error
    )
    this.logError(appError)
    return appError
  }

  /**
   * Gère les erreurs Error standard
   */
  private handleStandardError(error: Error, context: AppErrorContext): AppError {
    const message = error.message.toLowerCase()

    // Détection par message
    let code = ErrorCode.INTERNAL_ERROR
    let severity = ErrorSeverity.MEDIUM

    if (message.includes('network') || message.includes('fetch')) {
      code = ErrorCode.NETWORK_ERROR
      severity = ErrorSeverity.MEDIUM
    } else if (message.includes('timeout')) {
      code = ErrorCode.API_TIMEOUT
      severity = ErrorSeverity.MEDIUM
    } else if (message.includes('unauthorized') || message.includes('401')) {
      code = ErrorCode.AUTH_REQUIRED
      severity = ErrorSeverity.HIGH
    } else if (message.includes('forbidden') || message.includes('403')) {
      code = ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS
      severity = ErrorSeverity.HIGH
    } else if (message.includes('not found') || message.includes('404')) {
      code = ErrorCode.DB_NOT_FOUND
      severity = ErrorSeverity.LOW
    } else if (message.includes('validation') || message.includes('invalid')) {
      code = ErrorCode.VALIDATION_ERROR
      severity = ErrorSeverity.LOW
    }

    const appError = new AppError(error.message, code, severity, context, error)
    this.logError(appError)
    return appError
  }

  /**
   * Gère les erreurs Supabase
   */
  private handleSupabaseError(error: any, context: AppErrorContext): AppError {
    const code = error.code || error.status
    const message = error.message || 'Erreur Supabase'

    // Si un code d'erreur est fourni dans le contexte, l'utiliser en priorité
    let errorCode = context.code || ErrorCode.DB_QUERY_ERROR
    let severity = ErrorSeverity.MEDIUM

    // Classification par code Supabase (seulement si pas de code dans le contexte)
    if (!context.code) {
      switch (code) {
        case 'PGRST116':
        case '42P01':
          errorCode = ErrorCode.DB_NOT_FOUND
          severity = ErrorSeverity.LOW
          break
        case '42501':
          errorCode = ErrorCode.DB_RLS_POLICY_VIOLATION
          severity = ErrorSeverity.HIGH
          break
        case '23505':
          errorCode = ErrorCode.VALIDATION_UNIQUE_CONSTRAINT
          severity = ErrorSeverity.LOW
          break
        case '23503':
          errorCode = ErrorCode.DB_CONSTRAINT_VIOLATION
          severity = ErrorSeverity.MEDIUM
          break
        case 'PGRST301':
        case '400':
          errorCode = ErrorCode.API_BAD_REQUEST
          severity = ErrorSeverity.LOW
          break
        case '401':
          errorCode = ErrorCode.AUTH_REQUIRED
          severity = ErrorSeverity.HIGH
          break
        case '403':
          errorCode = ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS
          severity = ErrorSeverity.HIGH
          break
        case '404':
          errorCode = ErrorCode.API_NOT_FOUND
          severity = ErrorSeverity.LOW
          break
        case '500':
          errorCode = ErrorCode.API_SERVER_ERROR
          severity = ErrorSeverity.HIGH
          break
      }
    }

    // Ajuster la sévérité selon le code d'erreur
    if (errorCode === ErrorCode.DB_FOREIGN_KEY_CONSTRAINT) {
      severity = ErrorSeverity.MEDIUM
    }

    const appError = new AppError(message, errorCode, severity, context, error)
    this.logError(appError)
    return appError
  }

  /**
   * Vérifie si une erreur est une erreur Supabase
   */
  private isSupabaseError(error: any): boolean {
    return (
      error &&
      (error.code || error.status || error.message) &&
      (typeof error.code === 'string' || typeof error.status === 'number')
    )
  }

  /**
   * Log l'erreur selon sa sévérité
   */
  private logError(error: AppError) {
    const logContext: LogContext = {
      ...error.context,
      code: error.code,
      severity: error.severity,
      retryable: error.retryable,
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error(error.message, error.originalError || error, logContext)
        break
      case ErrorSeverity.MEDIUM:
        logger.warn(error.message, logContext)
        break
      case ErrorSeverity.LOW:
        logger.info(`Error: ${error.message}`, logContext)
        break
    }
  }

  /**
   * Crée une erreur de validation
   */
  createValidationError(message: string, field?: string): AppError {
    return new AppError(
      message,
      ErrorCode.VALIDATION_ERROR,
      ErrorSeverity.LOW,
      { field, userMessage: message }
    )
  }

  /**
   * Crée une erreur d'authentification
   */
  createAuthError(code: ErrorCode, message?: string): AppError {
    return new AppError(
      message || 'Erreur d\'authentification',
      code,
      ErrorSeverity.HIGH
    )
  }

  /**
   * Crée une erreur de base de données
   */
  createDatabaseError(message: string, originalError?: unknown): AppError {
    return new AppError(
      message,
      ErrorCode.DB_QUERY_ERROR,
      ErrorSeverity.MEDIUM,
      {},
      originalError
    )
  }

  /**
   * Crée une erreur "Not Found"
   */
  createNotFoundError(message: string, context?: AppErrorContext): AppError {
    return new AppError(
      message,
      ErrorCode.DB_NOT_FOUND,
      ErrorSeverity.LOW,
      context
    )
  }
}

// Export d'une instance singleton
export const errorHandler = new ErrorHandler()

// Export de fonctions helper pour faciliter l'utilisation
export const handleError = (error: unknown, context?: AppErrorContext) =>
  errorHandler.handleError(error, context)

export const createValidationError = (message: string, field?: string) =>
  errorHandler.createValidationError(message, field)

export const createAuthError = (code: ErrorCode, message?: string) =>
  errorHandler.createAuthError(code, message)

export const createDatabaseError = (message: string, originalError?: unknown) =>
  errorHandler.createDatabaseError(message, originalError)

export const createNotFoundError = (message: string, context?: AppErrorContext) =>
  errorHandler.createNotFoundError(message, context)

// Alias pour NotFoundError (compatibilité)
export const NotFoundError = createNotFoundError

