/**
 * Hook React pour débouncer une valeur
 * Utile pour les recherches, les filtres, etc.
 */

'use client'

import { useState, useEffect } from 'react'

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}



