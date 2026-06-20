/**
 * Service Qualiopi Check - Conformité des dossiers stagiaires par session
 * Calcule le score de santé (0-100%) et les alertes pour l'audit Qualiopi.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

/** Poids des piliers pour le score de conformité (total 100) */
export const COMPLIANCE_WEIGHTS = {
  contract: 30,
  attendance: 50,
  evaluation: 20,
  // certificat optionnel : bonus ou indicateur séparé
} as const

export interface SessionComplianceStudent {
  student_id: string
  student_name: string
  student_email: string | null
  hasSignedContract: boolean
  attendanceSignedSlots: number
  attendanceTotalSlots: number
  /** Évaluation à chaud (assessment_type = 'hot') — indicateur 7 Qualiopi */
  hasEvaluation: boolean
  /** Évaluation à froid (assessment_type = 'cold') — indicateur 14 Qualiopi */
  hasColdEvaluation: boolean
  /** Évaluation de positionnement pré-formation (assessment_type = 'pre_formation') — indicateur 2 Qualiopi */
  hasPreFormationEval: boolean
  hasCertificate?: boolean
  contractDocumentId?: string | null
  pendingSignatureRequestId?: string | null
  missingAttendanceDates?: string[]
}

export interface SessionComplianceResult {
  sessionId: string
  sessionName: string
  formationName?: string
  startDate: string
  endDate: string
  score: number
  totalStudents: number
  students: SessionComplianceStudent[]
  alerts: ComplianceAlert[]
}

export interface ComplianceAlert {
  type: 'contract' | 'attendance' | 'evaluation' | 'cold_evaluation' | 'certificate'
  priority: 'high' | 'medium' | 'low'
  message: string
  count?: number
  studentIds?: string[]
  details?: string
}

export class QualiopiCheckService {
  constructor(private supabase: SupabaseClient<any>) {}

