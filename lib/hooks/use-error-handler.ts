/**
 * Hook React pour gérer les erreurs dans les composants
 * 
 * Fournit :
 * - Gestion automatique des erreurs
 * - Affichage de notifications
 * - Retry automatique pour erreurs retryable
 */

'use client'

import { useCallback } from 'react'
import { useToast } from '@/components/ui/toast'
import { errorHandler, AppError, ErrorSeverity } from '@/lib/errors'
import type { AppErrorContext } from '@/lib/errors'

export function useErrorHandler() {
  const { addToast } = useToast()

  /**
   * Gère une erreur et affiche une notification
   */
  const handleError = useCallback(
    (error: unknown, context?: AppErrorContext) => {
      const appError = errorHandler.handleError(error, context)

      // Afficher une notification selon la sévérité
      const type =
        appError.severity === ErrorSeverity.CRITICAL ||
        appError.severity === ErrorSeverity.HIGH
          ? 'error'
          : 'warning'

      addToast({
        type,
        title: 'Erreur',
        description: appError.userMessage,
        duration: appError.severity === ErrorSeverity.CRITICAL ? 10000 : 5000,
      })

      return appError
    },
    [addToast]
  )

  /**
   * Gère une erreur silencieusement (sans notification)
   */
  const handleErrorSilently = useCallback(
    (error: unknown, context?: AppErrorContext) => {
      return errorHandler.handleError(error, context)
    },
    []
  )

  /**
   * Gère une erreur avec retry automatique
   */
  const handleErrorWithRetry = useCallback(
    async (
      error: unknown,
      retryFn: () => Promise<unknown>,
      context?: AppErrorContext,
      maxRetries = 3
    ) => {
      const appError = errorHandler.handleError(error, context)

      if (!appError.retryable) {
        handleError(appError, context)
        return appError
      }

      // Essayer de retry automatiquement
      let attempts = 0
      while (attempts < maxRetries) {
        attempts++
        try {
          await retryFn()
          addToast({
            type: 'success',
            title: 'Succès',
            description: 'L\'opération a réussi après plusieurs tentatives.',
          })
          return null // Succès
        } catch (retryError) {
          if (attempts >= maxRetries) {
            handleError(retryError, context)
            return errorHandler.handleError(retryError, context)
          }
          // Attendre avant de retry (backoff exponentiel)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempts) * 1000)
          )
        }
      }

      return appError
    },
    [handleError, addToast]
  )

  return {
    handleError,
    handleErrorSilently,
    handleErrorWithRetry,
  }
}





