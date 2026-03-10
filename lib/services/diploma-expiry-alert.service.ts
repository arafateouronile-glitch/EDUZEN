/**
 * Service d'alertes email pour les habilitations/diplômes arrivant à expiration.
 *
 * Séquence d'urgence à 3 niveaux :
 *   T-180 jours (Orange)      — alerte anticipation, service client
 *   T-90  jours (Orange foncé) — relance commerciale, urgence modérée
 *   T-1   jour  (Rouge)        — alerte critique, action immédiate
 *
 * Anti-doublon : chaque alerte est loggée dans `diploma_alert_log`.
 * Si l'alerte a déjà été envoyée pour ce diplôme × ce type, elle est ignorée.
 */

import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, maskEmail, sanitizeError } from '@/lib/utils/logger'
import { EMAIL_CONFIG, APP_URLS } from '@/lib/config/app-config'

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

// Labels lisibles pour les logs
const ALERT_LABELS: Record<AlertWindow['type'], string> = {
  warning_180d: '6 mois',
  warning_90d:  '3 mois',
  critical_1d:  '1 jour',
}

export interface DiplomaAlertStats {
  checked: number
  sent: number
  skipped: number
  errors: number
}

export class DiplomaExpiryAlertService {
  private supabase: SupabaseClient<any>
  private resend: Resend | null

  constructor(supabaseClient: SupabaseClient<any>) {
    this.supabase = supabaseClient
    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null
  }

