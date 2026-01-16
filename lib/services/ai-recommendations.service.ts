import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type Recommendation = TableRow<'recommendations'>
type RecommendationType = TableRow<'recommendation_types'>
type AIPrediction = TableRow<'ai_predictions'>

export class AIRecommendationsService {
  private supabase = createClient()

  // ========== RECOMMENDATION TYPES ==========

  async getRecommendationTypes() {
    const { data, error } = await this.supabase
      .from('recommendation_types')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== RECOMMENDATIONS ==========

  async getRecommendations(
    organizationId: string,
    filters?: {
      userId?: string
      status?: string
      category?: string
      minPriority?: number
    }
  ) {
    let query = this.supabase
      .from('recommendations')
      .select(`
        *,
        recommendation_type:recommendation_types(*)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.userId) {
      query = query.or(`user_id.is.null,user_id.eq.${filters.userId}`)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.neq('status', 'dismissed')
    }

    if (filters?.category) {
      query = query.eq('recommendation_type.category', filters.category)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Calculer le score de priorité et trier
    const recommendations = (data || []).map((rec: Recommendation & { recommendation_type?: RecommendationType }) => ({
      ...rec,
      priority_score: this.calculatePriorityScore(
        rec.confidence_score,
        rec.impact_score,
        rec.urgency_score
      ),
    }))

    return recommendations.sort((a: Recommendation & { priority_score: number }, b: Recommendation & { priority_score: number }) => b.priority_score - a.priority_score)
  }

  async createRecommendation(recommendation: TableInsert<'recommendations'>) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .insert(recommendation)
      .select(`
        *,
        recommendation_type:recommendation_types(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async acknowledgeRecommendation(recommendationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    await this.recordAction(recommendationId, userId, 'acknowledge', {})

    return data
  }

  async dismissRecommendation(recommendationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    await this.recordAction(recommendationId, userId, 'dismiss', {})

    return data
  }

  async resolveRecommendation(recommendationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    await this.recordAction(recommendationId, userId, 'resolve', {})

    return data
  }

  // ========== ACTIONS ==========

  async recordAction(
    recommendationId: string,
    userId: string,
    actionType: string,
    actionDetails: Record<string, unknown>
  ) {
    const { data, error } = await this.supabase
      .from('recommendation_actions')
      .insert({
        recommendation_id: recommendationId,
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== FEEDBACK ==========

  async submitFeedback(
    recommendationId: string,
    userId: string,
    feedback: {
      was_helpful?: boolean
      was_accurate?: boolean
      was_actionable?: boolean
      feedback_text?: string
    }
  ) {
    const { data, error } = await this.supabase
      .from('recommendation_feedback')
      .upsert({
        recommendation_id: recommendationId,
        user_id: userId,
        ...feedback,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== PREDICTIONS ==========

  async getPredictions(organizationId: string, filters?: {
    predictionType?: string
    targetType?: string
    targetId?: string
  }) {
    let query = this.supabase
      .from('ai_predictions')
      .select('*, model:ai_models(*)')
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.predictionType) {
      query = query.eq('prediction_type', filters.predictionType)
    }

    if (filters?.targetType) {
      query = query.eq('target_type', filters.targetType)
    }

    if (filters?.targetId) {
      query = query.eq('target_id', filters.targetId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  // ========== ANALYTICS ==========

  async getRecommendationStats(organizationId: string, startDate?: Date, endDate?: Date) {
    let query = this.supabase
      .from('recommendations')
      .select('status, recommendation_type:recommendation_types(category)')
      .eq('organization_id', organizationId)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      by_status: {
        active: 0,
        acknowledged: 0,
        resolved: 0,
        dismissed: 0,
      },
      by_category: {} as Record<string, number>,
    }

      data?.forEach((rec: Recommendation) => {
      if (rec.status) {
        stats.by_status[rec.status as keyof typeof stats.by_status]++
      }
      const category = rec.recommendation_type?.category
      if (category) {
        stats.by_category[category] = (stats.by_category[category] || 0) + 1
      }
    })

    return stats
  }

  // ========== HELPER FUNCTIONS ==========

  private calculatePriorityScore(
    confidence: number,
    impact: number,
    urgency: number
  ): number {
    // Formule: (confidence * 0.3) + (impact * 0.4) + (urgency * 0.3)
    return (confidence * 0.3) + (impact * 0.4) + (urgency * 0.3)
  }

  // ========== RECOMMENDATION GENERATORS ==========

  /**
   * Génère des recommandations basées sur les données des étudiants
   */
  async generateStudentRecommendations(organizationId: string) {
    // Cette fonction serait appelée par un job/cron pour générer des recommandations
    // Pour l'instant, c'est une structure de base
    // L'implémentation complète nécessiterait l'analyse des données réelles
    return []
  }

  /**
   * Génère des recommandations basées sur les paiements
   */
  async generatePaymentRecommendations(organizationId: string) {
    // Structure pour générer des recommandations sur les paiements en retard
    return []
  }

  /**
   * Génère des recommandations basées sur la présence
   */
  async generateAttendanceRecommendations(organizationId: string) {
    // Structure pour générer des recommandations sur la présence
    return []
  }
}

export const aiRecommendationsService = new AIRecommendationsService()


import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type Recommendation = TableRow<'recommendations'>
type RecommendationType = TableRow<'recommendation_types'>
type AIPrediction = TableRow<'ai_predictions'>

export class AIRecommendationsService {
  private supabase = createClient()

  // ========== RECOMMENDATION TYPES ==========

  async getRecommendationTypes() {
    const { data, error } = await this.supabase
      .from('recommendation_types')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== RECOMMENDATIONS ==========

  async getRecommendations(
    organizationId: string,
    filters?: {
      userId?: string
      status?: string
      category?: string
      minPriority?: number
    }
  ) {
    let query = this.supabase
      .from('recommendations')
      .select(`
        *,
        recommendation_type:recommendation_types(*)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.userId) {
      query = query.or(`user_id.is.null,user_id.eq.${filters.userId}`)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.neq('status', 'dismissed')
    }

    if (filters?.category) {
      query = query.eq('recommendation_type.category', filters.category)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Calculer le score de priorité et trier
    const recommendations = (data || []).map((rec: Recommendation & { recommendation_type?: RecommendationType }) => ({
      ...rec,
      priority_score: this.calculatePriorityScore(
        rec.confidence_score,
        rec.impact_score,
        rec.urgency_score
      ),
    }))

    return recommendations.sort((a: Recommendation & { priority_score: number }, b: Recommendation & { priority_score: number }) => b.priority_score - a.priority_score)
  }

  async createRecommendation(recommendation: TableInsert<'recommendations'>) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .insert(recommendation)
      .select(`
        *,
        recommendation_type:recommendation_types(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async acknowledgeRecommendation(recommendationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    await this.recordAction(recommendationId, userId, 'acknowledge', {})

    return data
  }

  async dismissRecommendation(recommendationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    await this.recordAction(recommendationId, userId, 'dismiss', {})

    return data
  }

  async resolveRecommendation(recommendationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    await this.recordAction(recommendationId, userId, 'resolve', {})

    return data
  }

  // ========== ACTIONS ==========

  async recordAction(
    recommendationId: string,
    userId: string,
    actionType: string,
    actionDetails: Record<string, unknown>
  ) {
    const { data, error } = await this.supabase
      .from('recommendation_actions')
      .insert({
        recommendation_id: recommendationId,
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== FEEDBACK ==========

  async submitFeedback(
    recommendationId: string,
    userId: string,
    feedback: {
      was_helpful?: boolean
      was_accurate?: boolean
      was_actionable?: boolean
      feedback_text?: string
    }
  ) {
    const { data, error } = await this.supabase
      .from('recommendation_feedback')
      .upsert({
        recommendation_id: recommendationId,
        user_id: userId,
        ...feedback,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== PREDICTIONS ==========

  async getPredictions(organizationId: string, filters?: {
    predictionType?: string
    targetType?: string
    targetId?: string
  }) {
    let query = this.supabase
      .from('ai_predictions')
      .select('*, model:ai_models(*)')
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.predictionType) {
      query = query.eq('prediction_type', filters.predictionType)
    }

    if (filters?.targetType) {
      query = query.eq('target_type', filters.targetType)
    }

    if (filters?.targetId) {
      query = query.eq('target_id', filters.targetId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  // ========== ANALYTICS ==========

  async getRecommendationStats(organizationId: string, startDate?: Date, endDate?: Date) {
    let query = this.supabase
      .from('recommendations')
      .select('status, recommendation_type:recommendation_types(category)')
      .eq('organization_id', organizationId)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      by_status: {
        active: 0,
        acknowledged: 0,
        resolved: 0,
        dismissed: 0,
      },
      by_category: {} as Record<string, number>,
    }

      data?.forEach((rec: Recommendation) => {
      if (rec.status) {
        stats.by_status[rec.status as keyof typeof stats.by_status]++
      }
      const category = rec.recommendation_type?.category
      if (category) {
        stats.by_category[category] = (stats.by_category[category] || 0) + 1
      }
    })

    return stats
  }

  // ========== HELPER FUNCTIONS ==========

  private calculatePriorityScore(
    confidence: number,
    impact: number,
    urgency: number
  ): number {
    // Formule: (confidence * 0.3) + (impact * 0.4) + (urgency * 0.3)
    return (confidence * 0.3) + (impact * 0.4) + (urgency * 0.3)
  }

  // ========== RECOMMENDATION GENERATORS ==========

  /**
   * Génère des recommandations basées sur les données des étudiants
   */
  async generateStudentRecommendations(organizationId: string) {
    // Cette fonction serait appelée par un job/cron pour générer des recommandations
    // Pour l'instant, c'est une structure de base
    // L'implémentation complète nécessiterait l'analyse des données réelles
    return []
  }

  /**
   * Génère des recommandations basées sur les paiements
   */
  async generatePaymentRecommendations(organizationId: string) {
    // Structure pour générer des recommandations sur les paiements en retard
    return []
  }

  /**
   * Génère des recommandations basées sur la présence
   */
  async generateAttendanceRecommendations(organizationId: string) {
    // Structure pour générer des recommandations sur la présence
    return []
  }
}

export const aiRecommendationsService = new AIRecommendationsService()


import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type Recommendation = TableRow<'recommendations'>
type RecommendationType = TableRow<'recommendation_types'>
type AIPrediction = TableRow<'ai_predictions'>

export class AIRecommendationsService {
  private supabase = createClient()

  // ========== RECOMMENDATION TYPES ==========

  async getRecommendationTypes() {
    const { data, error } = await this.supabase
      .from('recommendation_types')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== RECOMMENDATIONS ==========

  async getRecommendations(
    organizationId: string,
    filters?: {
      userId?: string
      status?: string
      category?: string
      minPriority?: number
    }
  ) {
    let query = this.supabase
      .from('recommendations')
      .select(`
        *,
        recommendation_type:recommendation_types(*)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.userId) {
      query = query.or(`user_id.is.null,user_id.eq.${filters.userId}`)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.neq('status', 'dismissed')
    }

    if (filters?.category) {
      query = query.eq('recommendation_type.category', filters.category)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Calculer le score de priorité et trier
    const recommendations = (data || []).map((rec: Recommendation & { recommendation_type?: RecommendationType }) => ({
      ...rec,
      priority_score: this.calculatePriorityScore(
        rec.confidence_score,
        rec.impact_score,
        rec.urgency_score
      ),
    }))

    return recommendations.sort((a: Recommendation & { priority_score: number }, b: Recommendation & { priority_score: number }) => b.priority_score - a.priority_score)
  }

  async createRecommendation(recommendation: TableInsert<'recommendations'>) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .insert(recommendation)
      .select(`
        *,
        recommendation_type:recommendation_types(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async acknowledgeRecommendation(recommendationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    await this.recordAction(recommendationId, userId, 'acknowledge', {})

    return data
  }

  async dismissRecommendation(recommendationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    await this.recordAction(recommendationId, userId, 'dismiss', {})

    return data
  }

  async resolveRecommendation(recommendationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('recommendations')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    await this.recordAction(recommendationId, userId, 'resolve', {})

    return data
  }

  // ========== ACTIONS ==========

  async recordAction(
    recommendationId: string,
    userId: string,
    actionType: string,
    actionDetails: Record<string, unknown>
  ) {
    const { data, error } = await this.supabase
      .from('recommendation_actions')
      .insert({
        recommendation_id: recommendationId,
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== FEEDBACK ==========

  async submitFeedback(
    recommendationId: string,
    userId: string,
    feedback: {
      was_helpful?: boolean
      was_accurate?: boolean
      was_actionable?: boolean
      feedback_text?: string
    }
  ) {
    const { data, error } = await this.supabase
      .from('recommendation_feedback')
      .upsert({
        recommendation_id: recommendationId,
        user_id: userId,
        ...feedback,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== PREDICTIONS ==========

  async getPredictions(organizationId: string, filters?: {
    predictionType?: string
    targetType?: string
    targetId?: string
  }) {
    let query = this.supabase
      .from('ai_predictions')
      .select('*, model:ai_models(*)')
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.predictionType) {
      query = query.eq('prediction_type', filters.predictionType)
    }

    if (filters?.targetType) {
      query = query.eq('target_type', filters.targetType)
    }

    if (filters?.targetId) {
      query = query.eq('target_id', filters.targetId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  // ========== ANALYTICS ==========

  async getRecommendationStats(organizationId: string, startDate?: Date, endDate?: Date) {
    let query = this.supabase
      .from('recommendations')
      .select('status, recommendation_type:recommendation_types(category)')
      .eq('organization_id', organizationId)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      by_status: {
        active: 0,
        acknowledged: 0,
        resolved: 0,
        dismissed: 0,
      },
      by_category: {} as Record<string, number>,
    }

      data?.forEach((rec: Recommendation) => {
      if (rec.status) {
        stats.by_status[rec.status as keyof typeof stats.by_status]++
      }
      const category = rec.recommendation_type?.category
      if (category) {
        stats.by_category[category] = (stats.by_category[category] || 0) + 1
      }
    })

    return stats
  }

  // ========== HELPER FUNCTIONS ==========

  private calculatePriorityScore(
    confidence: number,
    impact: number,
    urgency: number
  ): number {
    // Formule: (confidence * 0.3) + (impact * 0.4) + (urgency * 0.3)
    return (confidence * 0.3) + (impact * 0.4) + (urgency * 0.3)
  }

  // ========== RECOMMENDATION GENERATORS ==========

  /**
   * Génère des recommandations basées sur les données des étudiants
   */
  async generateStudentRecommendations(organizationId: string) {
    // Cette fonction serait appelée par un job/cron pour générer des recommandations
    // Pour l'instant, c'est une structure de base
    // L'implémentation complète nécessiterait l'analyse des données réelles
    return []
  }

  /**
   * Génère des recommandations basées sur les paiements
   */
  async generatePaymentRecommendations(organizationId: string) {
    // Structure pour générer des recommandations sur les paiements en retard
    return []
  }

  /**
   * Génère des recommandations basées sur la présence
   */
  async generateAttendanceRecommendations(organizationId: string) {
    // Structure pour générer des recommandations sur la présence
    return []
  }
}

export const aiRecommendationsService = new AIRecommendationsService()


