import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, sanitizeError } from '@/lib/utils/logger'

export interface OrganizationUsage {
  plan_name: string | null
  max_students: number | null
  current_student_count: number
  max_sessions_per_month: number | null
  current_sessions_count: number
  subscription_status: string | null
  features: Record<string, any> | null
}

export interface QuotaCheckResult {
  allowed: boolean
  reason?: string
  usage?: OrganizationUsage
}

/**
 * Service de gestion des quotas et limites d'usage
 */
export class QuotaService {
  private supabase: SupabaseClient<any>

  constructor(supabaseClient: SupabaseClient<any>) {
    if (!supabaseClient) {
      throw new Error('SupabaseClient is required for QuotaService')
    }
    this.supabase = supabaseClient
  }

  /**
   * Récupère l'usage actuel d'une organisation
   */
  async getUsage(organizationId: string): Promise<OrganizationUsage | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_organization_usage', { org_id: organizationId })
        .single()

      if (error) {
        // Si la fonction n'existe pas encore, utiliser une requête directe
        if (error.code === '42883' || error.message?.includes('function')) {
          return this.getUsageFallback(organizationId)
        }
        throw error
      }

      return data as OrganizationUsage
    } catch (error) {
      logger.error('QuotaService - Erreur récupération usage', error, {
        organizationId,
        error: sanitizeError(error),
      })
      return null
    }
  }

  /**
   * Fallback si la fonction SQL n'existe pas encore
   */
  private async getUsageFallback(organizationId: string): Promise<OrganizationUsage | null> {
    try {
      // Récupérer la souscription
      const { data: subscription } = await this.supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .maybeSingle()

      if (!subscription || !subscription.plans) {
        return {
          plan_name: null,
          max_students: null,
          current_student_count: 0,
          max_sessions_per_month: null,
          current_sessions_count: 0,
          subscription_status: null,
          features: null,
        }
      }

      const plan = subscription.plans

      // Compter les étudiants actifs
      const { count: studentCount } = await this.supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      // Compter les sessions du mois
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: sessionCount } = await this.supabase
        .from('sessions')
        .select('*, formations!inner(organization_id)', { count: 'exact', head: true })
        .eq('formations.organization_id', organizationId)
        .gte('created_at', startOfMonth.toISOString())

      return {
        plan_name: plan.name,
        max_students: plan.max_students,
        current_student_count: studentCount || 0,
        max_sessions_per_month: plan.max_sessions_per_month,
        current_sessions_count: sessionCount || 0,
        subscription_status: subscription.status,
        features: plan.features || {},
      }
    } catch (error) {
      logger.error('QuotaService - Erreur fallback usage', error, {
        organizationId,
        error: sanitizeError(error),
      })
      return null
    }
  }

  /**
   * Vérifie si une organisation peut ajouter un étudiant
   */
  async canAddStudent(organizationId: string): Promise<QuotaCheckResult> {
    try {
      // Utiliser la fonction SQL si disponible
      const { data: canAdd, error: funcError } = await this.supabase
        .rpc('can_add_student', { org_id: organizationId })

      if (!funcError && canAdd !== undefined) {
        const usage = await this.getUsage(organizationId)
        return {
          allowed: canAdd === true,
          reason: canAdd === false ? 'Limite d\'étudiants atteinte' : undefined,
          usage: usage || undefined,
        }
      }

      // Fallback : vérification manuelle
      const usage = await this.getUsage(organizationId)
      if (!usage) {
        return { allowed: true } // Par défaut, autoriser si pas d'info
      }

      // Plan illimité
      if (usage.max_students === null) {
        return { allowed: true, usage }
      }

      // Vérifier la limite
      const allowed = usage.current_student_count < usage.max_students
      return {
        allowed,
        reason: allowed
          ? undefined
          : `Limite atteinte : ${usage.current_student_count}/${usage.max_students} étudiants`,
        usage,
      }
    } catch (error) {
      logger.error('QuotaService - Erreur vérification quota étudiants', error, {
        organizationId,
        error: sanitizeError(error),
      })
      // En cas d'erreur, autoriser par défaut pour ne pas bloquer
      return { allowed: true }
    }
  }

  /**
   * Vérifie si une organisation peut créer une session
   */
  async canCreateSession(organizationId: string): Promise<QuotaCheckResult> {
    try {
      // Utiliser la fonction SQL si disponible
      const { data: canCreate, error: funcError } = await this.supabase
        .rpc('can_create_session', { org_id: organizationId })

      if (!funcError && canCreate !== undefined) {
        const usage = await this.getUsage(organizationId)
        return {
          allowed: canCreate === true,
          reason: canCreate === false ? 'Limite de sessions mensuelles atteinte' : undefined,
          usage: usage || undefined,
        }
      }

      // Fallback : vérification manuelle
      const usage = await this.getUsage(organizationId)
      if (!usage) {
        return { allowed: true }
      }

      // Plan illimité
      if (usage.max_sessions_per_month === null) {
        return { allowed: true, usage }
      }

      // Vérifier la limite
      const allowed = usage.current_sessions_count < usage.max_sessions_per_month
      return {
        allowed,
        reason: allowed
          ? undefined
          : `Limite mensuelle atteinte : ${usage.current_sessions_count}/${usage.max_sessions_per_month} sessions`,
        usage,
      }
    } catch (error) {
      logger.error('QuotaService - Erreur vérification quota sessions', error, {
        organizationId,
        error: sanitizeError(error),
      })
      return { allowed: true }
    }
  }

  /**
   * Vérifie si une fonctionnalité est disponible pour une organisation
   */
  async hasFeature(
    organizationId: string,
    featureName: string
  ): Promise<boolean> {
    try {
      const usage = await this.getUsage(organizationId)
      if (!usage || !usage.features) {
        return false
      }

      return usage.features[featureName] === true
    } catch (error) {
      logger.error('QuotaService - Erreur vérification feature', error, {
        organizationId,
        featureName,
        error: sanitizeError(error),
      })
      return false
    }
  }

  /**
   * Récupère le plan actuel d'une organisation
   */
  async getCurrentPlan(organizationId: string): Promise<{
    planId: string
    planName: string
    features: Record<string, any>
  } | null> {
    try {
      const usage = await this.getUsage(organizationId)
      if (!usage || !usage.plan_name) {
        return null
      }

      const { data: subscription } = await this.supabase
        .from('subscriptions')
        .select('plan_id, plans(name, features)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .maybeSingle()

      if (!subscription || !subscription.plans) {
        return null
      }

      const plansAny = subscription.plans as any
      const planData = Array.isArray(plansAny) ? plansAny[0] : plansAny
      return {
        planId: subscription.plan_id,
        planName: planData?.name || plansAny?.name || null,
        features: planData?.features || plansAny?.features || {},
      }
    } catch (error) {
      logger.error('QuotaService - Erreur récupération plan', error, {
        organizationId,
        error: sanitizeError(error),
      })
      return null
    }
  }
}

// Note: Ne pas créer d'instance singleton car le service nécessite un client Supabase
// Utiliser `new QuotaService(supabaseClient)` dans les routes API ou composants serveur
