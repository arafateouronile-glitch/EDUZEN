'use client'

import { useEffect, useState } from 'react'

/**
 * Hook pour détecter si l'utilisateur préfère les animations réduites
 * Respecte la préférence système prefers-reduced-motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Vérifier la préférence système
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    // Définir la valeur initiale
    setPrefersReducedMotion(mediaQuery.matches)

    // Écouter les changements de préférence
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Support pour les anciens navigateurs
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback pour Safari < 14
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  return prefersReducedMotion
}



