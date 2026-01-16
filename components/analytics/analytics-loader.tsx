'use client'

import dynamic from 'next/dynamic'

// Lazy load analytics pour améliorer TBT (scripts tiers ~50KB)
// Ces scripts ne sont pas critiques pour le rendu initial
const PlausibleAnalytics = dynamic(() => import('@/components/analytics/plausible').then(mod => ({ default: mod.PlausibleAnalytics })), {
  ssr: false,
})

const GoogleAnalytics = dynamic(() => import('@/components/analytics/google-analytics').then(mod => ({ default: mod.GoogleAnalytics })), {
  ssr: false,
})

/**
 * Composant wrapper pour charger les analytics de manière lazy
 * Améliore TBT en ne bloquant pas le rendu initial
 */
export function AnalyticsLoader() {
  return (
    <>
      <PlausibleAnalytics />
      <GoogleAnalytics />
    </>
  )
}
