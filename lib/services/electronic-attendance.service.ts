import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { errorHandler, AppError, ErrorCode } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
import { emailService } from './email.service'
import { AttendanceService } from './attendance.service'

type ElectronicAttendanceSession = TableRow<'electronic_attendance_sessions'>
type ElectronicAttendanceRequest = TableRow<'electronic_attendance_requests'>
type ElectronicAttendanceSessionInsert = TableInsert<'electronic_attendance_sessions'>
type ElectronicAttendanceRequestInsert = TableInsert<'electronic_attendance_requests'>

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
  session?: {
    id: string
    title: string | null
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

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient || createClient()
    // Créer une instance d'AttendanceService avec le même client Supabase
    this.attendanceService = new AttendanceService(this.supabase)
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
        .in('status', ['confirmed', 'active'])

      if (enrollmentsError) throw enrollmentsError

      const students = enrollments
        ?.map((e: any) => e.students)
        .filter((s: any) => s && s.email)

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
          session:sessions(id, title, start_date, end_date)
        `)
        .single()

      if (error) throw error

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
        .select('*, session:sessions(id, title)')
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
        .in('status', ['confirmed', 'active'])

      if (enrollmentsError) throw enrollmentsError

      const students = enrollments
        ?.map((e: any) => e.students)
        .filter((s: any) => s && s.email) || []

      // Créer les demandes d'émargement pour chaque étudiant
      const requests = students.map((student: any) => ({
        organization_id: attendanceSession.organization_id,
        attendance_session_id: attendanceSessionId,
        student_id: student.id,
        student_email: student.email,
        student_name: `${student.first_name} ${student.last_name}`,
        status: 'pending' as const,
        signature_token: this.generateSignatureToken(),
      }))

      const { data: createdRequests, error: requestsError } = await this.supabase
        .from('electronic_attendance_requests')
        .insert(requests as ElectronicAttendanceRequestInsert[])
        .select()

      if (requestsError) throw requestsError

      // Mettre à jour le statut de la session
      const { error: updateError } = await this.supabase
        .from('electronic_attendance_sessions')
        .update({ status: 'active' } as any)
        .eq('id', attendanceSessionId)

      if (updateError) throw updateError

      // Envoyer les emails si demandé
      if (sendEmails && createdRequests) {
        await this.sendAttendanceRequestEmails(
          createdRequests,
          attendanceSession,
          (attendanceSession.session as any)?.title || attendanceSession.title
        )
      }

      logger.info('Session d\'émargement lancée', {
        attendanceSessionId,
        requestsSent: createdRequests?.length || 0,
        emailsSent: sendEmails,
      })

      return {
        attendanceSession,
        requests: createdRequests,
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
          session:sessions(id, title, start_date, end_date),
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
          session:sessions(id, title),
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
      const session = data.attendance_session as any
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

      const session = request.attendance_session as any

      // Valider la géolocalisation si requise
      let locationVerified = false
      if (session?.require_geolocation && location) {
        const validation = await this.validateAttendanceLocation(
          session.latitude,
          session.longitude,
          location.latitude,
          location.longitude,
          session.allowed_radius_meters
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

      const attendance = await this.attendanceService.upsert(attendanceData as any)

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
        } as any)
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
   * Ferme une session d'émargement
   */
  async closeAttendanceSession(attendanceSessionId: string) {
    try {
      const { data, error } = await this.supabase
        .from('electronic_attendance_sessions')
        .update({ status: 'closed' } as any)
        .eq('id', attendanceSessionId)
        .select()
        .single()

      if (error) throw error

      // Marquer les demandes non signées comme expirées
      await this.supabase
        .from('electronic_attendance_requests')
        .update({ status: 'expired' } as any)
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
            session:sessions(title)
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

      const session = request.attendance_session as any
      const attendanceUrl = this.generateAttendanceUrl(request.signature_token)

      await this.sendAttendanceReminderEmail(
        request.student_email,
        request.student_name,
        session?.session?.title || session?.title || 'Formation',
        session?.date,
        attendanceUrl
      )

      // Mettre à jour le compteur de rappels
      await this.supabase
        .from('electronic_attendance_requests')
        .update({
          reminder_count: (request.reminder_count || 0) + 1,
          last_reminder_sent_at: new Date().toISOString(),
        } as any)
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
   * Génère l'URL d'émargement
   */
  private generateAttendanceUrl(token: string): string {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return `${baseUrl}/attendance/${token}`
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
        const attendanceUrl = this.generateAttendanceUrl(request.signature_token)
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
    const failed = results.filter((r) => r.status === 'rejected').length

    logger.info('Emails d\'émargement envoyés', {
      total: requests.length,
      successful,
      failed,
    })
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
    attendanceUrl: string
  ) {
    const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const timeText = startTime ? ` à ${startTime}` : ''

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .info-box {
              background: white;
              border-left: 4px solid #10b981;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">✍️ Émargement électronique</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${studentName}</strong>,</p>

            <p>Vous êtes invité(e) à émarger électroniquement pour la session suivante :</p>

            <div class="info-box">
              <strong>📚 ${sessionTitle}</strong><br>
              <strong>📅 ${formattedDate}${timeText}</strong>
            </div>

            <p>Pour valider votre présence, veuillez cliquer sur le bouton ci-dessous :</p>

            <div style="text-align: center;">
              <a href="${attendanceUrl}" class="button">Émarger maintenant</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Ou copiez ce lien dans votre navigateur :<br>
              <a href="${attendanceUrl}" style="color: #10b981;">${attendanceUrl}</a>
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Votre signature électronique sera enregistrée de manière sécurisée et conforme aux normes en vigueur.
            </p>
          </div>

          <div class="footer">
            <p>EDUZEN - Plateforme de gestion de formation</p>
          </div>
        </body>
      </html>
    `

    const textBody = `
Bonjour ${studentName},

Vous êtes invité(e) à émarger électroniquement pour la session suivante :

Session : ${sessionTitle}
Date : ${formattedDate}${timeText}

Pour valider votre présence, veuillez cliquer sur ce lien :
${attendanceUrl}

Votre signature électronique sera enregistrée de manière sécurisée et conforme aux normes en vigueur.

---
EDUZEN - Plateforme de gestion de formation
    `

    await emailService.sendEmail({
      to,
      subject: `Émargement électronique - ${sessionTitle}`,
      html: htmlBody,
      text: textBody,
    })
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

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: #f59e0b;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🔔 Rappel d'émargement</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${studentName}</strong>,</p>

            <p>Ceci est un rappel concernant l'émargement électronique de la session :</p>

            <p><strong>📚 ${sessionTitle}</strong><br>
            <strong>📅 ${formattedDate}</strong></p>

            <p>Vous n'avez pas encore validé votre présence. Merci d'émarger dès que possible.</p>

            <div style="text-align: center;">
              <a href="${attendanceUrl}" class="button">Émarger maintenant</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Lien d'émargement :<br>
              <a href="${attendanceUrl}" style="color: #f59e0b;">${attendanceUrl}</a>
            </p>
          </div>

          <div class="footer">
            <p>EDUZEN - Plateforme de gestion de formation</p>
          </div>
        </body>
      </html>
    `

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

    await emailService.sendEmail({
      to,
      subject: `Rappel : Émargement en attente - ${sessionTitle}`,
      html: htmlBody,
      text: textBody,
    })
  }
}

export const electronicAttendanceService = new ElectronicAttendanceService()
