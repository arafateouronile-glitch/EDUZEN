/**
 * Service de planification et envoi de notifications automatiques
 * - WhatsApp (via API Twilio ou similaire)
 * - Email 
 * - Rappels automatiques (veille des sessions)
 * - Envoi programmé de documents
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'
import { logger, sanitizeError } from '@/lib/utils/logger'

type ScheduledNotification = {
  id: string
  organization_id: string
  type: 'whatsapp' | 'email' | 'sms'
  recipient_type: 'teacher' | 'student' | 'all'
  recipient_id?: string
  session_id?: string
  formation_id?: string
  subject?: string
  message: string
  scheduled_at: string
  sent_at?: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  metadata?: Record<string, unknown>
}

type NotificationPreferences = {
  reminder_enabled: boolean
  reminder_hours_before: number // Par défaut 24h (veille)
  whatsapp_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
}

type SessionWithRelations = {
  id: string
  name?: string
  start_date?: string
  start_time?: string
  end_time?: string
  location?: string
  room?: string
  formations?: { name?: string } | null
  session_teachers?: Array<{ users?: { id?: string; email?: string; full_name?: string; phone?: string } | null }>
  enrollments?: Array<{ students?: { id?: string; first_name?: string; last_name?: string; email?: string; phone?: string; parent_phone?: string } | null }>
}

export class NotificationSchedulerService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient: SupabaseClient<Database>) {

    this.supabase = supabaseClient!

  }

  /**
   * Planifie les rappels automatiques pour les sessions à venir
   * À exécuter quotidiennement via CRON
   */
  async scheduleSessionReminders(organizationId: string): Promise<void> {
    const supabaseAdmin = createAdminClient()
    
    // Récupérer les préférences de notification de l'organisation
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('settings, subscription_tier')
      .eq('id', organizationId)
      .single()

    if (!org) return

    type OrgNotificationSettings = { notifications?: { whatsapp_enabled?: boolean; email_enabled?: boolean; reminder_hours_before?: number } }
    const settings = (org.settings as OrgNotificationSettings | null) ?? {}
    const isPremium = ['premium', 'enterprise'].includes(org.subscription_tier || '')
    
    // WhatsApp uniquement pour les abonnements premium
    const whatsappEnabled = isPremium && settings.notifications?.whatsapp_enabled
    const emailEnabled = settings.notifications?.email_enabled !== false
    const reminderHours = settings.notifications?.reminder_hours_before || 24

    // Récupérer les sessions qui commencent dans X heures
    const reminderTime = new Date()
    reminderTime.setHours(reminderTime.getHours() + reminderHours)
    
    const tomorrow = new Date(reminderTime)
    tomorrow.setHours(0, 0, 0, 0)
    
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 1)

    const { data: upcomingSessionsData } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        name,
        start_date,
        start_time,
        end_time,
        location,
        room,
        organization_id,
        formations(id, name),
        session_teachers(
          teacher_id,
          users:teacher_id(id, email, full_name, phone)
        ),
        enrollments(
          student_id,
          students:student_id(id, first_name, last_name, email, phone, parent_phone)
        )
      `)
      .eq('organization_id', organizationId)
      .gte('start_date', tomorrow.toISOString().split('T')[0])
      .lt('start_date', dayAfter.toISOString().split('T')[0])
      .eq('status', 'active')
    
    const upcomingSessions = (upcomingSessionsData || []) as unknown as SessionWithRelations[]

    if (!upcomingSessions?.length) return

    for (const session of upcomingSessions) {
      // Créer les rappels pour les enseignants
      for (const teacherAssignment of (session.session_teachers || [])) {
        const teacher = teacherAssignment.users
        if (!teacher) continue

        await this.createReminder({
          organizationId,
          recipientType: 'teacher',
          recipientId: teacher.id ?? '',
          recipientName: teacher.full_name ?? '',
          recipientEmail: teacher.email ?? undefined,
          recipientPhone: teacher.phone ?? undefined,
          session,
          whatsappEnabled: whatsappEnabled ?? false,
          emailEnabled,
        })
      }

      // Créer les rappels pour les apprenants
      for (const enrollment of (session.enrollments || [])) {
        const student = enrollment.students
        if (!student) continue

        await this.createReminder({
          organizationId,
          recipientType: 'student',
          recipientId: student.id ?? '',
          recipientName: `${student.first_name ?? ''} ${student.last_name ?? ''}`,
          recipientEmail: student.email ?? undefined,
          recipientPhone: student.phone ?? student.parent_phone ?? undefined,
          session,
          whatsappEnabled: whatsappEnabled ?? false,
          emailEnabled,
        })
      }
    }
  }

  /**
   * Crée un rappel de notification
   */
  private async createReminder(params: {
    organizationId: string
    recipientType: 'teacher' | 'student'
    recipientId: string
    recipientName: string
    recipientEmail?: string
    recipientPhone?: string
    session: SessionWithRelations
    whatsappEnabled: boolean
    emailEnabled: boolean
  }): Promise<void> {
    const supabaseAdmin = createAdminClient()
    const { session } = params
    const formation = session.formations

    const formattedDate = new Date(session.start_date ?? '').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    const locationInfo = [session.location, session.room].filter(Boolean).join(' - ')
    const timeInfo = session.start_time 
      ? `${session.start_time}${session.end_time ? ` - ${session.end_time}` : ''}`
      : ''

    const baseMessage = params.recipientType === 'teacher'
      ? `📚 Rappel : Vous avez une session de formation demain\n\n` +
        `📖 Formation : ${formation?.name || session.name}\n` +
        `📅 Date : ${formattedDate}\n` +
        `${timeInfo ? `⏰ Horaire : ${timeInfo}\n` : ''}` +
        `${locationInfo ? `📍 Lieu : ${locationInfo}\n` : ''}`
      : `📚 Rappel : Vous avez une formation demain\n\n` +
        `📖 Formation : ${formation?.name || session.name}\n` +
        `📅 Date : ${formattedDate}\n` +
        `${timeInfo ? `⏰ Horaire : ${timeInfo}\n` : ''}` +
        `${locationInfo ? `📍 Lieu : ${locationInfo}\n` : ''}`

    // Planifier WhatsApp si activé et téléphone disponible
    if (params.whatsappEnabled && params.recipientPhone) {
      await supabaseAdmin
        .from('scheduled_notifications')
        .upsert({
          organization_id: params.organizationId,
          type: 'whatsapp',
          recipient_type: params.recipientType,
          recipient_id: params.recipientId,
          session_id: session.id,
          message: baseMessage,
          scheduled_at: new Date().toISOString(),
          status: 'pending',
          metadata: {
            phone: params.recipientPhone,
            recipient_name: params.recipientName,
          },
        }, {
          onConflict: 'organization_id,session_id,recipient_id,type',
        })
    }

    // Planifier Email si activé
    if (params.emailEnabled && params.recipientEmail) {
      await supabaseAdmin
        .from('scheduled_notifications')
        .upsert({
          organization_id: params.organizationId,
          type: 'email',
          recipient_type: params.recipientType,
          recipient_id: params.recipientId,
          session_id: session.id,
          subject: `Rappel : Formation "${formation?.name || session.name}" - ${formattedDate}`,
          message: baseMessage.replace(/\n/g, '<br>'),
          scheduled_at: new Date().toISOString(),
          status: 'pending',
          metadata: {
            email: params.recipientEmail,
            recipient_name: params.recipientName,
          },
        }, {
          onConflict: 'organization_id,session_id,recipient_id,type',
        })
    }
  }

  /**
   * Envoie un message WhatsApp via l'API
   * Nécessite une intégration WhatsApp Business API (Twilio, etc.)
   */
  async sendWhatsApp(phone: string, message: string, organizationId: string): Promise<boolean> {
    const supabaseAdmin = createAdminClient()
    
    // Récupérer la configuration WhatsApp de l'organisation
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single()

    const settings = (org?.settings as Record<string, unknown>) || {}
    const whatsappConfig = (settings.whatsapp || {}) as { account_sid?: string; auth_token?: string; from_number?: string }

    if (!whatsappConfig.account_sid || !whatsappConfig.auth_token) {
      logger.warn('NotificationScheduler - WhatsApp not configured for organization', { organizationId })
      return false
    }

    try {
      // Intégration Twilio WhatsApp
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${whatsappConfig.account_sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${whatsappConfig.account_sid}:${whatsappConfig.auth_token}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: `whatsapp:${whatsappConfig.from_number}`,
            To: `whatsapp:${phone}`,
            Body: message,
          }),
        }
      )

      return response.ok
    } catch (error) {
      logger.error('NotificationScheduler - WhatsApp send error', error, { error: sanitizeError(error) })
      return false
    }
  }

  /**
   * Traite les notifications planifiées en attente
   * À exécuter régulièrement via CRON
   */
  async processScheduledNotifications(): Promise<{ sent: number; failed: number }> {
    const supabaseAdmin = createAdminClient()
    
    const { data: pending } = await supabaseAdmin
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(100)

    if (!pending?.length) {
      return { sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    for (const notification of pending) {
      let success = false
      const metadata = (notification.metadata as Record<string, unknown>) || {}

      try {
        if (notification.type === 'whatsapp') {
          success = await this.sendWhatsApp(
            typeof metadata.phone === 'string' ? metadata.phone : '',
            notification.message,
            notification.organization_id
          )
        } else if (notification.type === 'email') {
          // Utiliser le service email existant
          const response = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Inclure les cookies pour l'authentification
            body: JSON.stringify({
              to: metadata.email,
              subject: notification.subject,
              html: notification.message,
            }),
          })
          success = response.ok
        }

        await supabaseAdmin
          .from('scheduled_notifications')
          .update({
            status: success ? 'sent' : 'failed',
            sent_at: success ? new Date().toISOString() : null,
          })
          .eq('id', notification.id)

        if (success) sent++
        else failed++
      } catch (error) {
        logger.error('NotificationScheduler - Notification processing error', error, { error: sanitizeError(error) })
        await supabaseAdmin
          .from('scheduled_notifications')
          .update({ status: 'failed' })
          .eq('id', notification.id)
        failed++
      }
    }

    return { sent, failed }
  }

  /**
   * Planifie l'envoi d'un document
   */
  async scheduleDocumentSend(params: {
    organizationId: string
    documentId: string
    recipientType: 'teacher' | 'student' | 'all'
    recipientIds?: string[]
    sessionId?: string
    scheduledAt: Date
    subject?: string
    message?: string
    sendVia: ('email' | 'whatsapp')[]
  }): Promise<void> {
    const supabaseAdmin = createAdminClient()

    await supabaseAdmin
      .from('scheduled_document_sends')
      .insert({
        organization_id: params.organizationId,
        document_id: params.documentId,
        recipient_type: params.recipientType,
        recipient_ids: params.recipientIds || [],
        session_id: params.sessionId,
        scheduled_at: params.scheduledAt.toISOString(),
        subject: params.subject,
        message: params.message,
        send_via: params.sendVia,
        status: 'pending',
      })
  }

  /**
   * Récupère les rappels planifiés pour une organisation
   */
  async getScheduledNotifications(
    organizationId: string,
    status?: 'pending' | 'sent' | 'failed'
  ): Promise<ScheduledNotification[]> {
    let query = this.supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('scheduled_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data } = await query.limit(100)
    return (data as ScheduledNotification[]) || []
  }
}
