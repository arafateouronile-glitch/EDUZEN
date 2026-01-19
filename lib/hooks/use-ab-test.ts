/**
 * Hook personnalisé pour utiliser les tests A/B dans les composants React
 */

import { useMemo } from 'react'
import { useAuth } from './use-auth'
import { abTestingService } from '@/lib/services/ab-testing.service'
import type { Variant } from '@/lib/services/ab-testing.service'

interface UseABTestOptions {
  testId: string
  onVariantAssigned?: (variant: Variant) => void
}

/**
 * Hook pour obtenir la variante d'un test A/B pour l'utilisateur actuel
 * 
 * @param options - Options du test (testId, onVariantAssigned)
 * @returns La variante assignée à l'utilisateur
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const variant = useABTest({ testId: 'new-dashboard-layout' })
 *   
 *   if (variant === 'treatment') {
 *     return <NewDashboardLayout />
 *   }
 *   
 *   return <OldDashboardLayout />
 * }
 * ```
 */
export function useABTest(options: UseABTestOptions): Variant {
  const { testId, onVariantAssigned } = options
  const { user } = useAuth()

  const variant = useMemo(() => {
    const assignedVariant = abTestingService.getVariant(
      testId,
      user?.id,
      user?.organization_id || undefined
    )

    // Track l'impression
    abTestingService.trackImpression(testId, assignedVariant, {
      user_id: user?.id,
      organization_id: user?.organization_id,
    })

    // Callback si fourni
    if (onVariantAssigned) {
      onVariantAssigned(assignedVariant)
    }

    return assignedVariant
  }, [testId, user?.id, user?.organization_id, onVariantAssigned])

  return variant
}

/**
 * Hook pour tracker une conversion dans un test A/B
 * 
 * @example
 * ```tsx
 * function PaymentButton() {
 *   const variant = useABTest({ testId: 'payment-flow' })
 *   const trackConversion = useABTestConversion(testId: 'payment-flow', variant)
 *   
 *   const handlePayment = async () => {
 *     // ... logique de paiement
 *     trackConversion('payment_completed', { amount: 1000 })
 *   }
 * }
 * ```
 */
export function useABTestConversion(testId: string, variant: Variant) {
  return (conversionName: string, properties?: Record<string, any>) => {
    abTestingService.trackConversion(testId, variant, conversionName, properties)
  }
}
