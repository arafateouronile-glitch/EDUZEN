/**
 * Moniteur de performance pour l'application
 * Track les temps de chargement, les requêtes API, etc.
 */

interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count'
  timestamp: string
  context?: Record<string, unknown>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000 // Limiter le nombre de métriques en mémoire

  /**
   * Mesure le temps d'exécution d'une fonction
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T,
    context?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        context,
      })
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        context: {
          ...context,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
      throw error
    }
  }

  /**
   * Enregistre une métrique manuellement
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)

    // Limiter le nombre de métriques en mémoire
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // En production, envoyer vers un service externe
    if (process.env.NODE_ENV === 'production') {
      // TODO: Envoyer vers un service de monitoring (Sentry, Datadog, etc.)
      // this.sendToMonitoring(metric)
    }
  }

  /**
   * Récupère les métriques pour un nom donné
   */
  getMetrics(name: string, limit = 100): PerformanceMetric[] {
    return this.metrics
      .filter((m) => m.name === name)
      .slice(-limit)
  }

  /**
   * Récupère les statistiques pour un nom donné
   */
  getStats(name: string) {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) {
      return null
    }

    const values = metrics.map((m) => m.value)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const sorted = [...values].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    return {
      count: metrics.length,
      avg,
      min,
      max,
      median,
      p95,
      p99,
    }
  }

  /**
   * Récupère toutes les métriques
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Nettoie les métriques
   */
  clear() {
    this.metrics = []
  }

  /**
   * Récupère les métriques groupées par nom
   */
  getMetricsByGroup(): Record<string, PerformanceMetric[]> {
    const grouped: Record<string, PerformanceMetric[]> = {}
    for (const metric of this.metrics) {
      if (!grouped[metric.name]) {
        grouped[metric.name] = []
      }
      grouped[metric.name].push(metric)
    }
    return grouped
  }
}

// Export d'une instance singleton
export const performanceMonitor = new PerformanceMonitor()

/**
 * Hook React pour mesurer les performances d'un composant
 */
export function usePerformanceMeasure(name: string) {
  if (typeof window === 'undefined') {
    return { measure: async <T,>(fn: () => Promise<T> | T) => fn() }
  }

  return {
    measure: <T,>(fn: () => Promise<T> | T, context?: Record<string, unknown>) =>
      performanceMonitor.measure(name, fn, context),
  }
}



