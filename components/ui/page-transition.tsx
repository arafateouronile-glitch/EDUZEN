'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Wrapper avec key=pathname pour que React remonte le contenu à chaque changement de route.
 * Pas d'animation d'entrée (opacity 0, y: 8) : affichage immédiat comme au refresh,
 * pour éviter le décalage à la navigation entre pages dashboard.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="w-full">
      {children}
    </div>
  )
}







