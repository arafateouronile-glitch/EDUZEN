/**
 * Hook React pour gérer le localStorage de manière sûre
 * avec synchronisation entre onglets et gestion des erreurs
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger, sanitizeError } from '@/lib/utils/logger'

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // État pour stocker la valeur
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      logger.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Fonction pour mettre à jour la valeur
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Permettre la valeur d'être une fonction pour avoir la même API que useState
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // Sauvegarder l'état
        setStoredValue(valueToStore)

        // Sauvegarder dans localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }

        // Déclencher un événement personnalisé pour synchroniser entre onglets
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('localStorageChange', {
              detail: { key, value: valueToStore },
            })
          )
        }
      } catch (error) {
        logger.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  // Fonction pour supprimer la valeur
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
        window.dispatchEvent(
          new CustomEvent('localStorageChange', {
            detail: { key, value: null },
          })
        )
      }
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  // Écouter les changements de localStorage (synchronisation entre onglets)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if (e instanceof StorageEvent) {
        if (e.key === key && e.newValue) {
          try {
            setStoredValue(JSON.parse(e.newValue))
          } catch (error) {
            logger.error(`Error parsing localStorage value for key "${key}":`, error)
          }
        }
      } else if (e instanceof CustomEvent && e.detail?.key === key) {
        setStoredValue(e.detail.value)
      }
    }

    // Écouter les événements Storage (changements depuis d'autres onglets)
    window.addEventListener('storage', handleStorageChange)
    // Écouter les événements personnalisés (changements depuis le même onglet)
    window.addEventListener('localStorageChange', handleStorageChange as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleStorageChange as EventListener)
    }
  }, [key])

  return [storedValue, setValue, removeValue]
}



