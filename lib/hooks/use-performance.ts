/**
 * Hook React pour mesurer les performances
 */

import { useEffect, useRef } from 'react'
import { performanceMonitor } from '@/lib/utils/performance-monitor'

interface UsePerformanceOptions {
  name: string
  enabled?: boolean
  context?: Record<string, unknown>
}

/**
 * Hook pour mesurer le temps de rendu d'un composant
 */
export function usePerformance({ name, enabled = true, context }: UsePerformanceOptions) {
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    startTimeRef.current = performance.now()

    return () => {
      if (startTimeRef.current !== null) {
        const duration = performance.now() - startTimeRef.current
        performanceMonitor.recordMetric({
          name: `${name}_render`,
          value: duration,
          unit: 'ms',
          timestamp: new Date().toISOString(),
          context,
        })
      }
    }
  }, [name, enabled, context])

  return {
    measure: async <T,>(fn: () => Promise<T> | T, operationName?: string) => {
      return performanceMonitor.measure(
        operationName ? `${name}_${operationName}` : name,
        fn,
        context
      )
    },
  }
}

/**
 * Hook pour mesurer les performances d'une requête API
 */
export function useApiPerformance(endpoint: string) {
  return {
    measure: async <T,>(fn: () => Promise<T>) => {
      return performanceMonitor.measure(`api_${endpoint}`, fn, {
        endpoint,
        timestamp: new Date().toISOString(),
      })
    },
  }
}



