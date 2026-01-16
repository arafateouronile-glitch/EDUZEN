/**
 * Hook personnalisé pour tracker les vues de pages et les événements utilisateur
 * Utilisé pour analyser les parcours utilisateur
 */

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { analytics } from '@/lib/utils/analytics'
import { useAuth } from './use-auth'

interface PageViewOptions {
  pageName?: string
  category?: string
  additionalData?: Record<string, any>
}

/**
 * Hook pour tracker automatiquement les vues de pages
 * 
 * @param options - Options pour le tracking (pageName, category, additionalData)
 * 
 * @example
 * ```tsx
 * function MyPage() {
 *   usePageAnalytics({
 *     pageName: 'Dashboard',
 *     category: 'Navigation',
 *     additionalData: { section: 'overview' }
 *   })
 *   return <div>...</div>
 * }
 * ```
 */
export function usePageAnalytics(options?: PageViewOptions) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  useEffect(() => {
    // Attendre un peu pour s'assurer que la page est complètement chargée
    const timer = setTimeout(() => {
      const pageName = options?.pageName || pathname
      const fullPath = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname

      // Track page view
      analytics.page.view({
        path: fullPath,
        title: pageName,
        category: options?.category || 'Page',
        userId: user?.id,
        organizationId: user?.organization_id,
        ...options?.additionalData,
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [pathname, searchParams, user?.id, user?.organization_id, options])
}

/**
 * Hook pour tracker les événements utilisateur spécifiques
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const trackEvent = useUserEventTracking()
 *   
 *   const handleClick = () => {
 *     trackEvent('button_click', {
 *       button_name: 'Submit',
 *       section: 'form'
 *     })
 *   }
 * }
 * ```
 */
export function useUserEventTracking() {
  const { user } = useAuth()

  return (eventName: string, properties?: Record<string, any>) => {
    analytics.event.track(eventName, {
      userId: user?.id,
      organizationId: user?.organization_id,
      ...properties,
    })
  }
}

/**
 * Hook pour tracker les conversions (actions importantes)
 * 
 * @example
 * ```tsx
 * function PaymentPage() {
 *   const trackConversion = useConversionTracking()
 *   
 *   const handlePaymentSuccess = () => {
 *     trackConversion('payment_completed', {
 *       amount: 1000,
 *       currency: 'XOF'
 *     })
 *   }
 * }
 * ```
 */
export function useConversionTracking() {
  const { user } = useAuth()

  return (conversionName: string, properties?: Record<string, any>) => {
    analytics.conversion.track(conversionName, {
      userId: user?.id,
      organizationId: user?.organization_id,
      ...properties,
    })
  }
}

/**
 * Hook pour tracker le temps passé sur une page
 * 
 * @example
 * ```tsx
 * function MyPage() {
 *   useTimeOnPage({
 *     pageName: 'Dashboard',
 *     minTime: 5000 // Track seulement si l'utilisateur reste plus de 5 secondes
 *   })
 * }
 * ```
 */
export function useTimeOnPage(options?: { pageName?: string; minTime?: number }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const minTime = options?.minTime || 0

  useEffect(() => {
    const startTime = Date.now()

    return () => {
      const timeSpent = Date.now() - startTime

      if (timeSpent >= minTime) {
        analytics.event.track('time_on_page', {
          path: pathname,
          pageName: options?.pageName || pathname,
          timeSpent,
          userId: user?.id,
          organizationId: user?.organization_id,
        })
      }
    }
  }, [pathname, user?.id, user?.organization_id, options?.pageName, minTime])
}



