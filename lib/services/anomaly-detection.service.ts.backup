import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type Anomaly = TableRow<'anomalies'>
type AnomalyType = TableRow<'anomaly_types'>
type AnomalyDetectionRule = TableRow<'anomaly_detection_rules'>

export class AnomalyDetectionService {
  private supabase = createClient()

  // ========== ANOMALY TYPES ==========

  async getAnomalyTypes() {
    const { data, error } = await this.supabase
      .from('anomaly_types')
      .select('*')
      .eq('is_active', true)
      .order('severity', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== ANOMALIES ==========

  async getAnomalies(
    organizationId: string,
    filters?: {
      anomalyTypeId?: string
      entityType?: string
      entityId?: string
      status?: string
      severity?: string
      minScore?: number
      assignedTo?: string
    }
  ) {
    let query = this.supabase
      .from('anomalies')
      .select(`
        *,
        anomaly_type:anomaly_types(*),
        assigned_user:users(id, full_name, email)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.anomalyTypeId) {
      query = query.eq('anomaly_type_id', filters.anomalyTypeId)
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }

    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.neq('status', 'resolved')
    }

    if (filters?.severity) {
      query = query.eq('anomaly_type.severity', filters.severity)
    }

    if (filters?.minScore) {
      query = query.gte('anomaly_score', filters.minScore)
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }

    const { data, error } = await query
      .order('detected_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  async createAnomaly(anomaly: TableInsert<'anomalies'>) {
    const { data, error } = await this.supabase
      .from('anomalies')
      .insert(anomaly)
      .select(`
        *,
        anomaly_type:anomaly_types(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async updateAnomalyStatus(
    anomalyId: string,
    status: string,
    userId?: string,
    notes?: string
  ) {
    const updates: Record<string, string | number | undefined> = { status }

    if (status === 'investigating') {
      updates.investigated_at = new Date().toISOString()
      if (userId) {
        updates.assigned_to = userId
      }
    } else if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('anomalies')
      .update(updates)
      .eq('id', anomalyId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    if (userId) {
      await this.recordAction(anomalyId, userId, status, { notes })
    }

    return data
  }

  async assignAnomaly(anomalyId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('anomalies')
      .update({
        assigned_to: userId,
        status: 'investigating',
        investigated_at: new Date().toISOString(),
      })
      .eq('id', anomalyId)
      .select()
      .single()

    if (error) throw error

    await this.recordAction(anomalyId, userId, 'assign', {})

    return data
  }

  async markAsFalsePositive(anomalyId: string, userId: string, notes?: string) {
    return this.updateAnomalyStatus(anomalyId, 'false_positive', userId, notes)
  }

  async resolveAnomaly(anomalyId: string, userId: string, notes?: string) {
    return this.updateAnomalyStatus(anomalyId, 'resolved', userId, notes)
  }

  // ========== ACTIONS ==========

  async recordAction(
    anomalyId: string,
    userId: string,
    actionType: string,
    actionDetails: Record<string, unknown>
  ) {
    const { data, error } = await this.supabase
      .from('anomaly_actions')
      .insert({
        anomaly_id: anomalyId,
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails,
        notes: actionDetails.notes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAnomalyActions(anomalyId: string) {
    const { data, error } = await this.supabase
      .from('anomaly_actions')
      .select('*, user:users(id, full_name, email)')
      .eq('anomaly_id', anomalyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== DETECTION RULES ==========

  async getDetectionRules(organizationId: string, anomalyTypeId?: string) {
    let query = this.supabase
      .from('anomaly_detection_rules')
      .select('*, anomaly_type:anomaly_types(*)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (anomalyTypeId) {
      query = query.eq('anomaly_type_id', anomalyTypeId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createDetectionRule(rule: TableInsert<'anomaly_detection_rules'>) {
    const { data, error } = await this.supabase
      .from('anomaly_detection_rules')
      .insert(rule)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateDetectionRule(
    ruleId: string,
    updates: TableUpdate<'anomaly_detection_rules'>
  ) {
    const { data, error } = await this.supabase
      .from('anomaly_detection_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== NORMAL PATTERNS ==========

  async getNormalPatterns(organizationId: string, patternType?: string) {
    let query = this.supabase
      .from('normal_patterns')
      .select('*')
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (patternType) {
      query = query.eq('pattern_type', patternType)
    }

    const { data, error } = await query
      .order('calculated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createNormalPattern(pattern: TableInsert<'normal_patterns'>) {
    const { data, error } = await this.supabase
      .from('normal_patterns')
      .insert(pattern)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ALERTS ==========

  async getAnomalyAlerts(userId: string, unreadOnly: boolean = false) {
    let query = this.supabase
      .from('anomaly_alerts')
      .select(`
        *,
        anomaly:anomalies(*, anomaly_type:anomaly_types(*))
      `)
      .eq('user_id', userId)

    if (unreadOnly) {
      query = query.eq('is_sent', false)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  }

  async markAlertAsSent(alertId: string) {
    const { data, error } = await this.supabase
      .from('anomaly_alerts')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ANALYTICS ==========

  async getAnomalyStats(organizationId: string, startDate?: Date, endDate?: Date) {
    let query = this.supabase
      .from('anomalies')
      .select('status, anomaly_type:anomaly_types(category, severity)')
      .eq('organization_id', organizationId)

    if (startDate) {
      query = query.gte('detected_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('detected_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      by_status: {
        detected: 0,
        investigating: 0,
        confirmed: 0,
        false_positive: 0,
        resolved: 0,
      },
      by_category: {} as Record<string, number>,
      by_severity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
    }

      data?.forEach((anomaly: Anomaly) => {
      if (anomaly.status) {
        stats.by_status[anomaly.status as keyof typeof stats.by_status]++
      }
      const category = anomaly.anomaly_type?.category
      if (category) {
        stats.by_category[category] = (stats.by_category[category] || 0) + 1
      }
      const severity = anomaly.anomaly_type?.severity
      if (severity) {
        stats.by_severity[severity as keyof typeof stats.by_severity]++
      }
    })

    return stats
  }

  // ========== DETECTION METHODS ==========

  /**
   * Détecte les anomalies basées sur des règles statistiques
   */
  async detectStatisticalAnomalies(
    organizationId: string,
    entityType: string,
    metric: string,
    threshold: number
  ) {
    // Cette fonction serait implémentée avec la logique de détection statistique
    // Pour l'instant, c'est une structure de base
    return []
  }

  /**
   * Détecte les anomalies basées sur des seuils
   */
  async detectThresholdAnomalies(
    organizationId: string,
    entityType: string,
    metric: string,
    threshold: number
  ) {
    // Détection basée sur des seuils
    return []
  }

  /**
   * Détecte les anomalies en utilisant un modèle ML
   */
  async detectMLAnomalies(
    organizationId: string,
    modelId: string,
    inputData: Record<string, unknown>
  ) {
    // Détection basée sur un modèle ML
    return []
  }
}

export const anomalyDetectionService = new AnomalyDetectionService()


import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type Anomaly = TableRow<'anomalies'>
type AnomalyType = TableRow<'anomaly_types'>
type AnomalyDetectionRule = TableRow<'anomaly_detection_rules'>

export class AnomalyDetectionService {
  private supabase = createClient()

  // ========== ANOMALY TYPES ==========

  async getAnomalyTypes() {
    const { data, error } = await this.supabase
      .from('anomaly_types')
      .select('*')
      .eq('is_active', true)
      .order('severity', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== ANOMALIES ==========

  async getAnomalies(
    organizationId: string,
    filters?: {
      anomalyTypeId?: string
      entityType?: string
      entityId?: string
      status?: string
      severity?: string
      minScore?: number
      assignedTo?: string
    }
  ) {
    let query = this.supabase
      .from('anomalies')
      .select(`
        *,
        anomaly_type:anomaly_types(*),
        assigned_user:users(id, full_name, email)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.anomalyTypeId) {
      query = query.eq('anomaly_type_id', filters.anomalyTypeId)
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }

    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.neq('status', 'resolved')
    }

    if (filters?.severity) {
      query = query.eq('anomaly_type.severity', filters.severity)
    }

    if (filters?.minScore) {
      query = query.gte('anomaly_score', filters.minScore)
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }

    const { data, error } = await query
      .order('detected_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  async createAnomaly(anomaly: TableInsert<'anomalies'>) {
    const { data, error } = await this.supabase
      .from('anomalies')
      .insert(anomaly)
      .select(`
        *,
        anomaly_type:anomaly_types(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async updateAnomalyStatus(
    anomalyId: string,
    status: string,
    userId?: string,
    notes?: string
  ) {
    const updates: Record<string, string | number | undefined> = { status }

    if (status === 'investigating') {
      updates.investigated_at = new Date().toISOString()
      if (userId) {
        updates.assigned_to = userId
      }
    } else if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('anomalies')
      .update(updates)
      .eq('id', anomalyId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    if (userId) {
      await this.recordAction(anomalyId, userId, status, { notes })
    }

    return data
  }

  async assignAnomaly(anomalyId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('anomalies')
      .update({
        assigned_to: userId,
        status: 'investigating',
        investigated_at: new Date().toISOString(),
      })
      .eq('id', anomalyId)
      .select()
      .single()

    if (error) throw error

    await this.recordAction(anomalyId, userId, 'assign', {})

    return data
  }

  async markAsFalsePositive(anomalyId: string, userId: string, notes?: string) {
    return this.updateAnomalyStatus(anomalyId, 'false_positive', userId, notes)
  }

  async resolveAnomaly(anomalyId: string, userId: string, notes?: string) {
    return this.updateAnomalyStatus(anomalyId, 'resolved', userId, notes)
  }

  // ========== ACTIONS ==========

  async recordAction(
    anomalyId: string,
    userId: string,
    actionType: string,
    actionDetails: Record<string, unknown>
  ) {
    const { data, error } = await this.supabase
      .from('anomaly_actions')
      .insert({
        anomaly_id: anomalyId,
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails,
        notes: actionDetails.notes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAnomalyActions(anomalyId: string) {
    const { data, error } = await this.supabase
      .from('anomaly_actions')
      .select('*, user:users(id, full_name, email)')
      .eq('anomaly_id', anomalyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== DETECTION RULES ==========

  async getDetectionRules(organizationId: string, anomalyTypeId?: string) {
    let query = this.supabase
      .from('anomaly_detection_rules')
      .select('*, anomaly_type:anomaly_types(*)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (anomalyTypeId) {
      query = query.eq('anomaly_type_id', anomalyTypeId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createDetectionRule(rule: TableInsert<'anomaly_detection_rules'>) {
    const { data, error } = await this.supabase
      .from('anomaly_detection_rules')
      .insert(rule)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateDetectionRule(
    ruleId: string,
    updates: TableUpdate<'anomaly_detection_rules'>
  ) {
    const { data, error } = await this.supabase
      .from('anomaly_detection_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== NORMAL PATTERNS ==========

  async getNormalPatterns(organizationId: string, patternType?: string) {
    let query = this.supabase
      .from('normal_patterns')
      .select('*')
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (patternType) {
      query = query.eq('pattern_type', patternType)
    }

    const { data, error } = await query
      .order('calculated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createNormalPattern(pattern: TableInsert<'normal_patterns'>) {
    const { data, error } = await this.supabase
      .from('normal_patterns')
      .insert(pattern)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ALERTS ==========

  async getAnomalyAlerts(userId: string, unreadOnly: boolean = false) {
    let query = this.supabase
      .from('anomaly_alerts')
      .select(`
        *,
        anomaly:anomalies(*, anomaly_type:anomaly_types(*))
      `)
      .eq('user_id', userId)

    if (unreadOnly) {
      query = query.eq('is_sent', false)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  }

  async markAlertAsSent(alertId: string) {
    const { data, error } = await this.supabase
      .from('anomaly_alerts')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ANALYTICS ==========

  async getAnomalyStats(organizationId: string, startDate?: Date, endDate?: Date) {
    let query = this.supabase
      .from('anomalies')
      .select('status, anomaly_type:anomaly_types(category, severity)')
      .eq('organization_id', organizationId)

    if (startDate) {
      query = query.gte('detected_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('detected_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      by_status: {
        detected: 0,
        investigating: 0,
        confirmed: 0,
        false_positive: 0,
        resolved: 0,
      },
      by_category: {} as Record<string, number>,
      by_severity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
    }

      data?.forEach((anomaly: Anomaly) => {
      if (anomaly.status) {
        stats.by_status[anomaly.status as keyof typeof stats.by_status]++
      }
      const category = anomaly.anomaly_type?.category
      if (category) {
        stats.by_category[category] = (stats.by_category[category] || 0) + 1
      }
      const severity = anomaly.anomaly_type?.severity
      if (severity) {
        stats.by_severity[severity as keyof typeof stats.by_severity]++
      }
    })

    return stats
  }

  // ========== DETECTION METHODS ==========

  /**
   * Détecte les anomalies basées sur des règles statistiques
   */
  async detectStatisticalAnomalies(
    organizationId: string,
    entityType: string,
    metric: string,
    threshold: number
  ) {
    // Cette fonction serait implémentée avec la logique de détection statistique
    // Pour l'instant, c'est une structure de base
    return []
  }

  /**
   * Détecte les anomalies basées sur des seuils
   */
  async detectThresholdAnomalies(
    organizationId: string,
    entityType: string,
    metric: string,
    threshold: number
  ) {
    // Détection basée sur des seuils
    return []
  }

  /**
   * Détecte les anomalies en utilisant un modèle ML
   */
  async detectMLAnomalies(
    organizationId: string,
    modelId: string,
    inputData: Record<string, unknown>
  ) {
    // Détection basée sur un modèle ML
    return []
  }
}

export const anomalyDetectionService = new AnomalyDetectionService()


import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type Anomaly = TableRow<'anomalies'>
type AnomalyType = TableRow<'anomaly_types'>
type AnomalyDetectionRule = TableRow<'anomaly_detection_rules'>

export class AnomalyDetectionService {
  private supabase = createClient()

  // ========== ANOMALY TYPES ==========

  async getAnomalyTypes() {
    const { data, error } = await this.supabase
      .from('anomaly_types')
      .select('*')
      .eq('is_active', true)
      .order('severity', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== ANOMALIES ==========

  async getAnomalies(
    organizationId: string,
    filters?: {
      anomalyTypeId?: string
      entityType?: string
      entityId?: string
      status?: string
      severity?: string
      minScore?: number
      assignedTo?: string
    }
  ) {
    let query = this.supabase
      .from('anomalies')
      .select(`
        *,
        anomaly_type:anomaly_types(*),
        assigned_user:users(id, full_name, email)
      `)
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (filters?.anomalyTypeId) {
      query = query.eq('anomaly_type_id', filters.anomalyTypeId)
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }

    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    } else {
      query = query.neq('status', 'resolved')
    }

    if (filters?.severity) {
      query = query.eq('anomaly_type.severity', filters.severity)
    }

    if (filters?.minScore) {
      query = query.gte('anomaly_score', filters.minScore)
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }

    const { data, error } = await query
      .order('detected_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  async createAnomaly(anomaly: TableInsert<'anomalies'>) {
    const { data, error } = await this.supabase
      .from('anomalies')
      .insert(anomaly)
      .select(`
        *,
        anomaly_type:anomaly_types(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async updateAnomalyStatus(
    anomalyId: string,
    status: string,
    userId?: string,
    notes?: string
  ) {
    const updates: Record<string, string | number | undefined> = { status }

    if (status === 'investigating') {
      updates.investigated_at = new Date().toISOString()
      if (userId) {
        updates.assigned_to = userId
      }
    } else if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('anomalies')
      .update(updates)
      .eq('id', anomalyId)
      .select()
      .single()

    if (error) throw error

    // Enregistrer l'action
    if (userId) {
      await this.recordAction(anomalyId, userId, status, { notes })
    }

    return data
  }

  async assignAnomaly(anomalyId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('anomalies')
      .update({
        assigned_to: userId,
        status: 'investigating',
        investigated_at: new Date().toISOString(),
      })
      .eq('id', anomalyId)
      .select()
      .single()

    if (error) throw error

    await this.recordAction(anomalyId, userId, 'assign', {})

    return data
  }

  async markAsFalsePositive(anomalyId: string, userId: string, notes?: string) {
    return this.updateAnomalyStatus(anomalyId, 'false_positive', userId, notes)
  }

  async resolveAnomaly(anomalyId: string, userId: string, notes?: string) {
    return this.updateAnomalyStatus(anomalyId, 'resolved', userId, notes)
  }

  // ========== ACTIONS ==========

  async recordAction(
    anomalyId: string,
    userId: string,
    actionType: string,
    actionDetails: Record<string, unknown>
  ) {
    const { data, error } = await this.supabase
      .from('anomaly_actions')
      .insert({
        anomaly_id: anomalyId,
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails,
        notes: actionDetails.notes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAnomalyActions(anomalyId: string) {
    const { data, error } = await this.supabase
      .from('anomaly_actions')
      .select('*, user:users(id, full_name, email)')
      .eq('anomaly_id', anomalyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== DETECTION RULES ==========

  async getDetectionRules(organizationId: string, anomalyTypeId?: string) {
    let query = this.supabase
      .from('anomaly_detection_rules')
      .select('*, anomaly_type:anomaly_types(*)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (anomalyTypeId) {
      query = query.eq('anomaly_type_id', anomalyTypeId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createDetectionRule(rule: TableInsert<'anomaly_detection_rules'>) {
    const { data, error } = await this.supabase
      .from('anomaly_detection_rules')
      .insert(rule)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateDetectionRule(
    ruleId: string,
    updates: TableUpdate<'anomaly_detection_rules'>
  ) {
    const { data, error } = await this.supabase
      .from('anomaly_detection_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== NORMAL PATTERNS ==========

  async getNormalPatterns(organizationId: string, patternType?: string) {
    let query = this.supabase
      .from('normal_patterns')
      .select('*')
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (patternType) {
      query = query.eq('pattern_type', patternType)
    }

    const { data, error } = await query
      .order('calculated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createNormalPattern(pattern: TableInsert<'normal_patterns'>) {
    const { data, error } = await this.supabase
      .from('normal_patterns')
      .insert(pattern)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ALERTS ==========

  async getAnomalyAlerts(userId: string, unreadOnly: boolean = false) {
    let query = this.supabase
      .from('anomaly_alerts')
      .select(`
        *,
        anomaly:anomalies(*, anomaly_type:anomaly_types(*))
      `)
      .eq('user_id', userId)

    if (unreadOnly) {
      query = query.eq('is_sent', false)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  }

  async markAlertAsSent(alertId: string) {
    const { data, error } = await this.supabase
      .from('anomaly_alerts')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ANALYTICS ==========

  async getAnomalyStats(organizationId: string, startDate?: Date, endDate?: Date) {
    let query = this.supabase
      .from('anomalies')
      .select('status, anomaly_type:anomaly_types(category, severity)')
      .eq('organization_id', organizationId)

    if (startDate) {
      query = query.gte('detected_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('detected_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      by_status: {
        detected: 0,
        investigating: 0,
        confirmed: 0,
        false_positive: 0,
        resolved: 0,
      },
      by_category: {} as Record<string, number>,
      by_severity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
    }

      data?.forEach((anomaly: Anomaly) => {
      if (anomaly.status) {
        stats.by_status[anomaly.status as keyof typeof stats.by_status]++
      }
      const category = anomaly.anomaly_type?.category
      if (category) {
        stats.by_category[category] = (stats.by_category[category] || 0) + 1
      }
      const severity = anomaly.anomaly_type?.severity
      if (severity) {
        stats.by_severity[severity as keyof typeof stats.by_severity]++
      }
    })

    return stats
  }

  // ========== DETECTION METHODS ==========

  /**
   * Détecte les anomalies basées sur des règles statistiques
   */
  async detectStatisticalAnomalies(
    organizationId: string,
    entityType: string,
    metric: string,
    threshold: number
  ) {
    // Cette fonction serait implémentée avec la logique de détection statistique
    // Pour l'instant, c'est une structure de base
    return []
  }

  /**
   * Détecte les anomalies basées sur des seuils
   */
  async detectThresholdAnomalies(
    organizationId: string,
    entityType: string,
    metric: string,
    threshold: number
  ) {
    // Détection basée sur des seuils
    return []
  }

  /**
   * Détecte les anomalies en utilisant un modèle ML
   */
  async detectMLAnomalies(
    organizationId: string,
    modelId: string,
    inputData: Record<string, unknown>
  ) {
    // Détection basée sur un modèle ML
    return []
  }
}

export const anomalyDetectionService = new AnomalyDetectionService()


