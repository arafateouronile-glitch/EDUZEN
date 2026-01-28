'use client'

import { useEffect } from 'react'

/**
 * Composant pour s'assurer que la classe 'dark' n'est jamais ajoutée au document
 * Doit être utilisé côté client uniquement
 */
export function ThemeScript() {
  useEffect(() => {
    // S'assurer que la classe 'dark' n'est jamais ajoutée au document
    const root = document.documentElement
    root.classList.remove('dark')

    // Observer les changements pour empêcher l'ajout de la classe dark
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (root.classList.contains('dark')) {
            root.classList.remove('dark')
          }
        }
      })
    })

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
