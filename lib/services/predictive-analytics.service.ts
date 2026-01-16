import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type SuccessRatePrediction = TableRow<'success_rate_predictions'>
type DropoutPrediction = TableRow<'dropout_predictions'>
type PredictionAlert = TableRow<'prediction_alerts'>
type StudentFeature = TableRow<'student_features'>

export class PredictiveAnalyticsService {
  private supabase = createClient()

  // ========== SUCCESS RATE PREDICTIONS ==========

  async getSuccessRatePredictions(
    organizationId: string,
    filters?: {
      studentId?: string
      sessionId?: string
      formationId?: string
      riskCategory?: string
      minConfidence?: number
    }
  ) {
    let query = this.supabase
      .from('success_rate_predictions')
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*),
        model:predictive_models(*)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.formationId) {
      query = query.eq('formation_id', filters.formationId)
    }

    if (filters?.riskCategory) {
      query = query.eq('risk_category', filters.riskCategory)
    }

    if (filters?.minConfidence) {
      query = query.gte('confidence_level', filters.minConfidence)
    }

    const { data, error } = await query
      .order('prediction_date', { ascending: false })

    if (error) throw error
    return data
  }

  async createSuccessRatePrediction(prediction: TableInsert<'success_rate_predictions'>) {
    // Calculer automatiquement la catégorie de risque
    const riskCategory = this.calculateRiskCategory(prediction.predicted_success_rate || 0)

    const { data, error } = await this.supabase
      .from('success_rate_predictions')
      .insert({
        ...prediction,
        risk_category: riskCategory,
      })
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*)
      `)
      .single()

    if (error) throw error

    // Créer une alerte si le risque est élevé
    if (riskCategory === 'high' || riskCategory === 'critical') {
      await this.createAlert({
        organization_id: prediction.organization_id,
        alert_type: 'low_success_rate',
        student_id: prediction.student_id,
        session_id: prediction.session_id || undefined,
        success_prediction_id: data.id,
        severity: riskCategory === 'critical' ? 'critical' : 'high',
        message: `Taux de réussite prédit faible (${prediction.predicted_success_rate}%) pour cet étudiant`,
        recommended_actions: {
          actions: [
            'Planifier un entretien avec l\'étudiant',
            'Identifier les difficultés spécifiques',
            'Proposer un soutien supplémentaire',
            'Surveiller de près les prochaines évaluations',
          ],
        },
      })
    }

    return data
  }

  async validateSuccessRatePrediction(
    predictionId: string,
    actualSuccessRate: number,
    actualGrade?: number
  ) {
    const { data: prediction } = await this.supabase
      .from('success_rate_predictions')
      .select('predicted_success_rate')
      .eq('id', predictionId)
      .single()

    if (!prediction) throw new Error('Prédiction non trouvée')

    const wasAccurate = Math.abs(
      (prediction.predicted_success_rate || 0) - actualSuccessRate
    ) <= 10 // Tolérance de 10%

    const { data, error } = await this.supabase
      .from('success_rate_predictions')
      .update({
        actual_success_rate: actualSuccessRate,
        actual_grade: actualGrade,
        was_accurate: wasAccurate,
        validated_at: new Date().toISOString(),
      })
      .eq('id', predictionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== DROPOUT PREDICTIONS ==========

  async getDropoutPredictions(
    organizationId: string,
    filters?: {
      studentId?: string
      sessionId?: string
      formationId?: string
      riskCategory?: string
      minConfidence?: number
    }
  ) {
    let query = this.supabase
      .from('dropout_predictions')
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*),
        model:predictive_models(*)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.formationId) {
      query = query.eq('formation_id', filters.formationId)
    }

    if (filters?.riskCategory) {
      query = query.eq('risk_category', filters.riskCategory)
    }

    if (filters?.minConfidence) {
      query = query.gte('confidence_level', filters.minConfidence)
    }

    const { data, error } = await query
      .order('prediction_date', { ascending: false })

    if (error) throw error
    return data
  }

  async createDropoutPrediction(prediction: TableInsert<'dropout_predictions'>) {
    const riskCategory = this.calculateRiskCategory(prediction.dropout_probability || 0)

    const { data, error } = await this.supabase
      .from('dropout_predictions')
      .insert({
        ...prediction,
        risk_category: riskCategory,
      })
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*)
      `)
      .single()

    if (error) throw error

    // Créer une alerte si le risque est élevé
    if (riskCategory === 'high' || riskCategory === 'critical') {
      await this.createAlert({
        organization_id: prediction.organization_id,
        alert_type: 'high_dropout_risk',
        student_id: prediction.student_id,
        session_id: prediction.session_id || undefined,
        dropout_prediction_id: data.id,
        severity: riskCategory === 'critical' ? 'critical' : 'high',
        message: `Risque d'abandon élevé (${prediction.dropout_probability}%) pour cet étudiant`,
        recommended_actions: {
          actions: [
            'Contacter l\'étudiant immédiatement',
            'Identifier les raisons potentielles d\'abandon',
            'Proposer des solutions adaptées',
            'Mettre en place un suivi renforcé',
          ],
        },
      })
    }

    return data
  }

  async validateDropoutPrediction(
    predictionId: string,
    didDropout: boolean,
    actualDropoutDate?: string
  ) {
    const { data: prediction } = await this.supabase
      .from('dropout_predictions')
      .select('dropout_probability')
      .eq('id', predictionId)
      .single()

    if (!prediction) throw new Error('Prédiction non trouvée')

    // La prédiction est considérée comme précise si :
    // - Risque élevé (>60%) et abandon réel
    // - Risque faible (<40%) et pas d'abandon
    const wasAccurate =
      (prediction.dropout_probability || 0) >= 60 && didDropout
        ? true
        : (prediction.dropout_probability || 0) < 40 && !didDropout
        ? true
        : false

    const { data, error } = await this.supabase
      .from('dropout_predictions')
      .update({
        did_dropout: didDropout,
        actual_dropout_date: actualDropoutDate,
        was_accurate: wasAccurate,
        validated_at: new Date().toISOString(),
      })
      .eq('id', predictionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== STUDENT FEATURES ==========

  async getStudentFeatures(
    studentId: string,
    sessionId?: string,
    formationId?: string
  ) {
    let query = this.supabase
      .from('student_features')
      .select('*, feature:prediction_features(*)')
      .eq('student_id', studentId)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (formationId) {
      query = query.eq('formation_id', formationId)
    }

    const { data, error } = await query
      .order('calculated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async updateStudentFeature(feature: TableInsert<'student_features'>) {
    const { data, error } = await this.supabase
      .from('student_features')
      .upsert(feature, {
        onConflict: 'student_id,feature_id,session_id,formation_id',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ALERTS ==========

  async getAlerts(
    organizationId: string,
    filters?: {
      studentId?: string
      status?: string
      severity?: string
      alertType?: string
    }
  ) {
    let query = this.supabase
      .from('prediction_alerts')
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*)
      `)
      .eq('organization_id', organizationId)

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.eq('status', 'active')
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters?.alertType) {
      query = query.eq('alert_type', filters.alertType)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createAlert(alert: TableInsert<'prediction_alerts'>) {
    const { data, error } = await this.supabase
      .from('prediction_alerts')
      .insert(alert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async acknowledgeAlert(alertId: string) {
    const { data, error } = await this.supabase
      .from('prediction_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async resolveAlert(alertId: string) {
    const { data, error } = await this.supabase
      .from('prediction_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ANALYTICS & REPORTS ==========

  async generateSuccessRateReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: Record<string, unknown>
  ) {
    // Récupérer les prédictions validées dans la période
    const { data: predictions } = await this.supabase
      .from('success_rate_predictions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('prediction_date', startDate.toISOString())
      .lte('prediction_date', endDate.toISOString())
      .not('validated_at', 'is', null)

    if (!predictions) return null

    const stats = {
      total_predictions: predictions.length,
      accurate_predictions: predictions.filter((p) => p.was_accurate).length,
      accuracy_rate: 0,
      average_predicted_rate: 0,
      average_actual_rate: 0,
      by_risk_category: {} as Record<string, number>,
    }

    if (predictions.length > 0) {
      stats.accuracy_rate =
        (stats.accurate_predictions / predictions.length) * 100
      stats.average_predicted_rate =
        predictions.reduce((sum, p) => sum + (p.predicted_success_rate || 0), 0) /
        predictions.length
      stats.average_actual_rate =
        predictions.reduce((sum, p) => sum + (p.actual_success_rate || 0), 0) /
        predictions.length

      predictions.forEach((p) => {
        const category = p.risk_category || 'unknown'
        stats.by_risk_category[category] = (stats.by_risk_category[category] || 0) + 1
      })
    }

    return stats
  }

  async generateDropoutReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: Record<string, unknown>
  ) {
    const { data: predictions } = await this.supabase
      .from('dropout_predictions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('prediction_date', startDate.toISOString())
      .lte('prediction_date', endDate.toISOString())
      .not('validated_at', 'is', null)

    if (!predictions) return null

    const stats = {
      total_predictions: predictions.length,
      accurate_predictions: predictions.filter((p) => p.was_accurate).length,
      accuracy_rate: 0,
      actual_dropouts: predictions.filter((p) => p.did_dropout).length,
      dropout_rate: 0,
      average_predicted_probability: 0,
      by_risk_category: {} as Record<string, number>,
    }

    if (predictions.length > 0) {
      stats.accuracy_rate =
        (stats.accurate_predictions / predictions.length) * 100
      stats.dropout_rate = (stats.actual_dropouts / predictions.length) * 100
      stats.average_predicted_probability =
        predictions.reduce((sum, p) => sum + (p.dropout_probability || 0), 0) /
        predictions.length

      predictions.forEach((p) => {
        const category = p.risk_category || 'unknown'
        stats.by_risk_category[category] = (stats.by_risk_category[category] || 0) + 1
      })
    }

    return stats
  }

  // ========== HELPER FUNCTIONS ==========

  private calculateRiskCategory(score: number): string {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService()


import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type SuccessRatePrediction = TableRow<'success_rate_predictions'>
type DropoutPrediction = TableRow<'dropout_predictions'>
type PredictionAlert = TableRow<'prediction_alerts'>
type StudentFeature = TableRow<'student_features'>

export class PredictiveAnalyticsService {
  private supabase = createClient()

  // ========== SUCCESS RATE PREDICTIONS ==========

  async getSuccessRatePredictions(
    organizationId: string,
    filters?: {
      studentId?: string
      sessionId?: string
      formationId?: string
      riskCategory?: string
      minConfidence?: number
    }
  ) {
    let query = this.supabase
      .from('success_rate_predictions')
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*),
        model:predictive_models(*)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.formationId) {
      query = query.eq('formation_id', filters.formationId)
    }

    if (filters?.riskCategory) {
      query = query.eq('risk_category', filters.riskCategory)
    }

    if (filters?.minConfidence) {
      query = query.gte('confidence_level', filters.minConfidence)
    }

    const { data, error } = await query
      .order('prediction_date', { ascending: false })

    if (error) throw error
    return data
  }

  async createSuccessRatePrediction(prediction: TableInsert<'success_rate_predictions'>) {
    // Calculer automatiquement la catégorie de risque
    const riskCategory = this.calculateRiskCategory(prediction.predicted_success_rate || 0)

    const { data, error } = await this.supabase
      .from('success_rate_predictions')
      .insert({
        ...prediction,
        risk_category: riskCategory,
      })
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*)
      `)
      .single()

    if (error) throw error

    // Créer une alerte si le risque est élevé
    if (riskCategory === 'high' || riskCategory === 'critical') {
      await this.createAlert({
        organization_id: prediction.organization_id,
        alert_type: 'low_success_rate',
        student_id: prediction.student_id,
        session_id: prediction.session_id || undefined,
        success_prediction_id: data.id,
        severity: riskCategory === 'critical' ? 'critical' : 'high',
        message: `Taux de réussite prédit faible (${prediction.predicted_success_rate}%) pour cet étudiant`,
        recommended_actions: {
          actions: [
            'Planifier un entretien avec l\'étudiant',
            'Identifier les difficultés spécifiques',
            'Proposer un soutien supplémentaire',
            'Surveiller de près les prochaines évaluations',
          ],
        },
      })
    }

    return data
  }

  async validateSuccessRatePrediction(
    predictionId: string,
    actualSuccessRate: number,
    actualGrade?: number
  ) {
    const { data: prediction } = await this.supabase
      .from('success_rate_predictions')
      .select('predicted_success_rate')
      .eq('id', predictionId)
      .single()

    if (!prediction) throw new Error('Prédiction non trouvée')

    const wasAccurate = Math.abs(
      (prediction.predicted_success_rate || 0) - actualSuccessRate
    ) <= 10 // Tolérance de 10%

    const { data, error } = await this.supabase
      .from('success_rate_predictions')
      .update({
        actual_success_rate: actualSuccessRate,
        actual_grade: actualGrade,
        was_accurate: wasAccurate,
        validated_at: new Date().toISOString(),
      })
      .eq('id', predictionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== DROPOUT PREDICTIONS ==========

  async getDropoutPredictions(
    organizationId: string,
    filters?: {
      studentId?: string
      sessionId?: string
      formationId?: string
      riskCategory?: string
      minConfidence?: number
    }
  ) {
    let query = this.supabase
      .from('dropout_predictions')
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*),
        model:predictive_models(*)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.formationId) {
      query = query.eq('formation_id', filters.formationId)
    }

    if (filters?.riskCategory) {
      query = query.eq('risk_category', filters.riskCategory)
    }

    if (filters?.minConfidence) {
      query = query.gte('confidence_level', filters.minConfidence)
    }

    const { data, error } = await query
      .order('prediction_date', { ascending: false })

    if (error) throw error
    return data
  }

  async createDropoutPrediction(prediction: TableInsert<'dropout_predictions'>) {
    const riskCategory = this.calculateRiskCategory(prediction.dropout_probability || 0)

    const { data, error } = await this.supabase
      .from('dropout_predictions')
      .insert({
        ...prediction,
        risk_category: riskCategory,
      })
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*)
      `)
      .single()

    if (error) throw error

    // Créer une alerte si le risque est élevé
    if (riskCategory === 'high' || riskCategory === 'critical') {
      await this.createAlert({
        organization_id: prediction.organization_id,
        alert_type: 'high_dropout_risk',
        student_id: prediction.student_id,
        session_id: prediction.session_id || undefined,
        dropout_prediction_id: data.id,
        severity: riskCategory === 'critical' ? 'critical' : 'high',
        message: `Risque d'abandon élevé (${prediction.dropout_probability}%) pour cet étudiant`,
        recommended_actions: {
          actions: [
            'Contacter l\'étudiant immédiatement',
            'Identifier les raisons potentielles d\'abandon',
            'Proposer des solutions adaptées',
            'Mettre en place un suivi renforcé',
          ],
        },
      })
    }

    return data
  }

  async validateDropoutPrediction(
    predictionId: string,
    didDropout: boolean,
    actualDropoutDate?: string
  ) {
    const { data: prediction } = await this.supabase
      .from('dropout_predictions')
      .select('dropout_probability')
      .eq('id', predictionId)
      .single()

    if (!prediction) throw new Error('Prédiction non trouvée')

    // La prédiction est considérée comme précise si :
    // - Risque élevé (>60%) et abandon réel
    // - Risque faible (<40%) et pas d'abandon
    const wasAccurate =
      (prediction.dropout_probability || 0) >= 60 && didDropout
        ? true
        : (prediction.dropout_probability || 0) < 40 && !didDropout
        ? true
        : false

    const { data, error } = await this.supabase
      .from('dropout_predictions')
      .update({
        did_dropout: didDropout,
        actual_dropout_date: actualDropoutDate,
        was_accurate: wasAccurate,
        validated_at: new Date().toISOString(),
      })
      .eq('id', predictionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== STUDENT FEATURES ==========

  async getStudentFeatures(
    studentId: string,
    sessionId?: string,
    formationId?: string
  ) {
    let query = this.supabase
      .from('student_features')
      .select('*, feature:prediction_features(*)')
      .eq('student_id', studentId)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (formationId) {
      query = query.eq('formation_id', formationId)
    }

    const { data, error } = await query
      .order('calculated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async updateStudentFeature(feature: TableInsert<'student_features'>) {
    const { data, error } = await this.supabase
      .from('student_features')
      .upsert(feature, {
        onConflict: 'student_id,feature_id,session_id,formation_id',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ALERTS ==========

  async getAlerts(
    organizationId: string,
    filters?: {
      studentId?: string
      status?: string
      severity?: string
      alertType?: string
    }
  ) {
    let query = this.supabase
      .from('prediction_alerts')
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*)
      `)
      .eq('organization_id', organizationId)

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.eq('status', 'active')
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters?.alertType) {
      query = query.eq('alert_type', filters.alertType)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createAlert(alert: TableInsert<'prediction_alerts'>) {
    const { data, error } = await this.supabase
      .from('prediction_alerts')
      .insert(alert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async acknowledgeAlert(alertId: string) {
    const { data, error } = await this.supabase
      .from('prediction_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async resolveAlert(alertId: string) {
    const { data, error } = await this.supabase
      .from('prediction_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ANALYTICS & REPORTS ==========

  async generateSuccessRateReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: Record<string, unknown>
  ) {
    // Récupérer les prédictions validées dans la période
    const { data: predictions } = await this.supabase
      .from('success_rate_predictions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('prediction_date', startDate.toISOString())
      .lte('prediction_date', endDate.toISOString())
      .not('validated_at', 'is', null)

    if (!predictions) return null

    const stats = {
      total_predictions: predictions.length,
      accurate_predictions: predictions.filter((p) => p.was_accurate).length,
      accuracy_rate: 0,
      average_predicted_rate: 0,
      average_actual_rate: 0,
      by_risk_category: {} as Record<string, number>,
    }

    if (predictions.length > 0) {
      stats.accuracy_rate =
        (stats.accurate_predictions / predictions.length) * 100
      stats.average_predicted_rate =
        predictions.reduce((sum, p) => sum + (p.predicted_success_rate || 0), 0) /
        predictions.length
      stats.average_actual_rate =
        predictions.reduce((sum, p) => sum + (p.actual_success_rate || 0), 0) /
        predictions.length

      predictions.forEach((p) => {
        const category = p.risk_category || 'unknown'
        stats.by_risk_category[category] = (stats.by_risk_category[category] || 0) + 1
      })
    }

    return stats
  }

  async generateDropoutReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: Record<string, unknown>
  ) {
    const { data: predictions } = await this.supabase
      .from('dropout_predictions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('prediction_date', startDate.toISOString())
      .lte('prediction_date', endDate.toISOString())
      .not('validated_at', 'is', null)

    if (!predictions) return null

    const stats = {
      total_predictions: predictions.length,
      accurate_predictions: predictions.filter((p) => p.was_accurate).length,
      accuracy_rate: 0,
      actual_dropouts: predictions.filter((p) => p.did_dropout).length,
      dropout_rate: 0,
      average_predicted_probability: 0,
      by_risk_category: {} as Record<string, number>,
    }

    if (predictions.length > 0) {
      stats.accuracy_rate =
        (stats.accurate_predictions / predictions.length) * 100
      stats.dropout_rate = (stats.actual_dropouts / predictions.length) * 100
      stats.average_predicted_probability =
        predictions.reduce((sum, p) => sum + (p.dropout_probability || 0), 0) /
        predictions.length

      predictions.forEach((p) => {
        const category = p.risk_category || 'unknown'
        stats.by_risk_category[category] = (stats.by_risk_category[category] || 0) + 1
      })
    }

    return stats
  }

  // ========== HELPER FUNCTIONS ==========

  private calculateRiskCategory(score: number): string {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService()


import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type SuccessRatePrediction = TableRow<'success_rate_predictions'>
type DropoutPrediction = TableRow<'dropout_predictions'>
type PredictionAlert = TableRow<'prediction_alerts'>
type StudentFeature = TableRow<'student_features'>

export class PredictiveAnalyticsService {
  private supabase = createClient()

  // ========== SUCCESS RATE PREDICTIONS ==========

  async getSuccessRatePredictions(
    organizationId: string,
    filters?: {
      studentId?: string
      sessionId?: string
      formationId?: string
      riskCategory?: string
      minConfidence?: number
    }
  ) {
    let query = this.supabase
      .from('success_rate_predictions')
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*),
        model:predictive_models(*)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.formationId) {
      query = query.eq('formation_id', filters.formationId)
    }

    if (filters?.riskCategory) {
      query = query.eq('risk_category', filters.riskCategory)
    }

    if (filters?.minConfidence) {
      query = query.gte('confidence_level', filters.minConfidence)
    }

    const { data, error } = await query
      .order('prediction_date', { ascending: false })

    if (error) throw error
    return data
  }

  async createSuccessRatePrediction(prediction: TableInsert<'success_rate_predictions'>) {
    // Calculer automatiquement la catégorie de risque
    const riskCategory = this.calculateRiskCategory(prediction.predicted_success_rate || 0)

    const { data, error } = await this.supabase
      .from('success_rate_predictions')
      .insert({
        ...prediction,
        risk_category: riskCategory,
      })
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*)
      `)
      .single()

    if (error) throw error

    // Créer une alerte si le risque est élevé
    if (riskCategory === 'high' || riskCategory === 'critical') {
      await this.createAlert({
        organization_id: prediction.organization_id,
        alert_type: 'low_success_rate',
        student_id: prediction.student_id,
        session_id: prediction.session_id || undefined,
        success_prediction_id: data.id,
        severity: riskCategory === 'critical' ? 'critical' : 'high',
        message: `Taux de réussite prédit faible (${prediction.predicted_success_rate}%) pour cet étudiant`,
        recommended_actions: {
          actions: [
            'Planifier un entretien avec l\'étudiant',
            'Identifier les difficultés spécifiques',
            'Proposer un soutien supplémentaire',
            'Surveiller de près les prochaines évaluations',
          ],
        },
      })
    }

    return data
  }

  async validateSuccessRatePrediction(
    predictionId: string,
    actualSuccessRate: number,
    actualGrade?: number
  ) {
    const { data: prediction } = await this.supabase
      .from('success_rate_predictions')
      .select('predicted_success_rate')
      .eq('id', predictionId)
      .single()

    if (!prediction) throw new Error('Prédiction non trouvée')

    const wasAccurate = Math.abs(
      (prediction.predicted_success_rate || 0) - actualSuccessRate
    ) <= 10 // Tolérance de 10%

    const { data, error } = await this.supabase
      .from('success_rate_predictions')
      .update({
        actual_success_rate: actualSuccessRate,
        actual_grade: actualGrade,
        was_accurate: wasAccurate,
        validated_at: new Date().toISOString(),
      })
      .eq('id', predictionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== DROPOUT PREDICTIONS ==========

  async getDropoutPredictions(
    organizationId: string,
    filters?: {
      studentId?: string
      sessionId?: string
      formationId?: string
      riskCategory?: string
      minConfidence?: number
    }
  ) {
    let query = this.supabase
      .from('dropout_predictions')
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*),
        model:predictive_models(*)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.formationId) {
      query = query.eq('formation_id', filters.formationId)
    }

    if (filters?.riskCategory) {
      query = query.eq('risk_category', filters.riskCategory)
    }

    if (filters?.minConfidence) {
      query = query.gte('confidence_level', filters.minConfidence)
    }

    const { data, error } = await query
      .order('prediction_date', { ascending: false })

    if (error) throw error
    return data
  }

  async createDropoutPrediction(prediction: TableInsert<'dropout_predictions'>) {
    const riskCategory = this.calculateRiskCategory(prediction.dropout_probability || 0)

    const { data, error } = await this.supabase
      .from('dropout_predictions')
      .insert({
        ...prediction,
        risk_category: riskCategory,
      })
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*),
        formation:formations(*)
      `)
      .single()

    if (error) throw error

    // Créer une alerte si le risque est élevé
    if (riskCategory === 'high' || riskCategory === 'critical') {
      await this.createAlert({
        organization_id: prediction.organization_id,
        alert_type: 'high_dropout_risk',
        student_id: prediction.student_id,
        session_id: prediction.session_id || undefined,
        dropout_prediction_id: data.id,
        severity: riskCategory === 'critical' ? 'critical' : 'high',
        message: `Risque d'abandon élevé (${prediction.dropout_probability}%) pour cet étudiant`,
        recommended_actions: {
          actions: [
            'Contacter l\'étudiant immédiatement',
            'Identifier les raisons potentielles d\'abandon',
            'Proposer des solutions adaptées',
            'Mettre en place un suivi renforcé',
          ],
        },
      })
    }

    return data
  }

  async validateDropoutPrediction(
    predictionId: string,
    didDropout: boolean,
    actualDropoutDate?: string
  ) {
    const { data: prediction } = await this.supabase
      .from('dropout_predictions')
      .select('dropout_probability')
      .eq('id', predictionId)
      .single()

    if (!prediction) throw new Error('Prédiction non trouvée')

    // La prédiction est considérée comme précise si :
    // - Risque élevé (>60%) et abandon réel
    // - Risque faible (<40%) et pas d'abandon
    const wasAccurate =
      (prediction.dropout_probability || 0) >= 60 && didDropout
        ? true
        : (prediction.dropout_probability || 0) < 40 && !didDropout
        ? true
        : false

    const { data, error } = await this.supabase
      .from('dropout_predictions')
      .update({
        did_dropout: didDropout,
        actual_dropout_date: actualDropoutDate,
        was_accurate: wasAccurate,
        validated_at: new Date().toISOString(),
      })
      .eq('id', predictionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== STUDENT FEATURES ==========

  async getStudentFeatures(
    studentId: string,
    sessionId?: string,
    formationId?: string
  ) {
    let query = this.supabase
      .from('student_features')
      .select('*, feature:prediction_features(*)')
      .eq('student_id', studentId)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (formationId) {
      query = query.eq('formation_id', formationId)
    }

    const { data, error } = await query
      .order('calculated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async updateStudentFeature(feature: TableInsert<'student_features'>) {
    const { data, error } = await this.supabase
      .from('student_features')
      .upsert(feature, {
        onConflict: 'student_id,feature_id,session_id,formation_id',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ALERTS ==========

  async getAlerts(
    organizationId: string,
    filters?: {
      studentId?: string
      status?: string
      severity?: string
      alertType?: string
    }
  ) {
    let query = this.supabase
      .from('prediction_alerts')
      .select(`
        *,
        student:users(id, full_name, email),
        session:sessions(*)
      `)
      .eq('organization_id', organizationId)

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.eq('status', 'active')
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters?.alertType) {
      query = query.eq('alert_type', filters.alertType)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createAlert(alert: TableInsert<'prediction_alerts'>) {
    const { data, error } = await this.supabase
      .from('prediction_alerts')
      .insert(alert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async acknowledgeAlert(alertId: string) {
    const { data, error } = await this.supabase
      .from('prediction_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async resolveAlert(alertId: string) {
    const { data, error } = await this.supabase
      .from('prediction_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ANALYTICS & REPORTS ==========

  async generateSuccessRateReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: Record<string, unknown>
  ) {
    // Récupérer les prédictions validées dans la période
    const { data: predictions } = await this.supabase
      .from('success_rate_predictions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('prediction_date', startDate.toISOString())
      .lte('prediction_date', endDate.toISOString())
      .not('validated_at', 'is', null)

    if (!predictions) return null

    const stats = {
      total_predictions: predictions.length,
      accurate_predictions: predictions.filter((p) => p.was_accurate).length,
      accuracy_rate: 0,
      average_predicted_rate: 0,
      average_actual_rate: 0,
      by_risk_category: {} as Record<string, number>,
    }

    if (predictions.length > 0) {
      stats.accuracy_rate =
        (stats.accurate_predictions / predictions.length) * 100
      stats.average_predicted_rate =
        predictions.reduce((sum, p) => sum + (p.predicted_success_rate || 0), 0) /
        predictions.length
      stats.average_actual_rate =
        predictions.reduce((sum, p) => sum + (p.actual_success_rate || 0), 0) /
        predictions.length

      predictions.forEach((p) => {
        const category = p.risk_category || 'unknown'
        stats.by_risk_category[category] = (stats.by_risk_category[category] || 0) + 1
      })
    }

    return stats
  }

  async generateDropoutReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: Record<string, unknown>
  ) {
    const { data: predictions } = await this.supabase
      .from('dropout_predictions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('prediction_date', startDate.toISOString())
      .lte('prediction_date', endDate.toISOString())
      .not('validated_at', 'is', null)

    if (!predictions) return null

    const stats = {
      total_predictions: predictions.length,
      accurate_predictions: predictions.filter((p) => p.was_accurate).length,
      accuracy_rate: 0,
      actual_dropouts: predictions.filter((p) => p.did_dropout).length,
      dropout_rate: 0,
      average_predicted_probability: 0,
      by_risk_category: {} as Record<string, number>,
    }

    if (predictions.length > 0) {
      stats.accuracy_rate =
        (stats.accurate_predictions / predictions.length) * 100
      stats.dropout_rate = (stats.actual_dropouts / predictions.length) * 100
      stats.average_predicted_probability =
        predictions.reduce((sum, p) => sum + (p.dropout_probability || 0), 0) /
        predictions.length

      predictions.forEach((p) => {
        const category = p.risk_category || 'unknown'
        stats.by_risk_category[category] = (stats.by_risk_category[category] || 0) + 1
      })
    }

    return stats
  }

  // ========== HELPER FUNCTIONS ==========

  private calculateRiskCategory(score: number): string {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService()


