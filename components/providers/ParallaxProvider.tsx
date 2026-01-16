'use client'

import { ParallaxProvider as RPParallaxProvider } from 'react-scroll-parallax'
import { useEffect, useState } from 'react'

/**
 * ParallaxProvider optimisé avec lazy loading
 * Charge react-scroll-parallax uniquement après le montage pour améliorer LCP
 */
export function ParallaxProvider({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Délai minimal pour permettre au LCP de se charger d'abord
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Pendant le chargement, rendre les enfants sans parallax
  if (!isMounted) {
    return <>{children}</>
  }

  return <RPParallaxProvider>{children}</RPParallaxProvider>
}
