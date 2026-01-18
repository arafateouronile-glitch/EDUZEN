/**
 * Service de gestion des certifications RNCP/RS, jurys, PV et attestations
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'

type RNCPCertification = TableRow<'rncp_certifications'>
type RNCPCertificationInsert = TableInsert<'rncp_certifications'>
type CertificationJury = TableRow<'certification_juries'>
type CertificationJuryInsert = TableInsert<'certification_juries'>
type JuryCandidate = TableRow<'jury_candidates'>
type JuryCandidateInsert = TableInsert<'jury_candidates'>
type JuryMinute = TableRow<'jury_minutes'>
type JuryMinuteInsert = TableInsert<'jury_minutes'>
type CertificationCertificate = TableRow<'certification_certificates'>
type CertificationCertificateInsert = TableInsert<'certification_certificates'>

export class RNCPCertificationService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // ==================== CERTIFICATIONS ====================

  /**
   * Récupère toutes les certifications d'une organisation
   */
  async getCertifications(organizationId: string, filters?: {
    isActive?: boolean
    type?: 'RNCP' | 'RS' | 'other'
    search?: string
  }): Promise<RNCPCertification[]> {
    let query = this.supabase
      .from('rncp_certifications')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    if (filters?.type) {
      query = query.eq('certification_type', filters.type)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,rncp_code.ilike.%${filters.search}%,rs_code.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('title', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Récupère une certification par son ID
   */
  async getCertificationById(id: string): Promise<RNCPCertification> {
    const { data, error } = await this.supabase
      .from('rncp_certifications')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Crée une certification
   */
  async createCertification(certification: FlexibleInsert<'rncp_certifications'>): Promise<RNCPCertification> {
    const { data, error } = await this.supabase
      .from('rncp_certifications')
      .insert(certification as RNCPCertificationInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour une certification
   */
  async updateCertification(id: string, updates: FlexibleUpdate<'rncp_certifications'>): Promise<RNCPCertification> {
    const { data, error } = await this.supabase
      .from('rncp_certifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ==================== JURYS ====================

  /**
   * Récupère tous les jurys d'une organisation
   */
  async getJuries(organizationId: string, filters?: {
    certificationId?: string
    status?: string
    startDate?: string
    endDate?: string
  }): Promise<CertificationJury[]> {
    let query = this.supabase
      .from('certification_juries')
      .select('*, rncp_certifications(*), sites(*)')
      .eq('organization_id', organizationId)

    if (filters?.certificationId) {
      query = query.eq('certification_id', filters.certificationId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.startDate) {
      query = query.gte('jury_date', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('jury_date', filters.endDate)
    }

    const { data, error } = await query.order('jury_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Récupère un jury par son ID
   */
  async getJuryById(id: string): Promise<CertificationJury> {
    const { data, error } = await this.supabase
      .from('certification_juries')
      .select('*, rncp_certifications(*), sites(*), jury_candidates(*, students(*))')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Crée un jury
   */
  async createJury(jury: FlexibleInsert<'certification_juries'>): Promise<CertificationJury> {
    const { data, error } = await this.supabase
      .from('certification_juries')
      .insert(jury as CertificationJuryInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour un jury
   */
  async updateJury(id: string, updates: FlexibleUpdate<'certification_juries'>): Promise<CertificationJury> {
    const { data, error } = await this.supabase
      .from('certification_juries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ==================== CANDIDATS AU JURY ====================

  /**
   * Ajoute un candidat à un jury
   */
  async addCandidate(candidate: FlexibleInsert<'jury_candidates'>): Promise<JuryCandidate> {
    const { data, error } = await this.supabase
      .from('jury_candidates')
      .insert(candidate as JuryCandidateInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour le résultat d'un candidat
   */
  async updateCandidateResult(
    id: string,
    result: {
      status: 'admitted' | 'rejected' | 'deferred'
      finalScore?: number
      decisionNotes?: string
      evaluationDetails?: Record<string, unknown>
    }
  ): Promise<JuryCandidate> {
    const updates: any = {
      status: result.status,
      decision_date: new Date().toISOString().split('T')[0],
    }

    if (result.finalScore !== undefined) {
      updates.final_score = result.finalScore
    }

    if (result.decisionNotes) {
      updates.decision_notes = result.decisionNotes
    }

    if (result.evaluationDetails) {
      updates.evaluation_details = result.evaluationDetails
    }

    const { data, error } = await this.supabase
      .from('jury_candidates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère les candidats d'un jury
   */
  async getJuryCandidates(juryId: string): Promise<JuryCandidate[]> {
    const { data, error } = await this.supabase
      .from('jury_candidates')
      .select('*, students(*)')
      .eq('jury_id', juryId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // ==================== PROCÈS-VERBAUX ====================

  /**
   * Récupère les PV d'un jury
   */
  async getJuryMinutes(juryId: string): Promise<JuryMinute[]> {
    const { data, error } = await this.supabase
      .from('jury_minutes')
      .select('*')
      .eq('jury_id', juryId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Crée un PV de jury
   */
  async createMinute(minute: FlexibleInsert<'jury_minutes'>): Promise<JuryMinute> {
    const { data, error } = await this.supabase
      .from('jury_minutes')
      .insert(minute as JuryMinuteInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour un PV
   */
  async updateMinute(id: string, updates: FlexibleUpdate<'jury_minutes'>): Promise<JuryMinute> {
    const { data, error } = await this.supabase
      .from('jury_minutes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ==================== ATTESTATIONS ====================

  /**
   * Génère un numéro d'attestation unique
   */
  private generateCertificateNumber(certification: RNCPCertification, studentId: string): string {
    const prefix = certification.certification_type === 'RNCP' ? 'RNCP' : 'RS'
    const code = certification.rncp_code || certification.rs_code || 'CERT'
    const date = new Date().getFullYear()
    const studentCode = studentId.slice(0, 8).toUpperCase()
    return `${prefix}-${code}-${date}-${studentCode}-${Date.now().toString(36).toUpperCase()}`
  }

  /**
   * Crée une attestation de certification
   */
  async createCertificate(certificate: FlexibleInsert<'certification_certificates'>): Promise<CertificationCertificate> {
    // Générer le numéro d'attestation si non fourni
    if (!certificate.certificate_number) {
      const certification = await this.getCertificationById(certificate.certification_id!)
      certificate.certificate_number = this.generateCertificateNumber(certification, certificate.student_id!)
    }

    const { data, error } = await this.supabase
      .from('certification_certificates')
      .insert(certificate as CertificationCertificateInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère les attestations d'une organisation
   */
  async getCertificates(organizationId: string, filters?: {
    certificationId?: string
    studentId?: string
    status?: string
  }): Promise<CertificationCertificate[]> {
    let query = this.supabase
      .from('certification_certificates')
      .select('*, rncp_certifications(*), students(*), certification_juries(*)')
      .eq('organization_id', organizationId)

    if (filters?.certificationId) {
      query = query.eq('certification_id', filters.certificationId)
    }

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('issue_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Génère automatiquement des attestations pour les candidats admis d'un jury
   */
  async generateCertificatesForJury(juryId: string, issuedBy: string): Promise<CertificationCertificate[]> {
    const jury = await this.getJuryById(juryId)
    const candidates = await this.getJuryCandidates(juryId)

    const admittedCandidates = candidates.filter((c) => c.status === 'admitted')
    const certificates: CertificationCertificate[] = []

    for (const candidate of admittedCandidates) {
      const certification = await this.getCertificationById(jury.certification_id)

      const certificate = await this.createCertificate({
        organization_id: jury.organization_id,
        certification_id: jury.certification_id,
        jury_id: juryId,
        student_id: candidate.student_id,
        session_id: jury.session_id || null,
        issue_date: new Date().toISOString().split('T')[0],
        certification_level: certification.level || null,
        rncp_code: certification.rncp_code || null,
        status: 'issued',
        issued_by: issuedBy,
      })

      certificates.push(certificate)
    }

    return certificates
  }
}

export const rncpCertificationService = new RNCPCertificationService()



