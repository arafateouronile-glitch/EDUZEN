/**
 * Service d'alertes pour les documents de conformité des formateurs arrivant à
 * expiration. Clone du fonctionnement de DiplomaExpiryAlertService
 * (lib/services/diploma-expiry-alert.service.ts), adapté à teacher_documents /
 * teacher_required_document_types.
 *
 * Séquence d'urgence à 3 niveaux : T-180j / T-90j / T-1j.
 * Anti-doublon : chaque alerte est loggée dans teacher_document_alert_log
 * (clé teacher_id × required_document_type_id × alert_type).
 *
 * Ne couvre que les documents déposés dont l'expiration approche — les documents
 * totalement manquants restent sur relance manuelle (voir
 * app/api/teacher-documents/relance/route.ts) pour éviter de spammer l'admin
 * quotidiennement sur un manque chronique.
 *
 * Le formateur reçoit l'email d'action (lien vers son espace personnel) ; les
 * admins de l'organisation reçoivent uniquement une notification in-app (pas de
 * doublon d'email) pointant vers le dashboard Formateurs.
 */

import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, maskEmail, sanitizeError } from '@/lib/utils/logger'
import { EMAIL_CONFIG, APP_URLS } from '@/lib/config/app-config'
import { NotificationService } from '@/lib/services/notification.service'

interface AlertWindow {
  type: 'warning_180d' | 'warning_90d' | 'critical_1d'
  daysMin: number
  daysMax: number
}

const ALERT_WINDOWS: AlertWindow[] = [
  { type: 'warning_180d', daysMin: 178, daysMax: 182 },
  { type: 'warning_90d',  daysMin: 88,  daysMax: 92  },
  { type: 'critical_1d',  daysMin: 0,   daysMax: 2   },
]

const ADMIN_ROLES = ['super_admin', 'admin', 'secretary']

export interface TeacherDocumentAlertStats {
  checked: number
  sent: number
  skipped: number
  errors: number
}

export class TeacherDocumentExpiryAlertService {
  private supabase: SupabaseClient<any>
  private resend: Resend | null
  private notificationService: NotificationService

  constructor(supabaseClient: SupabaseClient<any>) {
    this.supabase = supabaseClient
    this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
    this.notificationService = new NotificationService(supabaseClient)
  }

  /** Point d'entrée principal — appeler depuis le cron une fois par jour. */
  async runDailyCheck(): Promise<Record<AlertWindow['type'], TeacherDocumentAlertStats>> {
    const results = {} as Record<AlertWindow['type'], TeacherDocumentAlertStats>
    for (const window of ALERT_WINDOWS) {
      results[window.type] = await this.processWindow(window)
    }
    logger.info('TeacherDocumentExpiryAlertService.runDailyCheck completed', results)
    return results
  }

