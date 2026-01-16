'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'

/**
 * Composant Google Analytics
 * 
 * Usage:
 * 1. Ajouter NEXT_PUBLIC_GA_ID dans .env.local (format: G-XXXXXXXXXX)
 * 2. Inclure <GoogleAnalytics /> dans app/layout.tsx
 */
export function GoogleAnalytics() {
  const pathname = usePathname()
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  if (!gaId) return null

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}

/**
 * Track les changements de page
 */
export function useGoogleAnalytics() {
  const pathname = usePathname()
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  useEffect(() => {
    if (!gaId || typeof window === 'undefined' || !(window as any).gtag) return

    ;(window as any).gtag('config', gaId, {
      page_path: pathname,
    })
  }, [pathname, gaId])
}

/**
 * Fonction helper pour tracker des événements personnalisés
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !(window as any).gtag) return

  ;(window as any).gtag('event', eventName, params)
}



