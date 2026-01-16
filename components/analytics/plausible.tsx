'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Composant Plausible Analytics
 * 
 * Usage:
 * 1. Ajouter NEXT_PUBLIC_PLAUSIBLE_DOMAIN dans .env.local
 * 2. Inclure <PlausibleAnalytics /> dans app/layout.tsx
 */
export function PlausibleAnalytics() {
  const pathname = usePathname()
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

  useEffect(() => {
    if (!domain || typeof window === 'undefined') return

    // Charger le script Plausible
    const script = document.createElement('script')
    script.defer = true
    script.setAttribute('data-domain', domain)
    script.src = 'https://plausible.io/js/script.js'
    document.head.appendChild(script)

    return () => {
      // Nettoyer le script si le composant est démonté
      const existingScript = document.querySelector(`script[data-domain="${domain}"]`)
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [domain])

  // Track les changements de page
  useEffect(() => {
    if (!domain || typeof window === 'undefined' || !(window as any).plausible) return

    ;(window as any).plausible('pageview', {
      url: pathname,
    })
  }, [pathname, domain])

  return null
}

/**
 * Fonction helper pour tracker des événements personnalisés
 */
export function trackEvent(eventName: string, props?: Record<string, any>) {
  if (typeof window === 'undefined' || !(window as any).plausible) return

  ;(window as any).plausible(eventName, {
    props,
  })
}