  private async processWindow(window: AlertWindow): Promise<TeacherDocumentAlertStats> {
    const stats: TeacherDocumentAlertStats = { checked: 0, sent: 0, skipped: 0, errors: 0 }

    try {
      const today = new Date()
      const dateMin = addDays(today, window.daysMin)
      const dateMax = addDays(today, window.daysMax)

      const { data: rows, error } = await this.supabase
        .from('v_teacher_document_compliance')
        .select('*')
        .not('teacher_document_id', 'is', null)
        .not('effective_expiry_date', 'is', null)
        .gte('effective_expiry_date', formatDate(dateMin))
        .lte('effective_expiry_date', formatDate(dateMax))

      if (error) {
        logger.error('TeacherDocumentExpiryAlertService: query error', error, { window: window.type })
        stats.errors++
        return stats
      }
      if (!rows || rows.length === 0) return stats
      stats.checked = rows.length

      const { data: alreadySent } = await this.supabase
        .from('teacher_document_alert_log')
        .select('teacher_id, required_document_type_id')
        .eq('alert_type', window.type)

      const sentSet = new Set(
        (alreadySent ?? []).map((r: any) => `${r.teacher_id}:${r.required_document_type_id}`)
      )

      const teacherUserIds = Array.from(new Set(rows.map((r: any) => r.teacher_user_id)))
      const { data: users } = await this.supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', teacherUserIds)
      const usersById = new Map((users ?? []).map((u: any) => [u.id, u]))

      const orgIds = Array.from(new Set(rows.map((r: any) => r.organization_id)))
      const { data: orgs } = await this.supabase.from('organizations').select('id, name').in('id', orgIds)
      const orgsById = new Map((orgs ?? []).map((o: any) => [o.id, o]))

      const { data: admins } = await this.supabase
        .from('users')
        .select('id, organization_id')
        .in('organization_id', orgIds)
        .in('role', ADMIN_ROLES)
      const adminIdsByOrg = new Map<string, string[]>()
      for (const admin of (admins ?? []) as { id: string; organization_id: string }[]) {
        const list = adminIdsByOrg.get(admin.organization_id) ?? []
        list.push(admin.id)
        adminIdsByOrg.set(admin.organization_id, list)
      }

      for (const row of rows as any[]) {
        const key = `${row.teacher_user_id}:${row.required_document_type_id}`
        if (sentSet.has(key)) {
          stats.skipped++
          continue
        }

        const teacherUser = usersById.get(row.teacher_user_id)
        if (!teacherUser?.email) {
          stats.skipped++
          continue
        }

        const daysLeft = Math.round(
          (new Date(row.effective_expiry_date).getTime() - today.getTime()) / 86_400_000
        )
        const orgName = orgsById.get(row.organization_id)?.name ?? ''

        try {
          await this.sendAlertEmail({
            alertType: window.type,
            recipient: teacherUser.email,
            teacherName: teacherUser.full_name ?? '',
            orgName,
            documentLabel: row.label,
            expiryDate: row.effective_expiry_date,
            daysLeft,
          })

          const adminIds = adminIdsByOrg.get(row.organization_id) ?? []
          if (adminIds.length > 0) {
            await this.notificationService.createForUsers(
              adminIds,
              row.organization_id,
              'document',
              'Document formateur arrivant à expiration',
              `${teacherUser.full_name ?? 'Un formateur'} — ${row.label} expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
              undefined,
              '/dashboard/formateurs'
            )
          }

          await this.supabase.from('teacher_document_alert_log').insert({
            organization_id: row.organization_id,
            teacher_id: row.teacher_user_id,
            required_document_type_id: row.required_document_type_id,
            teacher_document_id: row.teacher_document_id,
            alert_type: window.type,
            recipient: teacherUser.email,
          })

          stats.sent++
        } catch (err) {
          logger.error('TeacherDocumentExpiryAlertService: send error', err, {
            teacherId: row.teacher_user_id,
            recipient: maskEmail(teacherUser.email),
            error: sanitizeError(err),
          })
          stats.errors++
        }
      }
    } catch (err) {
      logger.error('TeacherDocumentExpiryAlertService.processWindow', err, { window: window.type })
      stats.errors++
    }

    return stats
  }

  private async sendAlertEmail(params: {
    alertType: AlertWindow['type']
    recipient: string
    teacherName: string
    orgName: string
    documentLabel: string
    expiryDate: string
    daysLeft: number
  }) {
    if (!this.resend) {
      logger.info('TeacherDocumentExpiryAlertService: mode test (RESEND_API_KEY absente)', {
        recipient: maskEmail(params.recipient),
        alertType: params.alertType,
      })
      return
    }

    const { subject, html } = buildEmailContent(params)

    const { error } = await this.resend.emails.send({
      from: EMAIL_CONFIG.getFromEmail(),
      to: params.recipient,
      subject,
      html,
    })

    if (error) throw error
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateFR(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

interface EmailParams {
  alertType: AlertWindow['type']
  teacherName: string
  orgName: string
  documentLabel: string
  expiryDate: string
  daysLeft: number
}

function buildEmailContent(params: EmailParams): { subject: string; html: string } {
  const { alertType, teacherName, orgName, documentLabel, expiryDate, daysLeft } = params
  const expiryFR = formatDateFR(expiryDate)
  const docsUrl = `${APP_URLS.getBaseUrl()}/dashboard/teacher/documents`

  const config = {
    warning_180d: {
      subject: `⚠️ ${documentLabel} — à renouveler dans 6 mois`,
      bannerColor: '#F59E0B',
      urgencyLabel: 'Anticipation',
      urgencyText: `Ce document arrive à expiration <strong>dans ${daysLeft} jours</strong>.`,
    },
    warning_90d: {
      subject: `🟠 ${documentLabel} — à renouveler d'urgence (90 jours)`,
      bannerColor: '#EA580C',
      urgencyLabel: '90 jours restants',
      urgencyText: `⏳ <strong>Il ne reste que ${daysLeft} jours</strong> avant l'expiration.`,
    },
    critical_1d: {
      subject: `🚨 ${documentLabel} — expire demain`,
      bannerColor: '#DC2626',
      urgencyLabel: 'Expiration imminente',
      urgencyText: `🚨 <strong>Ce document expire demain (${expiryFR}).</strong> Action immédiate requise.`,
    },
  }[alertType]

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${config.subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:${config.bannerColor};border-radius:12px 12px 0 0;padding:28px 32px;">
            <span style="color:white;font-size:22px;font-weight:700;">eduzen</span>
            <span style="color:rgba(255,255,255,0.7);font-size:13px;margin-left:8px;">Espace Formateurs</span>
            <br>
            <span style="background:rgba(255,255,255,0.2);color:white;font-size:11px;font-weight:600;padding:4px 10px;border-radius:100px;text-transform:uppercase;display:inline-block;margin-top:8px;">${config.urgencyLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="background:white;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">Bonjour ${teacherName},</p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Dans le cadre de votre suivi de conformité avec <strong>${orgName}</strong>, ${config.urgencyText}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 28px;">
              <tr><td style="padding:20px 24px;">
                <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;">Document</span><br>
                <span style="color:#111827;font-size:15px;font-weight:600;">${documentLabel}</span><br><br>
                <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;">Date d'expiration</span><br>
                <span style="color:${config.bannerColor};font-size:15px;font-weight:700;">${expiryFR}</span>
              </td></tr>
            </table>
            <a href="${docsUrl}" style="display:inline-block;background:${config.bannerColor};color:white;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">Accéder à mon espace formateur</a>
            <p style="margin:28px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">Cordialement,<br><strong style="color:#374151;">L'équipe EDUZEN</strong></p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">Cet email a été envoyé automatiquement par EDUZEN · © ${new Date().getFullYear()}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  return { subject: config.subject, html }
}
