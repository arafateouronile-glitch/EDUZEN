'use client'

import { useEffect } from 'react'

/**
 * Filtre les erreurs de console provenant d'extensions de navigateur
 * pour éviter de polluer la console avec des erreurs non pertinentes.
 */
export function ConsoleErrorFilter() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Sauvegarder les fonctions originales
    const originalError = console.error
    const originalWarn = console.warn

    // Liste des patterns à filtrer (erreurs d'extensions)
    const filteredPatterns = [
      /frame_ant\.js/i, // Extension d'accessibilité
      /accessibility_configurations/i, // Table Supabase (erreurs d'extensions)
      /chrome-extension:/i,
      /moz-extension:/i,
      /safari-extension:/i,
      /extension:/i,
      /The message port closed/i, // Erreur commune des extensions
      /Script loaded: operationBanner\.js/i, // Extension de bannière
    ]

    // Fonction pour vérifier si une erreur doit être filtrée
    const shouldFilter = (args: any[]): boolean => {
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') return arg
          if (arg?.message) return arg.message
          if (arg?.stack) return arg.stack
          return String(arg)
        })
        .join(' ')

      return filteredPatterns.some((pattern) => pattern.test(message))
    }

    // Override console.error
    console.error = (...args: any[]) => {
      if (!shouldFilter(args)) {
        originalError.apply(console, args)
      }
      // Sinon, on ignore silencieusement
    }

    // Override console.warn
    console.warn = (...args: any[]) => {
      if (!shouldFilter(args)) {
        originalWarn.apply(console, args)
      }
      // Sinon, on ignore silencieusement
    }

    // Intercepter les erreurs non capturées (unhandled errors)
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || event.error?.message || ''
      const errorSource = event.filename || ''

      // Filtrer les erreurs provenant d'extensions
      if (
        filteredPatterns.some((pattern) => 
          pattern.test(errorMessage) || pattern.test(errorSource)
        )
      ) {
        event.preventDefault() // Empêcher l'affichage dans la console
        return false
      }
    }

    // Intercepter les promesses rejetées non gérées
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const errorMessage = 
        reason?.message || 
        reason?.toString() || 
        String(reason) || 
        ''

      // Filtrer les erreurs provenant d'extensions
      if (filteredPatterns.some((pattern) => pattern.test(errorMessage))) {
        event.preventDefault() // Empêcher l'affichage dans la console
        return false
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Cleanup
    return () => {
      console.error = originalError
      console.warn = originalWarn
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null // Ce composant ne rend rien
}

