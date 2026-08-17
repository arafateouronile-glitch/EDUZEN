import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { errorHandler, AppError, ErrorCode } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { EmailService } from './email.service'
import { AttendanceService } from './attendance.service'

type ElectronicAttendanceSession = TableRow<'electronic_attendance_sessions'>
type ElectronicAttendanceRequest = TableRow<'electronic_attendance_requests'>
type ElectronicAttendanceSessionInsert = TableInsert<'electronic_attendance_sessions'>
type ElectronicAttendanceRequestInsert = TableInsert<'electronic_attendance_requests'>
type ElectronicAttendanceSessionUpdate = TableUpdate<'electronic_attendance_sessions'>
type ElectronicAttendanceRequestUpdate = TableUpdate<'electronic_attendance_requests'>

/** Ligne enrollment avec relation students (select students(id, first_name, last_name, email)) */
type EnrollmentWithStudents = { students: StudentRef | null }
type StudentRef = { id: string; first_name?: string; last_name?: string; email?: string }
/** Session d'émargement avec champs utilisés côté service */
type AttendanceSessionRef = {
  status?: string
  closes_at?: string | null
  session_id?: string
  date?: string | null
  require_geolocation?: boolean
  latitude?: number | null
  longitude?: number | null
  allowed_radius_meters?: number | null
}
/** Session avec relation session (name) pour affichage */
type AttendanceSessionWithSessionName = { session?: { name?: string } | null; title?: string; date?: string }
/** Request avec access_token (généré côté service) */
type RequestWithAccessToken = ElectronicAttendanceRequest & { access_token?: string }

export interface CreateAttendanceSessionParams {
  sessionId: string
  organizationId: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  mode?: 'electronic' | 'manual' | 'hybrid'
  requireSignature?: boolean
  requireGeolocation?: boolean
  allowedRadiusMeters?: number
  qrCodeEnabled?: boolean
  latitude?: number
  longitude?: number
  locationName?: string
  opensAt?: string
  closesAt?: string
}

export interface AttendanceSessionWithRequests extends ElectronicAttendanceSession {
  requests?: ElectronicAttendanceRequest[]
  /** Session de formation liée (table sessions : colonne `name`, pas `title`) */
  session?: {
    id: string
    name: string | null
    start_date: string | null
    end_date: string | null
  }
}

/**
 * Service pour gérer les émargements électroniques
 */