  /**
   * Point d'entrée principal — appeler depuis le cron une fois par jour.
   */
  async runDailyCheck(): Promise<Record<AlertWindow['type'], DiplomaAlertStats>> {
    const results = {} as Record<AlertWindow['type'], DiplomaAlertStats>

    for (const window of ALERT_WINDOWS) {
      results[window.type] = await this.processWindow(window)
    }

    const total = Object.values(results).reduce(
      (acc, r) => ({ sent: acc.sent + r.sent, errors: acc.errors + r.errors }),
      { sent: 0, errors: 0 }
    )

    logger.info('DiplomaExpiryAlertService.runDailyCheck completed', total)
    return results
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async processWindow(window: AlertWindow): Promise<DiplomaAlertStats> {
    const stats: DiplomaAlertStats = { checked: 0, sent: 0, skipped: 0, errors: 0 }

    try {
      const today = new Date()
      const dateMin = addDays(today, window.daysMin)
      const dateMax = addDays(today, window.daysMax)

      // 1. Diplômes expirant dans la fenêtre
      const { data: diplomas, error } = await this.supabase
        .from('employee_diplomas')
        .select(`
          id, expiry_date,
          diploma_types!inner ( name ),
          company_employees!inner (
            department, job_title,
            students!inner ( first_name, last_name )
          ),
          companies!inner ( name, email, billing_email )
        `)
        .gte('expiry_date', formatDate(dateMin))
        .lte('expiry_date', formatDate(dateMax))

      if (error) {
        logger.error('DiplomaExpiryAlertService: query error', error, { window: window.type })
        stats.errors++
        return stats
      }

      if (!diplomas || diplomas.length === 0) return stats

      stats.checked = diplomas.length

      // 2. Récupérer les alertes déjà envoyées pour ce type
      const diplomaIds = diplomas.map((d: { id: string }) => d.id)
      const { data: alreadySent } = await this.supabase
        .from('diploma_alert_log')
        .select('diploma_id')
        .in('diploma_id', diplomaIds)
        .eq('alert_type', window.type)

      const sentIds = new Set((alreadySent || []).map((r: { diploma_id: string }) => r.diploma_id))

      // 3. Envoyer les alertes manquantes
      for (const diploma of diplomas) {
        if (sentIds.has(diploma.id)) {
          stats.skipped++
          continue
        }

        const company = Array.isArray(diploma.companies) ? diploma.companies[0] : diploma.companies
        const emp = Array.isArray(diploma.company_employees) ? diploma.company_employees[0] : diploma.company_employees
        const student = emp && (Array.isArray((emp as { students?: unknown }).students) ? (emp as { students: unknown[] }).students[0] : (emp as { students?: { first_name?: string; last_name?: string } }).students)
        const diplomaType = Array.isArray(diploma.diploma_types) ? diploma.diploma_types[0] : diploma.diploma_types

        const recipient =
          (company as { billing_email?: string; email?: string } | undefined)?.billing_email ||
          (company as { email?: string } | undefined)?.email

        if (!recipient) {
          logger.warn('DiplomaExpiryAlertService: no recipient email', { diplomaId: diploma.id })
          stats.skipped++
          continue
        }

        const daysLeft = Math.round(
          (new Date(diploma.expiry_date).getTime() - today.getTime()) / 86_400_000
        )

        try {
          await this.sendAlertEmail({
            alertType: window.type,
            recipient,
            companyName: (company as { name?: string } | undefined)?.name ?? '',
            employeeFirstName: (student as { first_name?: string } | undefined)?.first_name ?? '',
            employeeLastName:  (student as { last_name?: string } | undefined)?.last_name ?? '',
            diplomaName:       (diplomaType as { name?: string } | undefined)?.name ?? '',
            expiryDate:        diploma.expiry_date,
            daysLeft,
          })

          // Log l'envoi pour éviter les doublons
          await this.supabase
            .from('diploma_alert_log')
            .insert({ diploma_id: diploma.id, alert_type: window.type, recipient })

          stats.sent++
        } catch (err) {
          logger.error('DiplomaExpiryAlertService: send error', err, {
            diplomaId: diploma.id,
            recipient: maskEmail(recipient),
            error: sanitizeError(err),
          })
          stats.errors++
        }
      }
    } catch (err) {
      logger.error('DiplomaExpiryAlertService.processWindow', err, { window: window.type })
      stats.errors++
    }

    logger.info(`DiplomaExpiryAlertService [${ALERT_LABELS[window.type]}]`, { ...stats })
    return stats
  }

  private async sendAlertEmail(params: {
    alertType: AlertWindow['type']
    recipient: string
    companyName: string
    employeeFirstName: string
    employeeLastName: string
    diplomaName: string
    expiryDate: string
    daysLeft: number
  }) {
    if (!this.resend) {
      logger.info('DiplomaExpiryAlertService: mode test (RESEND_API_KEY absente)', {
        recipient: maskEmail(params.recipient),
        alertType: params.alertType,
      })
      return
    }

    const { subject, html } = buildEmailContent(params)

    const { error } = await this.resend.emails.send({
      from: EMAIL_CONFIG.getFromEmail(),
      to:   params.recipient,
      subject,
      html,
    })

    if (error) throw error

    logger.info('DiplomaExpiryAlertService: email sent', {
      recipient: maskEmail(params.recipient),
      alertType: params.alertType,
    })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateFR(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Templates email ──────────────────────────────────────────────────────────

interface EmailParams {
  alertType: AlertWindow['type']
  companyName: string
  employeeFirstName: string
  employeeLastName: string
  diplomaName: string
  expiryDate: string
  daysLeft: number
}

function buildEmailContent(params: EmailParams): { subject: string; html: string } {
  const { alertType, companyName, employeeFirstName, employeeLastName, diplomaName, expiryDate, daysLeft } = params
  const fullName = `${employeeFirstName} ${employeeLastName}`
  const expiryFR = formatDateFR(expiryDate)
  const dashboardUrl = `${APP_URLS.getBaseUrl()}/enterprise/compliance`

  const config = {
    warning_180d: {
      subject: `⚠️ Alerte Conformité : ${fullName} — Habilitation à renouveler dans 6 mois`,
      emoji: '⚠️',
      bannerColor: '#F59E0B',
      urgencyLabel: 'Alerte Anticipation',
      urgencyText: `La validité de l'habilitation suivante arrive à expiration <strong>dans ${daysLeft} jours</strong>.`,
      ctaText: 'Planifier un recyclage',
      tip: "En anticipant dès maintenant, vous garantissez la disponibilité de vos équipes et évitez toute interruption d'activité.",
    },
    warning_90d: {
      subject: `🟠 Conformité : ${fullName} — Recyclage à prévoir d'urgence (90 jours)`,
      emoji: '🟠',
      bannerColor: '#EA580C',
      urgencyLabel: 'Relance Commerciale — 90 jours restants',
      urgencyText: `⏳ <strong>Il ne reste que ${daysLeft} jours</strong> avant l'expiration. Nos sessions se remplissent vite — agissez maintenant.`,
      ctaText: 'Réserver une session maintenant',
      tip: 'Un recyclage non réalisé à temps peut entraîner une non-conformité Qualiopi et exposer votre entreprise à des risques légaux.',
    },
    critical_1d: {
      subject: `🚨 ALERTE CRITIQUE : ${fullName} — Habilitation expire DEMAIN`,
      emoji: '🚨',
      bannerColor: '#DC2626',
      urgencyLabel: 'Alerte Critique — Expiration imminente',
      urgencyText: `🚨 <strong>L'habilitation expire demain (${expiryFR}).</strong> À partir de ce moment, votre salarié n'est plus couvert. Action immédiate requise.`,
      ctaText: 'Contacter le centre de formation',
      tip: "En cas de contrôle, un salarié exerçant avec une habilitation expirée engage la responsabilité civile et pénale de l'employeur.",
    },
  }[alertType]

  const subject = config.subject
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${config.bannerColor};border-radius:12px 12px 0 0;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:white;font-size:22px;font-weight:700;letter-spacing:-0.5px;">eduzen</span>
                    <span style="color:rgba(255,255,255,0.7);font-size:13px;margin-left:8px;">Espace Conformité</span>
                  </td>
                  <td align="right">
                    <span style="background:rgba(255,255,255,0.2);color:white;font-size:11px;font-weight:600;padding:4px 10px;border-radius:100px;letter-spacing:0.5px;text-transform:uppercase;">
                      ${config.urgencyLabel}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:white;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Bonjour,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Dans le cadre du suivi de conformité de <strong>${companyName}</strong>, nous vous informons que la validité d'une habilitation arrive prochainement à son terme.
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                ${config.urgencyText}
              </p>

              <!-- Diploma Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Salarié</span>
                          <br>
                          <span style="color:#111827;font-size:15px;font-weight:600;">${fullName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0 6px;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Habilitation / Diplôme</span>
                          <br>
                          <span style="color:#111827;font-size:15px;font-weight:600;">${diplomaName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0 0;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Date d'expiration</span>
                          <br>
                          <span style="color:${config.bannerColor};font-size:15px;font-weight:700;">${expiryFR} (dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''})</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Why it matters -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-left:4px solid ${config.bannerColor};border-radius:0 8px 8px 0;margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 20px;color:#92400e;font-size:14px;line-height:1.6;">
                    ${config.tip}
                  </td>
                </tr>
              </table>

              <!-- CTAs -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${dashboardUrl}" style="display:inline-block;background:${config.bannerColor};color:white;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">
                      📋 Voir le tableau de bord
                    </a>
                  </td>
                  <td>
                    <a href="mailto:${EMAIL_CONFIG.getFromEmail()}" style="display:inline-block;background:white;color:#374151;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;border:1px solid #d1d5db;">
                      ${config.ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
                Nous restons à votre disposition pour planifier les sessions de recyclage.
              </p>
              <p style="margin:12px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
                Cordialement,<br>
                <strong style="color:#374151;">L'équipe EDUZEN</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Cet email a été envoyé automatiquement par le module de conformité EDUZEN.<br>
                Propulsé par le <strong>bouclier administratif EDUZEN</strong> · © ${new Date().getFullYear()} EDUZEN
              </p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">
                <a href="${dashboardUrl}" style="color:#6b7280;text-decoration:underline;">Gérer mes alertes</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  return { subject, html }
}
