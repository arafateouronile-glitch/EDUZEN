'use client'

import { useEffect } from 'react'

/**
 * Hook de thème simplifié - Mode clair uniquement
 * Le mode sombre a été supprimé de l'application
 */
export function useTheme() {
  // S'assurer que la classe 'dark' n'est jamais ajoutée au document
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    // Toujours retirer la classe dark si elle existe
    root.classList.remove('dark')
  }, [])

  return {
    theme: 'light' as const,
    resolvedTheme: 'light' as const,
    setTheme: () => {
      // No-op : le thème est toujours clair
    },
    toggleTheme: () => {
      // No-op : le thème est toujours clair
    },
  }
}

