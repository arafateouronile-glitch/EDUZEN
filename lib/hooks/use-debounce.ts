/**
 * Hook pour debouncer une valeur
 * 
 * Utile pour les recherches et autres inputs qui ne doivent pas déclencher
 * d'actions à chaque frappe
 */

import { useState, useEffect } from 'react'

/**
 * Debounce une valeur
 * 
 * @param value - La valeur à debouncer
 * @param delay - Le délai en millisecondes (défaut: 300ms)
 * @returns La valeur debouncée
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearchTerm = useDebounce(searchTerm, 500)
 * 
 * useEffect(() => {
 *   // Cette fonction ne sera appelée que 500ms après la dernière frappe
 *   performSearch(debouncedSearchTerm)
 * }, [debouncedSearchTerm])
 * ```
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Créer un timer qui met à jour la valeur debouncée après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook pour debouncer une fonction callback
 * 
 * @param callback - La fonction à debouncer
 * @param delay - Le délai en millisecondes (défaut: 300ms)
 * @returns La fonction debouncée
 * 
 * @example
 * ```tsx
 * const debouncedSearch = useDebouncedCallback((searchTerm: string) => {
 *   performSearch(searchTerm)
 * }, 500)
 * 
 * <Input onChange={(e) => debouncedSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay = 300
): T {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const debouncedCallback = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args)
    }, delay)

    setTimeoutId(newTimeoutId)
  }) as T

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  return debouncedCallback
}





