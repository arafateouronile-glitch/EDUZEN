/**
 * Logger centralisé pour l'application Eduzen
 * 
 * Fournit une interface unifiée pour le logging avec :
 * - Niveaux de log (error, warn, info, debug)
 * - Support pour services externes (Sentry, LogRocket)
 * - Formatage cohérent
 * - Mode développement vs production
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogContext {
  userId?: string
  organizationId?: string
  sessionId?: string
  [key: string]: unknown
}

function isValidSentryDsn(dsn: string | undefined): boolean {
  if (!dsn) return false

  // Empêcher les DSN d'exemple/placeholder (souvent présents en dev)
  if (dsn.includes('votre-dsn') || dsn.includes('votre-projet-id')) return false

  try {
    const url = new URL(dsn)
    // Format courant: https://<publicKey>@o<org>.ingest.sentry.io/<projectId>
    const projectId = url.pathname.replace(/^\//, '')
    if (!url.username) return false
    if (!/^\d+$/.test(projectId)) return false
    return true
  } catch {
    return false
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'
  private sentryEnabled =
    this.isProduction && isValidSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)

  /**
   * Initialise Sentry si disponible
   */
  private initSentry() {
    if (this.sentryEnabled && typeof window !== 'undefined') {
      // Lazy load Sentry pour éviter d'augmenter la taille du bundle
      import('@sentry/nextjs').then((Sentry) => {
        try {
          const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
          if (!isValidSentryDsn(dsn)) return

          // Vérifier si Sentry est déjà initialisé en essayant d'accéder au client
          // Si ce n'est pas le cas, l'initialiser
          Sentry.init({
            dsn,
            environment: process.env.NODE_ENV,
            tracesSampleRate: 0.1, // 10% des transactions
            beforeSend(event) {
              // Filtrer les erreurs sensibles
              if (event.request?.headers) {
                delete event.request.headers['authorization']
                delete event.request.headers['cookie']
              }
              return event
            },
          })
        } catch (e) {
          // Sentry déjà initialisé ou erreur, continuer sans
        }
      }).catch(() => {
        // Sentry non disponible, continuer sans
      })
    }
  }

  constructor() {
    if (this.sentryEnabled) {
      this.initSentry()
    }
  }

  /**
   * Log une erreur avec contexte optionnel
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const logData = {
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      context,
      timestamp: new Date().toISOString(),
      level: 'error' as LogLevel,
    }

    // En production, envoyer vers Sentry si disponible
    if (this.isProduction && this.sentryEnabled && typeof window !== 'undefined') {
      import('@sentry/nextjs').then((Sentry) => {
        if (error instanceof Error) {
          Sentry.captureException(error, {
            extra: {
              message,
              context,
            },
            tags: {
              source: 'logger',
            },
          })
        } else {
          Sentry.captureMessage(message, {
            level: 'error',
            extra: {
              error,
              context,
            },
          })
        }
      }).catch(() => {
        // Sentry non disponible, continuer sans
      })
    }

    // Envoyer une alerte pour les erreurs critiques (en production uniquement)
    if (this.isProduction && message.includes('[CRITICAL]')) {
      // Import dynamique pour éviter les dépendances circulaires
      import('@/lib/services/alert.service').then(({ alertService }) => {
        const errorObj = error instanceof Error ? error : new Error(message)
        alertService.sendCriticalError(errorObj, {
          context,
          timestamp: logData.timestamp,
        }).catch((err) => {
          // Ne pas logger l'erreur d'alerte pour éviter les boucles infinies
          if (this.isDevelopment) {
            console.error('Failed to send critical alert:', err)
          }
        })
      }).catch(() => {
        // Service d'alertes non disponible, continuer sans
      })
    }

    // Toujours logger en console pour le développement
    if (this.isDevelopment || !this.isProduction) {
      console.error('❌ [ERROR]', message, {
        error,
        context,
        timestamp: logData.timestamp,
      })
    }
  }

  /**
   * Log un avertissement
   */
  warn(message: string, context?: LogContext) {
    const logData = {
      message,
      context,
      timestamp: new Date().toISOString(),
      level: 'warn' as LogLevel,
    }

    if (this.isDevelopment) {
      console.warn('⚠️ [WARN]', message, { context, timestamp: logData.timestamp })
    }
  }

  /**
   * Log une information
   */
  info(message: string, context?: LogContext) {
    const logData = {
      message,
      context,
      timestamp: new Date().toISOString(),
      level: 'info' as LogLevel,
    }

    if (this.isDevelopment) {
      console.info('ℹ️ [INFO]', message, { context, timestamp: logData.timestamp })
    }
  }

  /**
   * Log pour le débogage (uniquement en développement)
   */
  debug(message: string, context?: LogContext) {
    if (!this.isDevelopment) return

    console.debug('🐛 [DEBUG]', message, {
      context,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Helper pour logger les erreurs de requête API
   */
  apiError(endpoint: string, error: Error | unknown, context?: LogContext) {
    this.error(`API Error: ${endpoint}`, error, {
      ...context,
      endpoint,
    })
  }

  /**
   * Helper pour logger les erreurs de mutation
   */
  mutationError(mutationName: string, error: Error | unknown, context?: LogContext) {
    this.error(`Mutation Error: ${mutationName}`, error, {
      ...context,
      mutationName,
    })
  }

  /**
   * Helper pour logger les erreurs de query
   */
  queryError(queryKey: string, error: Error | unknown, context?: LogContext) {
    this.error(`Query Error: ${queryKey}`, error, {
      ...context,
      queryKey,
    })
  }
}

// Export d'une instance singleton
export const logger = new Logger()

// Export du type pour utilisation dans d'autres fichiers
export type { LogContext, LogLevel }

/**
 * Utilitaires pour sanitiser les données sensibles dans les logs
 */

/**
 * Masque un email (garde 2 premiers caractères + domaine)
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '[NO_EMAIL]'
  const [local, domain] = email.split('@')
  if (!domain) return '[INVALID_EMAIL]'
  return `${local.substring(0, 2)}***@${domain}`
}

/**
 * Masque un ID (garde 8 premiers caractères)
 */
export function maskId(id: string | null | undefined): string {
  if (!id) return '[NO_ID]'
  return id.substring(0, 8) + '...'
}

/**
 * Masque un token (retourne juste un indicateur)
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return '[NO_TOKEN]'
  return '[REDACTED]'
}

/**
 * Masque un numéro de téléphone (garde 4 derniers chiffres)
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '[NO_PHONE]'
  if (phone.length < 4) return '***'
  return '***' + phone.slice(-4)
}

/**
 * Sanitise un objet erreur pour éviter d'exposer des informations sensibles
 */
export function sanitizeError(error: any): Record<string, any> {
  if (!error) return {}

  return {
    message: error.message,
    code: error.code,
    name: error.name,
    // Ne pas inclure stack traces en production
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  }
}

/**
 * Sanitise un objet utilisateur pour les logs
 */
export function sanitizeUser(user: any): Record<string, any> {
  if (!user) return {}

  return {
    id: maskId(user.id),
    email: maskEmail(user.email),
    role: user.role,
    organizationId: maskId(user.organization_id),
  }
}

/**
 * Sanitise un objet étudiant pour les logs
 */
export function sanitizeStudent(student: any): Record<string, any> {
  if (!student) return {}

  return {
    id: maskId(student.id),
    email: maskEmail(student.email),
    firstName: student.first_name ? student.first_name.charAt(0) + '***' : '[NO_NAME]',
    lastName: student.last_name ? student.last_name.charAt(0) + '***' : '[NO_NAME]',
  }
}






