  /**
   * Calcule le score de conformité et les alertes pour une session.
   */
  async getSessionCompliance(
    organizationId: string,
    sessionId: string
  ): Promise<SessionComplianceResult | null> {
    try {
      const [session, enrollments, slots, attendance, grades] = await Promise.all([
        this.supabase
          .from('sessions')
          .select('id, name, start_date, end_date, formation_id, formations(name)')
          .eq('id', sessionId)
          .eq('organization_id', organizationId)
          .single(),
        this.supabase
          .from('enrollments')
          .select('student_id, students(id, first_name, last_name, email)')
          .eq('session_id', sessionId)
          .in('status', ['confirmed', 'active', 'completed']),
        this.supabase
          .from('session_slots')
          .select('id, date, start_time, end_time')
          .eq('session_id', sessionId)
          .order('date', { ascending: true }),
        this.supabase
          .from('attendance')
          .select('student_id, date, session_id')
          .eq('session_id', sessionId)
          .eq('organization_id', organizationId),
        this.supabase
          .from('grades')
          .select('student_id, session_id, assessment_type')
          .eq('session_id', sessionId)
          .eq('organization_id', organizationId),
      ])

      if (session.error || !session.data) {
        logger.warn('QualiopiCheckService: session not found', { sessionId, error: session.error })
        return null
      }

      const sessionRow = session.data
      const enrollmentList = enrollments.data ?? []
      const slotList = (slots.data ?? []) as Array<{ id: string; date: string }>
      const attendanceList = attendance.data ?? []
      const gradesList = grades.data ?? []

      const totalSlots = slotList.length
      const slotDates = [...new Set(slotList.map((s) => s.date))]

      const studentIds = enrollmentList.map((e: any) => e.student_id)
      const documents =
        studentIds.length > 0
          ? await this.supabase
              .from('documents')
              .select('id, student_id, type, metadata')
              .in('student_id', studentIds)
              .in('type', ['convention', 'contrat'])
              .then((r) => r.data ?? [])
          : []

      const docIds = documents.map((d: any) => d.id)
      const signatureRequests =
        docIds.length > 0
          ? await this.supabase
              .from('signature_requests')
              .select('id, document_id, status')
              .in('document_id', docIds)
              .then((r) => r.data ?? [])
          : []

      const signedDocIds = new Set(
        signatureRequests.filter((s: any) => s.status === 'signed').map((s: any) => s.document_id)
      )
      const pendingByDoc = new Map(
        signatureRequests
          .filter((s: any) => s.status === 'pending')
          .map((s: any) => [s.document_id, s.id])
      )

      const students: SessionComplianceStudent[] = enrollmentList.map((e: any) => {
        const sid = e.student_id
        const student = e.students
        const studentName = student
          ? [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Inconnu'
          : 'Inconnu'
        const studentEmail = student?.email ?? null

        const studentDocs = documents.filter((d: any) => d.student_id === sid)
        const signedContract = studentDocs.some((d: any) => signedDocIds.has(d.id))
        const pendingReqId = studentDocs.find((d: any) => pendingByDoc.has(d.id))
          ? pendingByDoc.get(studentDocs.find((d: any) => pendingByDoc.has(d.id))!.id)
          : null
        const contractDocId = studentDocs.find((d: any) => signedDocIds.has(d.id))?.id ?? studentDocs[0]?.id

        const studentAttendance = attendanceList.filter(
          (a: any) => a.student_id === sid
        ) as Array<{ date: string }>
        const attendedDates = new Set(studentAttendance.map((a) => a.date))
        const signedSlots = slotDates.filter((d) => attendedDates.has(d)).length
        const missingDates = slotDates.filter((d) => !attendedDates.has(d))

        const studentGrades = gradesList.filter((g: any) => g.student_id === sid)
        // Indicateur 7 Qualiopi : évaluation à chaud obligatoire à l'issue de la formation
        const hasHotEval = studentGrades.some((g: any) => g.assessment_type === 'hot')
        // Indicateur 14 Qualiopi : évaluation à froid (à distance de la formation)
        const hasColdEval = studentGrades.some((g: any) => g.assessment_type === 'cold')
        // Indicateur 2 Qualiopi : positionnement préalable de l'apprenant avant la formation
        const hasPreFormationEval = studentGrades.some((g: any) => g.assessment_type === 'pre_formation')

        return {
          student_id: sid,
          student_name: studentName,
          student_email: studentEmail,
          hasSignedContract: signedContract,
          attendanceSignedSlots: signedSlots,
          attendanceTotalSlots: totalSlots || 1,
          hasEvaluation: hasHotEval,
          hasColdEvaluation: hasColdEval,
          hasPreFormationEval,
          contractDocumentId: contractDocId,
          pendingSignatureRequestId: pendingReqId ?? null,
          missingAttendanceDates: missingDates.length > 0 ? missingDates : undefined,
        }
      })

      const score = this.computeScore(students, totalSlots)
      const alerts = this.buildAlerts(students, sessionRow.name, totalSlots, sessionRow.end_date)

      return {
        sessionId,
        sessionName: sessionRow.name,
        formationName: (sessionRow.formations as Array<{ name: string }>)?.[0]?.name,
        startDate: sessionRow.start_date,
        endDate: sessionRow.end_date,
        score,
        totalStudents: students.length,
        students,
        alerts,
      }
    } catch (err) {
      logger.error('QualiopiCheckService.getSessionCompliance', err)
      return null
    }
  }

  /**
   * Liste les sessions de l'organisation avec score de conformité (résumé).
   */
  async listSessionsWithCompliance(
    organizationId: string,
    options?: { formationId?: string; limit?: number }
  ): Promise<Array<{ sessionId: string; sessionName: string; formationName?: string; startDate: string; endDate: string; score: number; totalStudents: number; alertCount: number }>> {
    const { data: sessions, error } = await this.supabase
      .from('sessions')
      .select('id, name, start_date, end_date, formation_id, formations(name)')
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: false })
      .limit(options?.limit ?? 50)

    if (error || !sessions?.length) return []

    const formationFilter = options?.formationId
    const list = (formationFilter
      ? sessions.filter((s: { formation_id?: string }) => s.formation_id === formationFilter)
      : sessions) as unknown as Array<{ id: string; name: string; start_date: string; end_date: string; formations?: { name: string } }>

