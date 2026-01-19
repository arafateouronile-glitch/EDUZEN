import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type SecurityPolicy = TableRow<'security_policies'>
type SecurityControl = TableRow<'security_controls'>
type ComplianceEvidence = TableRow<'compliance_evidence'>
type RiskAssessment = TableRow<'risk_assessments'>
type SecurityIncident = TableRow<'security_incidents'>
type SecurityAudit = TableRow<'security_audits'>
type AuditFinding = TableRow<'audit_findings'>
type SecurityTraining = TableRow<'security_training'>
type SecurityTrainingRecord = TableRow<'security_training_records'>
type AccessLog = TableRow<'access_logs'>

export class ComplianceService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // ========== SECURITY POLICIES ==========

  async getPolicies(organizationId: string, filters?: { status?: string; category?: string }) {
    let query = this.supabase
      .from('security_policies')
      .select('*, approved_by_user:users!security_policies_approved_by_fkey(id, full_name, email)')
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createPolicy(policy: TableInsert<'security_policies'>) {
    const { data, error } = await this.supabase
      .from('security_policies')
      .insert(policy)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updatePolicy(policyId: string, updates: TableUpdate<'security_policies'>) {
    const { data, error } = await this.supabase
      .from('security_policies')
      .update(updates)
      .eq('id', policyId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async approvePolicy(policyId: string, userId: string) {
    return this.updatePolicy(policyId, {
      approval_status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      status: 'active',
    })
  }

  // ========== SECURITY CONTROLS ==========

  async getControls(organizationId: string, filters?: { framework?: string; status?: string }) {
    let query = this.supabase
      .from('security_controls')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.framework) {
      query = query.eq('framework', filters.framework)
    }

    if (filters?.status) {
      query = query.eq('implementation_status', filters.status)
    }

    const { data, error } = await query.order('control_id', { ascending: true })

    if (error) throw error
    return data
  }

  async createControl(control: TableInsert<'security_controls'>) {
    const { data, error } = await this.supabase
      .from('security_controls')
      .insert(control)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateControl(controlId: string, updates: TableUpdate<'security_controls'>) {
    const { data, error } = await this.supabase
      .from('security_controls')
      .update(updates)
      .eq('id', controlId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getControlComplianceStats(organizationId: string, framework?: string) {
    const controls = await this.getControls(organizationId, { framework })

    const stats = {
      total: controls.length,
      implemented: controls.filter((c) => c.implementation_status === 'implemented').length,
      partial: controls.filter((c) => c.implementation_status === 'partial').length,
      not_implemented: controls.filter((c) => c.implementation_status === 'not_implemented').length,
      compliant: controls.filter((c) => c.compliance_status === 'compliant').length,
      partially_compliant: controls.filter((c) => c.compliance_status === 'partially_compliant').length,
      non_compliant: controls.filter((c) => c.compliance_status === 'non_compliant').length,
      compliance_percentage: 0,
    }

    if (stats.total > 0) {
      stats.compliance_percentage = (stats.compliant / stats.total) * 100
    }

    return stats
  }

  // ========== COMPLIANCE EVIDENCE ==========

  async getEvidence(controlId: string) {
    const { data, error } = await this.supabase
      .from('compliance_evidence')
      .select('*, collected_by_user:users!compliance_evidence_collected_by_fkey(id, full_name, email), verified_by_user:users!compliance_evidence_verified_by_fkey(id, full_name, email)')
      .eq('control_id', controlId)
      .order('collected_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createEvidence(evidence: TableInsert<'compliance_evidence'>) {
    const { data, error } = await this.supabase
      .from('compliance_evidence')
      .insert(evidence)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async verifyEvidence(evidenceId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('compliance_evidence')
      .update({
        verified_by: userId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', evidenceId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== RISK ASSESSMENTS ==========

  async getRisks(organizationId: string, filters?: { treatmentStatus?: string; riskLevel?: string }) {
    let query = this.supabase
      .from('risk_assessments')
      .select('*, owner:users(id, full_name, email)')
      .eq('organization_id', organizationId)

    if (filters?.treatmentStatus) {
      query = query.eq('treatment_status', filters.treatmentStatus)
    }

    if (filters?.riskLevel) {
      query = query.eq('risk_level', filters.riskLevel)
    }

    const { data, error } = await query.order('risk_level', { ascending: false })

    // Si la table n'existe pas ou erreur de syntaxe, retourner un tableau vide
    if (error) {
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (errorObj.code === 'PGRST200' || errorObj.status === 404 || errorObj.status === 400 || errorObj.message?.includes('does not exist')) {
        return []
      }
      throw error
    }
    return data || []
  }

  async createRisk(risk: TableInsert<'risk_assessments'>) {
    const { data, error } = await this.supabase
      .from('risk_assessments')
      .insert(risk)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateRisk(riskId: string, updates: TableUpdate<'risk_assessments'>) {
    const { data, error } = await this.supabase
      .from('risk_assessments')
      .update(updates)
      .eq('id', riskId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getCriticalRisks(organizationId: string) {
    return this.getRisks(organizationId, { riskLevel: 'critical', treatmentStatus: 'open' })
  }

  // ========== SECURITY INCIDENTS ==========

  async getIncidents(organizationId: string, filters?: { status?: string; severity?: string }) {
    let query = this.supabase
      .from('security_incidents')
      .select('*, reported_by_user:users(id, full_name, email), assigned_to_user:users(id, full_name, email)')
      .eq('organization_id', organizationId)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    // Si la table n'existe pas ou erreur de syntaxe, retourner un tableau vide
    if (error) {
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (errorObj.code === 'PGRST200' || errorObj.status === 404 || errorObj.status === 400 || errorObj.message?.includes('does not exist')) {
        return []
      }
      throw error
    }
    return data || []
  }

  async createIncident(incident: TableInsert<'security_incidents'>) {
    // Générer un numéro d'incident unique
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const { data, error } = await this.supabase
      .from('security_incidents')
      .insert({
        ...incident,
        incident_id: incidentId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateIncident(incidentId: string, updates: TableUpdate<'security_incidents'>) {
    const { data, error } = await this.supabase
      .from('security_incidents')
      .update(updates)
      .eq('id', incidentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async resolveIncident(incidentId: string, resolution: string, rootCause?: string) {
    return this.updateIncident(incidentId, {
      status: 'resolved',
      resolution,
      root_cause: rootCause,
      resolved_at: new Date().toISOString(),
    })
  }

  // ========== SECURITY AUDITS ==========

  async getAudits(organizationId: string, filters?: { status?: string; framework?: string }) {
    let query = this.supabase
      .from('security_audits')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.framework) {
      query = query.eq('framework', filters.framework)
    }

    const { data, error } = await query.order('start_date', { ascending: false })

    if (error) throw error
    return data
  }

  async createAudit(audit: TableInsert<'security_audits'>) {
    const auditId = `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const { data, error } = await this.supabase
      .from('security_audits')
      .insert({
        ...audit,
        audit_id: auditId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAuditFindings(auditId: string) {
    const { data, error } = await this.supabase
      .from('audit_findings')
      .select('*, assigned_to_user:users!audit_findings_assigned_to_fkey(id, full_name, email), control:security_controls(*)')
      .eq('audit_id', auditId)
      .order('severity', { ascending: false })

    if (error) throw error
    return data
  }

  async createAuditFinding(finding: TableInsert<'audit_findings'>) {
    const { data, error } = await this.supabase
      .from('audit_findings')
      .insert(finding)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== SECURITY TRAINING ==========

  async getTrainings(organizationId: string) {
    const { data, error } = await this.supabase
      .from('security_training')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getTrainingRecords(userId: string) {
    const { data, error } = await this.supabase
      .from('security_training_records')
      .select('*, training:security_training(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createTrainingRecord(record: TableInsert<'security_training_records'>) {
    const { data, error } = await this.supabase
      .from('security_training_records')
      .insert(record)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async completeTraining(recordId: string, score?: number) {
    const { data, error } = await this.supabase
      .from('security_training_records')
      .update({
        status: 'completed',
        completion_percentage: 100,
        score,
        completed_at: new Date().toISOString(),
      })
      .eq('id', recordId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== ACCESS LOGS ==========

  async logAccess(log: TableInsert<'access_logs'>) {
    const { data, error } = await this.supabase
      .from('access_logs')
      .insert(log)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAccessLogs(organizationId: string, filters?: { userId?: string; action?: string; startDate?: Date; endDate?: Date }) {
    let query = this.supabase
      .from('access_logs')
      .select('*, user:users(id, full_name, email)')
      .eq('organization_id', organizationId)

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString())
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000)

    if (error) throw error
    return data
  }

  // ========== COMPLIANCE REPORTS ==========

  async generateComplianceReport(organizationId: string, framework?: string) {
    const controls = await this.getControls(organizationId, { framework })
    const risks = await this.getRisks(organizationId)
    const incidents = await this.getIncidents(organizationId)
    const audits = await this.getAudits(organizationId, { framework })

    const stats = await this.getControlComplianceStats(organizationId, framework)

    const criticalRisks = risks.filter((r) => r.risk_level === 'critical' && r.treatment_status === 'open')
    const openIncidents = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed')
    const recentAudits = audits.filter((a) => {
      const auditDate = new Date(a.start_date)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      return auditDate >= sixMonthsAgo
    })

    return {
      framework: framework || 'all',
      generated_at: new Date().toISOString(),
      controls: {
        total: stats.total,
        compliance_percentage: stats.compliance_percentage,
        implemented: stats.implemented,
        partial: stats.partial,
        not_implemented: stats.not_implemented,
        compliant: stats.compliant,
        partially_compliant: stats.partially_compliant,
        non_compliant: stats.non_compliant,
      },
      risks: {
        total: risks.length,
        critical: criticalRisks.length,
        high: risks.filter((r) => r.risk_level === 'high' && r.treatment_status === 'open').length,
        medium: risks.filter((r) => r.risk_level === 'medium' && r.treatment_status === 'open').length,
        low: risks.filter((r) => r.risk_level === 'low' && r.treatment_status === 'open').length,
        mitigated: risks.filter((r) => r.treatment_status === 'mitigated').length,
      },
      incidents: {
        total: incidents.length,
        open: openIncidents.length,
        critical: incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length,
        data_breaches: incidents.filter((i) => i.data_breach).length,
      },
      audits: {
        total: audits.length,
        recent: recentAudits.length,
        average_score: audits.length > 0
          ? audits.reduce((sum, a) => sum + (a.overall_score || 0), 0) / audits.length
          : 0,
        average_compliance: audits.length > 0
          ? audits.reduce((sum, a) => sum + (a.compliance_percentage || 0), 0) / audits.length
          : 0,
      },
      recommendations: this.generateRecommendations(stats as any, criticalRisks, openIncidents),
    }
  }

  private generateRecommendations(
    stats: any,
    criticalRisks: RiskAssessment[],
    openIncidents: SecurityIncident[]
  ): string[] {
    const recommendations: string[] = []

    if (stats.compliance_percentage < 80) {
      recommendations.push(
        `Le pourcentage de conformité est de ${stats.compliance_percentage.toFixed(1)}%. Il est recommandé d'améliorer l'implémentation des contrôles.`
      )
    }

    if (criticalRisks.length > 0) {
      recommendations.push(
        `${criticalRisks.length} risque(s) critique(s) ouvert(s) nécessitent une attention immédiate.`
      )
    }

    if (openIncidents.filter((i) => i.severity === 'critical').length > 0) {
      recommendations.push(
        'Des incidents critiques sont en cours. Une intervention immédiate est requise.'
      )
    }

    if (stats.not_implemented > 0) {
      recommendations.push(
        `${stats.not_implemented} contrôle(s) ne sont pas encore implémentés.`
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('Aucune recommandation urgente. La conformité est bonne.')
    }

    return recommendations
  }
}

export const complianceService = new ComplianceService()