export class ElectronicAttendanceService {
  private supabase: SupabaseClient<Database>
  private attendanceService: AttendanceService
  private emailService: EmailService

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
    // Créer une instance d'AttendanceService avec le même client Supabase
    this.attendanceService = new AttendanceService(this.supabase)
    this.emailService = new EmailService()
  }

  /**
   * Crée une session d'émargement électronique
   */
  async createAttendanceSession(params: CreateAttendanceSessionParams) {
    try {
      const { data: userData } = await this.supabase.auth.getUser()
      if (!userData.user) {
        throw errorHandler.createAuthError(ErrorCode.AUTH_REQUIRED, 'Utilisateur non authentifié')
      }

      // Récupérer les étudiants inscrits à la session
      const { data: enrollments, error: enrollmentsError } = await this.supabase
        .from('enrollments')
        .select('student_id, students(id, first_name, last_name, email)')
        .eq('session_id', params.sessionId)
        .in('status', ['confirmed', 'pending'])

      if (enrollmentsError) throw enrollmentsError

      const students = ((enrollments ?? []) as Array<{ students?: StudentRef | null }>)
        .map((e) => e.students)
        .filter((s): s is StudentRef => !!s && !!s.email)

      // Générer un QR code si activé
      let qrCodeData: string | null = null
      if (params.qrCodeEnabled) {
        qrCodeData = this.generateQRCodeData()
      }

      // Créer la session d'émargement
      const sessionData: FlexibleInsert<'electronic_attendance_sessions'> = {
        organization_id: params.organizationId,
        session_id: params.sessionId,
        title: params.title,
        date: params.date,
        start_time: params.startTime || null,
        end_time: params.endTime || null,
        status: 'draft',
        mode: params.mode || 'electronic',
        require_signature: params.requireSignature !== false,
        require_geolocation: params.requireGeolocation || false,
        allowed_radius_meters: params.allowedRadiusMeters || 100,
        qr_code_enabled: params.qrCodeEnabled || false,
        qr_code_data: qrCodeData,
        latitude: params.latitude || null,
        longitude: params.longitude || null,
        location_name: params.locationName || null,
        opens_at: params.opensAt || null,
        closes_at: params.closesAt || null,
        total_expected: students?.length || 0,
        created_by: userData.user.id,
      }

      const { data, error } = await this.supabase
        .from('electronic_attendance_sessions')
        .insert(sessionData as ElectronicAttendanceSessionInsert)
        .select(`
          *,
          session:sessions(id, name, start_date, end_date)
        `)
        .single()

      if (error) throw error

      // Créer les demandes d'émargement pour chaque apprenant inscrit
      if (students.length > 0) {
        const requests = students.map((s) => ({
          attendance_session_id: data.id,
          student_id: s.id,
          student_name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
          student_email: s.email!,
          status: 'pending' as const,
          organization_id: params.organizationId,
          signature_token: crypto.randomUUID().replace(/-/g, ''),
        }))
        await this.supabase
          .from('electronic_attendance_requests')
          .insert(requests as ElectronicAttendanceRequestInsert[])
      }

      logger.info('Session d\'émargement créée', {
        attendanceSessionId: data.id,
        sessionId: params.sessionId,
        expectedStudents: students?.length || 0,
      })

      return data as unknown as AttendanceSessionWithRequests
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'createAttendanceSession',
        sessionId: params.sessionId,
      })
    }
  }

  /**
   * Lance une session d'émargement et envoie les emails aux apprenants
   */
  async launchAttendanceSession(
    attendanceSessionId: string,
    sendEmails: boolean = true
  ) {
    try {
      // Récupérer la session d'émargement
      const { data: attendanceSession, error: sessionError } = await this.supabase
        .from('electronic_attendance_sessions')
        .select('*, session:sessions(id, name)')
        .eq('id', attendanceSessionId)
        .single()

      if (sessionError || !attendanceSession) {
        throw errorHandler.createNotFoundError('Session d\'émargement introuvable', { attendanceSessionId })
      }

      if (attendanceSession.status !== 'draft') {
        throw errorHandler.createValidationError(
          'La session d\'émargement a déjà été lancée',
          'status'
        )
      }

      // Récupérer les étudiants inscrits
      const { data: enrollments, error: enrollmentsError } = await this.supabase
        .from('enrollments')
        .select('student_id, students(id, first_name, last_name, email)')
        .eq('session_id', attendanceSession.session_id)
        .in('status', ['confirmed', 'pending'])

      if (enrollmentsError) throw enrollmentsError

      const enrolledStudents = ((enrollments ?? []) as Array<{ students?: StudentRef | null }>)
        .map((e) => e.students)
        .filter((s): s is StudentRef => !!s)

      const students = enrolledStudents.filter((s) => !!s.email)
      // Inscrits sans email : ne recevront jamais la demande, on le signale
      // à l'appelant au lieu de les exclure en silence.
      const skippedNoEmail = enrolledStudents
        .filter((s) => !s.email)
        .map((s) => ({ id: s.id, name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() }))

      const tokenExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()

      const requests = students.map((student: StudentRef) => ({
        organization_id: attendanceSession.organization_id,
        attendance_session_id: attendanceSessionId,
        student_id: student.id,
        student_email: student.email,
        student_name: `${student.first_name} ${student.last_name}`,
        status: 'pending' as const,
        signature_token: this.generateSignatureToken(),
        access_token: crypto.randomUUID(),
        token_expires_at: tokenExpiresAt,
      }))

      const { data: createdRequests, error: requestsError } = await this.supabase
        .from('electronic_attendance_requests')
        .insert(requests as ElectronicAttendanceRequestInsert[])
        .select()

      if (requestsError) throw requestsError

      // Mettre à jour le statut de la session
      const { error: updateError } = await this.supabase
        .from('electronic_attendance_sessions')
        .update({ status: 'active' } as ElectronicAttendanceSessionUpdate)
        .eq('id', attendanceSessionId)

      if (updateError) throw updateError

      // Envoyer les emails si demandé (Resend direct pour éviter fetch vers /api/email/send)
      let failedRecipients: Array<{ name: string; email: string }> = []
      if (sendEmails && createdRequests) {
        const sendResult = await this.sendAttendanceRequestEmails(
          createdRequests,
          attendanceSession,
          (attendanceSession.session as { name?: string } | null)?.name ?? attendanceSession.title
        )
        failedRecipients = sendResult.failedRecipients
      }

      logger.info('Session d\'émargement lancée', {
        attendanceSessionId,
        requestsSent: createdRequests?.length || 0,
        emailsSent: sendEmails,
        skippedNoEmail: skippedNoEmail.length,
        failedSends: failedRecipients.length,
      })

      return {
        attendanceSession,
        requests: createdRequests,
        skippedNoEmail,
        failedRecipients,
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'launchAttendanceSession',
        attendanceSessionId,
      })
    }
  }

  /**
   * Récupère une session d'émargement par son ID
   */
  async getAttendanceSessionById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from('electronic_attendance_sessions')
        .select(`
          *,
          session:sessions(id, name, start_date, end_date),
          requests:electronic_attendance_requests(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw errorHandler.createNotFoundError('Session d\'émargement introuvable', { id })
        }
        throw error
      }

      return data as unknown as AttendanceSessionWithRequests
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getAttendanceSessionById',
        id,
      })
    }
  }

  /**
   * Récupère toutes les sessions d'émargement pour une session de formation
   */
  async getAttendanceSessionsBySession(sessionId: string) {
    try {
      const { data, error } = await this.supabase
        .from('electronic_attendance_sessions')
        .select(`
          *,
          requests:electronic_attendance_requests(
            id,
            student_name,
            student_email,
            status,
            signed_at
          )
        `)
        .eq('session_id', sessionId)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getAttendanceSessionsBySession',
        sessionId,
      })
    }
  }

  /**
   * Récupère toutes les sessions d'émargement d'une organisation
   */
  async getAttendanceSessionsByOrganization(
    organizationId: string,
    filters?: {
      status?: 'draft' | 'active' | 'closed' | 'cancelled'
      date?: string
      sessionId?: string
    }
  ) {
    try {
      let query = this.supabase
        .from('electronic_attendance_sessions')
        .select(`
          *,
          session:sessions(id, name),
          requests:electronic_attendance_requests(
            id,
            status
          )
        `)
        .eq('organization_id', organizationId)

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.date) {
        query = query.eq('date', filters.date)
      }

      if (filters?.sessionId) {
        query = query.eq('session_id', filters.sessionId)
      }

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getAttendanceSessionsByOrganization',
        organizationId,
      })
    }
  }

  /**
   * Récupère une demande d'émargement par son token
   */
  async getAttendanceRequestByToken(token: string) {
    try {
      const { data, error } = await this.supabase
        .from('electronic_attendance_requests')
        .select(`
          *,
          attendance_session:electronic_attendance_sessions(
            id,
            title,
            date,
            start_time,
            end_time,
            require_signature,
            require_geolocation,
            allowed_radius_meters,
            latitude,
            longitude,
            location_name,
            status,
            closes_at
          )
        `)
        .eq('signature_token', token)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw errorHandler.createNotFoundError('Demande d\'émargement introuvable', { token })
        }
        throw error
      }

      // Vérifier si la session est encore ouverte
      const session = data.attendance_session as AttendanceSessionRef | null
      if (session?.status === 'closed') {
        throw errorHandler.createValidationError('La session d\'émargement est fermée', 'status')
      }

      if (session?.closes_at && new Date(session.closes_at) < new Date()) {
        throw errorHandler.createValidationError('La session d\'émargement a expiré', 'closes_at')
      }

      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getAttendanceRequestByToken',
      })
    }
  }

  /**
   * Signe une demande d'émargement
   */
  async signAttendanceRequest(
    token: string,
    signatureData: string,
    location?: {
      latitude: number
      longitude: number
      accuracy?: number
    },
    deviceInfo?: {
      ipAddress?: string
      userAgent?: string
    }
  ) {
    try {
      // Récupérer la demande
      const request = await this.getAttendanceRequestByToken(token)

      if (request.status === 'signed') {
        throw errorHandler.createValidationError('Cette demande a déjà été signée', 'status')
      }

      const session = request.attendance_session as AttendanceSessionRef | null

      // Valider la géolocalisation si requise
      let locationVerified = false
      if (session?.require_geolocation && location) {
        const validation = await this.validateAttendanceLocation(
          session.latitude ?? null,
          session.longitude ?? null,
          location.latitude,
          location.longitude,
          session.allowed_radius_meters ?? 100
        )

        if (!validation.valid) {
          throw errorHandler.createValidationError(
            validation.error || 'Localisation invalide',
            'location'
          )
        }

        locationVerified = validation.verified
      }

      // Créer l'entrée d'émargement dans la table attendance
      const attendanceData = {
        organization_id: request.organization_id,
        student_id: request.student_id,
        session_id: session?.session_id,
        date: session?.date,
        status: 'present' as const,
        signature_url: signatureData,
        latitude: location?.latitude,
        longitude: location?.longitude,
        location_accuracy: location?.accuracy,
        location_verified: locationVerified,
      }

      const attendance = await this.attendanceService.upsert(attendanceData as Parameters<AttendanceService['upsert']>[0])

      // Mettre à jour la demande d'émargement
      const { data: updatedRequest, error: updateError } = await this.supabase
        .from('electronic_attendance_requests')
        .update({
          status: 'signed',
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          attendance_id: attendance.id,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          location_accuracy: location?.accuracy || null,
          location_verified: locationVerified,
          ip_address: deviceInfo?.ipAddress || null,
          user_agent: deviceInfo?.userAgent || null,
        } as ElectronicAttendanceRequestUpdate)
        .eq('signature_token', token)
        .select()
        .single()

      if (updateError) throw updateError

      logger.info('Émargement électronique signé', {
        requestId: request.id,
        studentId: request.student_id,
        attendanceId: attendance.id,
        locationVerified,
      })

      return {
        request: updatedRequest,
        attendance,
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'signAttendanceRequest',
      })
    }
  }

  /**
   * Envoie les emails d'émargement uniquement aux apprenants sélectionnés.
   * Crée ou réutilise les electronic_attendance_requests existants.
   */
  async sendSelectedEmails(
    attendanceSessionId: string,
    learnerIds: string[],
    customMessage?: string
  ) {
    try {
      const { data: attendanceSession, error: sessionError } = await this.supabase
        .from('electronic_attendance_sessions')
        .select('*, session:sessions(id, name)')
        .eq('id', attendanceSessionId)
        .single()

      if (sessionError || !attendanceSession) {
        throw errorHandler.createNotFoundError('Session d\'émargement introuvable', { attendanceSessionId })
      }

      const sessionTitle =
        (attendanceSession.session as { name?: string } | null)?.name ?? attendanceSession.title

      // Récupérer les requests existantes pour ces apprenants
      const { data: existingRequests } = await this.supabase
        .from('electronic_attendance_requests')
        .select('*')
        .eq('attendance_session_id', attendanceSessionId)
        .in('student_id', learnerIds)

      const existingByStudentId = new Map(
        (existingRequests ?? []).map((r) => [r.student_id, r])
      )

      // Récupérer les données des étudiants non encore dans les requests
      const missingIds = learnerIds.filter((id) => !existingByStudentId.has(id))
      let newRequests: ElectronicAttendanceRequest[] = []
      let skippedNoEmail: Array<{ id: string; name: string }> = []

      if (missingIds.length > 0) {
        const { data: enrollments } = await this.supabase
          .from('enrollments')
          .select('student_id, students(id, first_name, last_name, email)')
          .eq('session_id', attendanceSession.session_id)
          .in('student_id', missingIds)
          .in('status', ['confirmed', 'pending'])

        const enrolledStudents = ((enrollments ?? []) as Array<{ students?: StudentRef | null }>)
          .map((e) => e.students)
          .filter((s): s is StudentRef => !!s)

        const students = enrolledStudents.filter((s) => !!s.email)
        skippedNoEmail = enrolledStudents
          .filter((s) => !s.email)
          .map((s) => ({ id: s.id, name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() }))

        const tokenExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
        const toInsert = students.map((student) => ({
          organization_id: attendanceSession.organization_id,
          attendance_session_id: attendanceSessionId,
          student_id: student.id,
          student_email: student.email,
          student_name: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
          status: 'pending' as const,
          signature_token: this.generateSignatureToken(),
          access_token: crypto.randomUUID(),
          token_expires_at: tokenExpiresAt,
        }))

        if (toInsert.length > 0) {
          const { data: created } = await this.supabase
            .from('electronic_attendance_requests')
            .insert(toInsert as ElectronicAttendanceRequestInsert[])
            .select()
          newRequests = created ?? []
        }
      }

      // Fusionner : demandes existantes + nouvelles
      const allRequests: ElectronicAttendanceRequest[] = [
        ...learnerIds
          .map((id) => existingByStudentId.get(id))
          .filter((r): r is ElectronicAttendanceRequest => !!r),
        ...newRequests,
      ]

      // Envoyer les emails (uniquement ceux avec email valide)
      const toSend = allRequests.filter((r) => !!r.student_email)
      const results = await Promise.allSettled(
        toSend.map(async (request) => {
          const token = (request as RequestWithAccessToken).access_token ?? request.signature_token
          const url = this.generateAttendanceUrl(token)
          return this.sendAttendanceRequestEmail(
            request.student_email,
            request.student_name,
            sessionTitle,
            attendanceSession.date,
            attendanceSession.start_time || null,
            url,
            customMessage
          )
        })
      )

      const successful = results.filter((r) => r.status === 'fulfilled').length
      const failedRecipients = results
        .map((r, i) => ({ r, request: toSend[i] }))
        .filter(({ r }) => r.status === 'rejected')
        .map(({ request }) => ({ name: request.student_name, email: request.student_email }))

      logger.info('Emails sélectifs envoyés', {
        attendanceSessionId,
        successful,
        failed: failedRecipients.length,
        skippedNoEmail: skippedNoEmail.length,
      })

      return {
        successful,
        failed: failedRecipients.length,
        failedRecipients,
        skippedNoEmail,
        total: toSend.length,
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, { operation: 'sendSelectedEmails', attendanceSessionId })
    }
  }

  /**
   * Active/désactive le lien public et met à jour ses options.
   */
  async updatePublicLink(
    attendanceSessionId: string,
    options: { active: boolean; expiresAt?: string | null; pin?: string | null }
  ) {
    try {
      const update: Record<string, unknown> = {
        public_emargement_active: options.active,
      }
      if ('expiresAt' in options) update.public_emargement_expires_at = options.expiresAt ?? null
      if ('pin' in options) update.public_emargement_pin = options.pin ?? null

      const { data, error } = await this.supabase
        .from('electronic_attendance_sessions')
        .update(update as ElectronicAttendanceSessionUpdate)
        .eq('id', attendanceSessionId)
        .select('id, public_emargement_token, public_emargement_active, public_emargement_expires_at')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, { operation: 'updatePublicLink', attendanceSessionId })
    }
  }

  /**
   * Régénère le token public d'une session.
   */
  async regeneratePublicToken(attendanceSessionId: string) {
    try {
      const newToken = crypto.randomUUID().replace(/-/g, '')
      const { data, error } = await this.supabase
        .from('electronic_attendance_sessions')
        .update({ public_emargement_token: newToken } as ElectronicAttendanceSessionUpdate)
        .eq('id', attendanceSessionId)
        .select('id, public_emargement_token')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, { operation: 'regeneratePublicToken', attendanceSessionId })
    }
  }

  /**
   * Soumet une signature via le lien public de séance.
   * Vérifie le token, détecte la double signature, upload et enregistre.
   */
  async submitPublicEmargement(
    token: string,
    learnerId: string,
    signatureData: string,
    ipAddress: string | null
  ) {
    try {
      // Récupérer la session via son token public
      const { data: session, error: sessionError } = await this.supabase
        .from('electronic_attendance_sessions')
        .select('id, organization_id, session_id, date, start_time, end_time, public_emargement_active, public_emargement_expires_at')
        .eq('public_emargement_token', token)
        .single()

      if (sessionError || !session) {
        throw errorHandler.createNotFoundError('Lien introuvable', { token })
      }

      if (!session.public_emargement_active) {
        throw errorHandler.createValidationError('Ce lien est désactivé', 'active')
      }

      if (session.public_emargement_expires_at && new Date(session.public_emargement_expires_at) < new Date()) {
        throw errorHandler.createValidationError('Ce lien a expiré', 'expires_at')
      }

      // Vérifier que cet apprenant a bien une request pour cette session
      const { data: existingRequest, error: reqError } = await this.supabase
        .from('electronic_attendance_requests')
        .select('id, status, signed_at, student_name')
        .eq('attendance_session_id', session.id)
        .eq('student_id', learnerId)
        .single()

      if (reqError || !existingRequest) {
        throw errorHandler.createNotFoundError('Cet apprenant n\'est pas inscrit à cette session', { learnerId })
      }

      // Double signature bloquée (Option A)
      if (existingRequest.status === 'signed') {
        const time = existingRequest.signed_at
          ? new Date(existingRequest.signed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : ''
        return {
          alreadySigned: true,
          signedAt: existingRequest.signed_at,
          message: `Vous avez déjà signé${time ? ` à ${time}` : ''}. Si vous pensez qu'il s'agit d'une erreur, contactez votre formateur.`,
        }
      }

      // Logger la signature
      await this.supabase.from('public_emargement_logs').insert({
        token,
        session_id: session.id,
        action: 'sign',
        learner_id: learnerId,
        ip_address: ipAddress,
      })

      // Créer l'enregistrement d'émargement dans la table attendance
      let attendanceId: string | null = null
      try {
        const att = await this.attendanceService.upsert({
          organization_id: session.organization_id,
          student_id: learnerId,
          session_id: session.session_id,
          date: session.date,
          status: 'present',
        } as Parameters<AttendanceService['upsert']>[0])
        attendanceId = att?.id ?? null
      } catch {
        // Non-bloquant : la signature reste dans electronic_attendance_requests
      }

      // Mettre à jour la request avec la signature
      await this.supabase
        .from('electronic_attendance_requests')
        .update({
          status: 'signed',
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          attendance_id: attendanceId,
          signed_via: 'public_link',
          ip_address: ipAddress,
        } as ElectronicAttendanceRequestUpdate)
        .eq('id', existingRequest.id)

      logger.info('Signature publique enregistrée', { sessionId: session.id, learnerId })

      return {
        success: true,
        learner_name: existingRequest.student_name,
        signed_at: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, { operation: 'submitPublicEmargement' })
    }
  }

  /**
   * Ferme une session d'émargement
   */
  async closeAttendanceSession(attendanceSessionId: string) {
    try {
      const { data, error } = await this.supabase
        .from('electronic_attendance_sessions')
        .update({ status: 'closed' } as ElectronicAttendanceSessionUpdate)
        .eq('id', attendanceSessionId)
        .select()
        .single()

      if (error) throw error

      // Marquer les demandes non signées comme expirées
      await this.supabase
        .from('electronic_attendance_requests')
        .update({ status: 'expired' } as ElectronicAttendanceRequestUpdate)
        .eq('attendance_session_id', attendanceSessionId)
        .eq('status', 'pending')

      logger.info('Session d\'émargement fermée', { attendanceSessionId })

      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'closeAttendanceSession',
        attendanceSessionId,
      })
    }
  }

  /**
   * Envoie un rappel d'émargement
   */
  async sendAttendanceReminder(requestId: string) {
    try {
      const { data: request, error } = await this.supabase
        .from('electronic_attendance_requests')
        .select(`
          *,
          attendance_session:electronic_attendance_sessions(
            id,
            title,
            date,
            start_time,
            session:sessions(name)
          )
        `)
        .eq('id', requestId)
        .single()

      if (error || !request) {
        throw errorHandler.createNotFoundError('Demande d\'émargement introuvable', { requestId })
      }

      if (request.status !== 'pending') {
        throw errorHandler.createValidationError(
          'Impossible d\'envoyer un rappel pour une demande qui n\'est pas en attente',
          'status'
        )
      }

      const session = request.attendance_session as AttendanceSessionWithSessionName | null
      const token = (request as RequestWithAccessToken).access_token ?? request.signature_token
      const attendanceUrl = this.generateAttendanceUrl(token)

      await this.sendAttendanceReminderEmail(
        request.student_email,
        request.student_name,
        session?.session?.name || session?.title || 'Formation',
        session?.date ?? '',
        attendanceUrl
      )

      // Mettre à jour le compteur de rappels
      await this.supabase
        .from('electronic_attendance_requests')
        .update({
          reminder_count: (request.reminder_count || 0) + 1,
          last_reminder_sent_at: new Date().toISOString(),
        } as ElectronicAttendanceRequestUpdate)
        .eq('id', requestId)

      logger.info('Rappel d\'émargement envoyé', { requestId })

      return true
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'sendAttendanceReminder',
        requestId,
      })
    }
  }

  /**
   * Valide la géolocalisation pour un émargement
   */
  private async validateAttendanceLocation(
    sessionLat: number | null,
    sessionLon: number | null,
    userLat: number,
    userLon: number,
    allowedRadius: number = 100
  ): Promise<{ valid: boolean; verified: boolean; error?: string; distance?: number }> {
    if (!sessionLat || !sessionLon) {
      return { valid: true, verified: false, error: 'Pas de coordonnées de référence' }
    }

    // Calculer la distance (formule de Haversine)
    const R = 6371e3 // Rayon de la Terre en mètres
    const φ1 = (sessionLat * Math.PI) / 180
    const φ2 = (userLat * Math.PI) / 180
    const Δφ = ((userLat - sessionLat) * Math.PI) / 180
    const Δλ = ((userLon - sessionLon) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const distance = R * c

    if (distance > allowedRadius) {
      return {
        valid: false,
        verified: false,
        error: `Vous êtes trop loin du lieu de formation (${Math.round(distance)}m, maximum: ${allowedRadius}m)`,
        distance,
      }
    }

    return { valid: true, verified: true, distance }
  }

  /**
   * Génère un token unique
   */
  private generateSignatureToken(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 15)
    const randomPart2 = Math.random().toString(36).substring(2, 15)
    return `att-${timestamp}-${randomPart}-${randomPart2}`
  }

  /**
   * Génère un code QR unique
   */
  private generateQRCodeData(): string {
    return `qr-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Génère l'URL d'émargement (portail unifié /sign/[token])
   * Préfère access_token (UUID v4) pour les liens email.
   */
  private generateAttendanceUrl(token: string): string {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return `${baseUrl}/sign/${token}`
  }

  /**
   * Envoie les emails de demande d'émargement
   */
  private async sendAttendanceRequestEmails(
    requests: ElectronicAttendanceRequest[],
    session: ElectronicAttendanceSession,
    sessionTitle: string
  ) {
    const results = await Promise.allSettled(
      requests.map(async (request) => {
        const token = (request as RequestWithAccessToken).access_token ?? request.signature_token
        const attendanceUrl = this.generateAttendanceUrl(token)
        return this.sendAttendanceRequestEmail(
          request.student_email,
          request.student_name,
          sessionTitle,
          session.date,
          session.start_time || null,
          attendanceUrl
        )
      })
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length
    // Nommer les échecs plutôt que se contenter d'un compteur, pour que
    // l'admin sache qui relancer sans deviner.
    const failedRecipients = results
      .map((r, i) => ({ r, request: requests[i] }))
      .filter(({ r }) => r.status === 'rejected')
      .map(({ request }) => ({ name: request.student_name, email: request.student_email }))

    logger.info('Emails d\'émargement envoyés', {
      total: requests.length,
      successful,
      failed: failedRecipients.length,
    })

    return { successful, failedRecipients }
  }

  /**
   * Envoie l'email de demande d'émargement
   */
  private async sendAttendanceRequestEmail(
    to: string,
    studentName: string,
    sessionTitle: string,
    date: string,
    startTime: string | null,
    attendanceUrl: string,
    customMessage?: string
  ) {
    const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const timeText = startTime ? ` à ${startTime}` : ''

    const htmlBody = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${studentName},</p>

            <p style="margin:0 0 20px;">Vous êtes invité(e) à émarger électroniquement pour la session suivante :</p>

            <p style="margin:0 0 8px;"><strong>${sessionTitle}</strong></p>
            <p style="margin:0 0 20px;">${formattedDate}${timeText}</p>

            <p style="margin:0 0 20px;">
              <a href="${attendanceUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Émarger maintenant</a>
            </p>

            <p style="margin:0 0 20px;font-size:14px;color:#555;">Ou copiez ce lien dans votre navigateur : <a href="${attendanceUrl}" style="color:#555;word-break:break-all;">${attendanceUrl}</a></p>

            ${customMessage ? `<p style="margin:0 0 20px;padding:12px 16px;background:#f5f5f5;border-left:3px solid #1a1a1a;font-size:14px;">${customMessage}</p>` : ''}

            <p style="margin:0 0 40px;font-size:14px;color:#555;">Votre signature électronique sera enregistrée de manière sécurisée et conforme aux normes en vigueur.</p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              L'équipe EduZen
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const textBody = `
Bonjour ${studentName},

Vous êtes invité(e) à émarger électroniquement pour la session suivante :

Session : ${sessionTitle}
Date : ${formattedDate}${timeText}

Pour valider votre présence, veuillez cliquer sur ce lien :
${attendanceUrl}

Votre signature électronique sera enregistrée de manière sécurisée et conforme aux normes en vigueur.

---
EduZen - Plateforme de gestion de formation
    `

    const result = await sendEmailViaResend({
      to,
      subject: `Émargement électronique - ${sessionTitle}`,
      html: htmlBody,
      text: textBody,
    })
    if (!result.success) {
      throw new Error(result.error ?? 'Échec envoi email')
    }
  }

  /**
   * Envoie l'email de rappel d'émargement
   */
  private async sendAttendanceReminderEmail(
    to: string,
    studentName: string,
    sessionTitle: string,
    date: string,
    attendanceUrl: string
  ) {
    const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const htmlBody = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${studentName},</p>

            <p style="margin:0 0 20px;">Ceci est un rappel concernant l'émargement électronique de la session :</p>

            <p style="margin:0 0 8px;"><strong>${sessionTitle}</strong></p>
            <p style="margin:0 0 20px;">${formattedDate}</p>

            <p style="margin:0 0 20px;">Vous n'avez pas encore validé votre présence. Merci d'émarger dès que possible.</p>

            <p style="margin:0 0 20px;">
              <a href="${attendanceUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Émarger maintenant</a>
            </p>

            <p style="margin:0 0 40px;font-size:14px;color:#555;">Lien d'émargement : <a href="${attendanceUrl}" style="color:#555;word-break:break-all;">${attendanceUrl}</a></p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              L'équipe EduZen
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const textBody = `
Bonjour ${studentName},

Ceci est un rappel concernant l'émargement électronique de la session :

Session : ${sessionTitle}
Date : ${formattedDate}

Vous n'avez pas encore validé votre présence. Merci d'émarger dès que possible :
${attendanceUrl}

---
EDUZEN - Plateforme de gestion de formation
    `

    const result = await sendEmailViaResend({
      to,
      subject: `Rappel : Émargement en attente - ${sessionTitle}`,
      html: htmlBody,
      text: textBody,
    })
    if (!result.success) {
      throw new Error(result.error ?? 'Échec envoi email de rappel')
    }
  }
}

// Note: electronicAttendanceService doit être instancié avec un client Supabase
// Pour les routes API: new ElectronicAttendanceService(await createClient()) avec le client serveur
// Pour les composants client: new ElectronicAttendanceService(createClient()) avec le client client
