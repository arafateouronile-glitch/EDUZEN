/**
 * Service pour gérer les tests A/B
 * Permet de tester différentes variantes de fonctionnalités
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'
import { analytics } from '@/lib/utils/analytics'

export type Variant = 'A' | 'B' | 'C' | 'control' | 'treatment'

export interface ABTestConfig {
  testId: string
  name: string
  description?: string
  variants: Variant[]
  trafficSplit?: Partial<Record<Variant, number>> // Pourcentage de trafic pour chaque variante
  startDate?: string
  endDate?: string
  isActive: boolean
}

export interface ABTestResult {
  testId: string
  variant: Variant
  userId?: string
  organizationId?: string
  timestamp: string
}

export class ABTestingService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère ou assigne une variante pour un utilisateur
   * Utilise un hash déterministe pour garantir la cohérence
   */
  getVariant(testId: string, userId?: string, organizationId?: string): Variant {
    const config = this.getTestConfig(testId)
    
    if (!config || !config.isActive) {
      return 'control' // Variante par défaut
    }

    // Vérifier les dates
    if (config.startDate && new Date() < new Date(config.startDate)) {
      return 'control'
    }
    if (config.endDate && new Date() > new Date(config.endDate)) {
      return 'control'
    }

    // Générer un hash déterministe basé sur l'utilisateur ou l'organisation
    const seed = userId || organizationId || Math.random().toString()
    const hash = this.hashString(seed + testId)
    const percentage = hash % 100

    // Assigner la variante selon le split de trafic
    const trafficSplit = config.trafficSplit || this.getDefaultTrafficSplit(config.variants)
    let cumulative = 0

    for (const variant of config.variants) {
      cumulative += trafficSplit[variant] || 0
      if (percentage < cumulative) {
        // Logger l'assignation pour analytics
        this.logVariantAssignment(testId, variant, userId, organizationId)
        return variant
      }
    }

    // Fallback
    return config.variants[0] || 'control'
  }

  /**
   * Vérifie si un test A/B est actif
   */
  isTestActive(testId: string): boolean {
    const config = this.getTestConfig(testId)
    return config?.isActive === true
  }

  /**
   * Track une conversion pour un test A/B
   */
  trackConversion(
    testId: string,
    variant: Variant,
    conversionName: string,
    properties?: Record<string, any>
  ): void {
    analytics.event.track('ab_test_conversion', {
      test_id: testId,
      variant,
      conversion_name: conversionName,
      ...properties,
    })

    logger.info(`A/B Test conversion tracked: ${testId} - ${variant} - ${conversionName}`, {
      testId,
      variant,
      conversionName,
      properties,
    })
  }

  /**
   * Track une impression (affichage) pour un test A/B
   */
  trackImpression(
    testId: string,
    variant: Variant,
    properties?: Record<string, any>
  ): void {
    analytics.event.track('ab_test_impression', {
      test_id: testId,
      variant,
      ...properties,
    })
  }

  /**
   * Récupère la configuration d'un test
   */
  private getTestConfig(testId: string): ABTestConfig | null {
    // Configuration des tests A/B
    // Peut être stockée dans la base de données ou dans un fichier de configuration
    const tests: Record<string, ABTestConfig> = {
      'new-dashboard-layout': {
        testId: 'new-dashboard-layout',
        name: 'Nouveau Layout Dashboard',
        description: 'Test du nouveau layout du dashboard',
        variants: ['control', 'treatment'],
        trafficSplit: { control: 50, treatment: 50 } as Partial<Record<Variant, number>>,
        isActive: process.env.NEXT_PUBLIC_AB_TEST_DASHBOARD === 'true',
      },
      'new-student-form': {
        testId: 'new-student-form',
        name: 'Nouveau Formulaire Étudiant',
        description: 'Test du nouveau formulaire de création d\'étudiant',
        variants: ['A', 'B'],
        trafficSplit: { A: 50, B: 50 } as Partial<Record<Variant, number>>,
        isActive: process.env.NEXT_PUBLIC_AB_TEST_STUDENT_FORM === 'true',
      },
      'payment-flow': {
        testId: 'payment-flow',
        name: 'Nouveau Flux de Paiement',
        description: 'Test du nouveau flux de paiement simplifié',
        variants: ['control', 'treatment'],
        trafficSplit: { control: 70, treatment: 30 } as Partial<Record<Variant, number>>,
        isActive: process.env.NEXT_PUBLIC_AB_TEST_PAYMENT === 'true',
      },
    }

    return tests[testId] || null
  }

  /**
   * Génère un split de trafic par défaut (égal)
   */
  private getDefaultTrafficSplit(variants: Variant[]): Partial<Record<Variant, number>> {
    const split: Partial<Record<Variant, number>> = {}
    const percentage = 100 / variants.length

    variants.forEach((variant) => {
      split[variant] = percentage
    })

    return split
  }

  /**
   * Hash une chaîne de caractères pour obtenir un nombre entre 0 et 99
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash) % 100
  }

  /**
   * Log l'assignation d'une variante pour analytics
   */
  private logVariantAssignment(
    testId: string,
    variant: Variant,
    userId?: string,
    organizationId?: string
  ): void {
    analytics.event.track('ab_test_assigned', {
      test_id: testId,
      variant,
      user_id: userId,
      organization_id: organizationId,
    })
  }

  /**
   * Récupère les statistiques d'un test A/B
   */
  async getTestStats(testId: string): Promise<{
    testId: string
    impressions: Record<Variant, number>
    conversions: Record<Variant, number>
    conversionRates: Record<Variant, number>
  } | null> {
    // Cette fonction devrait interroger les analytics pour obtenir les stats
    // Pour l'instant, on retourne null (à implémenter avec les analytics)
    logger.info(`Getting A/B test stats for: ${testId}`)
    return null
  }
}

export const abTestingService = new ABTestingService()
