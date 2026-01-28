'use client'

import { useEffect, useState, useCallback } from 'react'
import { logger, sanitizeError } from '@/lib/utils/logger'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Hook pour gérer les tokens CSRF côté client
 *
 * Usage:
 * ```tsx
 * const { csrfToken, csrfHeaders, fetchWithCSRF, refreshToken } = useCSRF()
 *
 * // Option 1: Utiliser les headers directement
 * fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...csrfHeaders,
 *   },
 *   body: JSON.stringify(data),
 * })
 *
 * // Option 2: Utiliser fetchWithCSRF
 * fetchWithCSRF('/api/endpoint', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * })
 * ```
 */
export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Récupère le token depuis les cookies
   */
  const getTokenFromCookie = useCallback((): string | null => {
    if (typeof document === 'undefined') {
      return null
    }

    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === CSRF_COOKIE_NAME) {
        return value
      }
    }
    return null
  }, [])

  /**
   * Récupère un nouveau token depuis l'API
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        logger.error('Failed to fetch CSRF token')
        return null
      }

      const data = await response.json()
      setCSRFToken(data.token)
      return data.token
    } catch (error) {
      logger.error('Error fetching CSRF token:', error)
      return null
    }
  }, [])

  /**
   * Initialise le token au montage du composant
   */
  useEffect(() => {
    const initToken = async () => {
      // Essayer d'abord de récupérer depuis le cookie
      let token = getTokenFromCookie()

      // Si pas de token, en demander un nouveau
      if (!token) {
        token = await refreshToken()
      } else {
        setCSRFToken(token)
      }

      setIsLoading(false)
    }

    initToken()
  }, [getTokenFromCookie, refreshToken])

  /**
   * Headers CSRF prêts à l'emploi
   */
  const csrfHeaders = csrfToken
    ? { [CSRF_HEADER_NAME]: csrfToken }
    : {}

  /**
   * Fetch wrapper qui ajoute automatiquement les headers CSRF
   */
  const fetchWithCSRF = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      // S'assurer qu'on a un token
      let token = csrfToken || getTokenFromCookie()

      // Si toujours pas de token, en demander un
      if (!token) {
        token = await refreshToken()
      }

      const headers = new Headers(options.headers || {})

      // Ajouter le Content-Type par défaut si c'est du JSON
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json')
      }

      // Ajouter le token CSRF
      if (token) {
        headers.set(CSRF_HEADER_NAME, token)
      }

      return fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Important pour envoyer les cookies
      })
    },
    [csrfToken, getTokenFromCookie, refreshToken]
  )

  return {
    csrfToken,
    csrfHeaders,
    fetchWithCSRF,
    refreshToken,
    isLoading,
  }
}

/**
 * Fonction utilitaire pour les appels hors composants React
 * (ex: dans des services)
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_COOKIE_NAME) {
      return value
    }
  }
  return null
}

/**
 * Ajoute les headers CSRF à un objet headers existant
 */
export function addCSRFHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFToken()
  if (!token) {
    return headers
  }

  if (headers instanceof Headers) {
    headers.set(CSRF_HEADER_NAME, token)
    return headers
  }

  if (Array.isArray(headers)) {
    return [...headers, [CSRF_HEADER_NAME, token]]
  }

  return {
    ...headers,
    [CSRF_HEADER_NAME]: token,
  }
}