    const results = await Promise.all(
      list.map(async (s) => {
        const full = await this.getSessionCompliance(organizationId, s.id)
        if (!full) return { sessionId: s.id, sessionName: s.name, formationName: s.formations?.name, startDate: s.start_date, endDate: s.end_date, score: 0, totalStudents: 0, alertCount: 0 }
        return {
          sessionId: full.sessionId,
          sessionName: full.sessionName,
          formationName: full.formationName,
          startDate: full.startDate,
          endDate: full.endDate,
          score: full.score,
          totalStudents: full.totalStudents,
          alertCount: full.alerts.length,
        }
      })
    )
    return results
  }

  private computeScore(students: SessionComplianceStudent[], totalSlots: number): number {
    if (students.length === 0) return 100
    const totalContract = students.filter((s) => s.hasSignedContract).length
    const totalAttendance = students.reduce(
      (acc, s) => acc + (totalSlots ? (s.attendanceSignedSlots / totalSlots) * 100 : 0),
      0
    )
    const totalEval = students.filter((s) => s.hasEvaluation).length
    const n = students.length
    const contractScore = (totalContract / n) * COMPLIANCE_WEIGHTS.contract
    const attendanceScore = (totalAttendance / n / 100) * COMPLIANCE_WEIGHTS.attendance
    const evalScore = (totalEval / n) * COMPLIANCE_WEIGHTS.evaluation
    return Math.round(contractScore + attendanceScore + evalScore)
  }

  private buildAlerts(
    students: SessionComplianceStudent[],
    sessionName: string,
    totalSlots: number,
    sessionEndDate?: string
  ): ComplianceAlert[] {
    const alerts: ComplianceAlert[] = []

    const missingContract = students.filter((s) => !s.hasSignedContract)
    if (missingContract.length > 0) {
      alerts.push({
        type: 'contract',
        priority: 'high',
        message: `${missingContract.length} convention(s) non signée(s) pour la session « ${sessionName} ».`,
        count: missingContract.length,
        studentIds: missingContract.map((s) => s.student_id),
      })
    }

    const missingAttendance = students.filter(
      (s) => s.attendanceTotalSlots > 0 && s.attendanceSignedSlots < s.attendanceTotalSlots
    )
    const totalMissing = missingAttendance.reduce(
      (acc, s) => acc + (s.attendanceTotalSlots - s.attendanceSignedSlots),
      0
    )
    if (totalMissing > 0) {
      alerts.push({
        type: 'attendance',
        priority: 'high',
        message: `Il manque ${totalMissing} émargement(s) pour la session « ${sessionName} ».`,
        count: totalMissing,
        studentIds: missingAttendance.map((s) => s.student_id),
      })
    }

    // Indicateur 2 : positionnement préalable obligatoire avant la formation
    const missingPreFormation = students.filter((s) => !s.hasPreFormationEval)
    if (missingPreFormation.length > 0) {
      alerts.push({
        type: 'evaluation',
        priority: 'medium',
        message: `${missingPreFormation.length} évaluation(s) de positionnement pré-formation manquante(s) pour « ${sessionName} » (Qualiopi indicateur 2).`,
        count: missingPreFormation.length,
        studentIds: missingPreFormation.map((s) => s.student_id),
        details: 'Le positionnement préalable permet d\'adapter la formation au niveau et aux besoins de chaque apprenant.',
      })
    }

    // Indicateur 7 : évaluation à chaud obligatoire pour chaque apprenant à l'issue de la formation
    const missingHotEval = students.filter((s) => !s.hasEvaluation)
    if (missingHotEval.length > 0) {
      alerts.push({
        type: 'evaluation',
        priority: 'medium',
        message: `${missingHotEval.length} évaluation(s) à chaud manquante(s) pour « ${sessionName} » (Qualiopi indicateur 7).`,
        count: missingHotEval.length,
        studentIds: missingHotEval.map((s) => s.student_id),
        details: 'Le questionnaire de satisfaction à chaud doit être complété par chaque apprenant à l\'issue de la formation.',
      })
    }

    // Indicateur 14 : évaluation à froid exigible à partir de 90 jours après la fin de session
    if (sessionEndDate) {
      const daysSinceEnd = Math.floor(
        (Date.now() - new Date(sessionEndDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceEnd >= 90) {
        const missingColdEval = students.filter((s) => !s.hasColdEvaluation)
        if (missingColdEval.length > 0) {
          alerts.push({
            type: 'cold_evaluation',
            priority: 'low',
            message: `${missingColdEval.length} évaluation(s) à froid manquante(s) pour « ${sessionName} » (Qualiopi indicateur 14, session terminée il y a ${daysSinceEnd} jours).`,
            count: missingColdEval.length,
            studentIds: missingColdEval.map((s) => s.student_id),
            details: 'L\'évaluation à froid mesure le transfert des acquis et l\'impact professionnel à distance de la formation.',
          })
        }
      }
    }

    return alerts
  }
}
