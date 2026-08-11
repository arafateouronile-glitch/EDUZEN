/**
 * Digest hebdomadaire des documents de conformité formateurs jamais déposés.
 *
 * Complète TeacherDocumentExpiryAlertService (qui ne couvre que les documents
 * existants dont l'expiration approche) : ici on regroupe, par organisation, tous
 * les documents `missing` de v_teacher_document_compliance et on envoie un seul
 * email récapitulatif par admin de l'organisation, plutôt qu'une alerte par
 * document — sinon un organisme avec beaucoup de documents manquants recevrait un
 * déluge d'emails individuels.
 *
 * Contrairement aux alertes à échéance, un digest hebdomadaire doit pouvoir se
 * répéter tant que le document manque : chaque paire formateur×document est quand
 * même journalisée dans teacher_document_alert_log (alert_type:
 * 'missing_weekly_digest') pour alimenter l'historique affiché dans l'UI, mais
 * cette valeur est exclue de l'index de dédoublonnage (voir migration
 * 20260811000001).
 */

import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, maskEmail, sanitizeError } from '@/lib/utils/logger'
import { EMAIL_CONFIG, APP_URLS } from '@/lib/config/app-config'

const ADMIN_ROLES = ['super_admin', 'admin', 'secretary']

interface MissingRow {
  teacher_user_id: string
  organization_id: string
  required_document_type_id: string
  label: string
}

export interface DigestStats {
  organizationsNotified: number
  emailsSent: number
  missingItemsLogged: number
  errors: number
}

export class TeacherMissingDocumentsDigestService {
  private supabase: SupabaseClient<any>
  private resend: Resend | null

  constructor(supabaseClient: SupabaseClient<any>) {
    this.supabase = supabaseClient
    this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  }

  async runWeeklyDigest(): Promise<DigestStats> {
    const stats: DigestStats = { organizationsNotified: 0, emailsSent: 0, missingItemsLogged: 0, errors: 0 }

    try {
      const { data: rows, error } = await this.supabase
        .from('v_teacher_document_compliance')
        .select('teacher_user_id, organization_id, required_document_type_id, label')
        .eq('status', 'missing')

      if (error) {
        logger.error('TeacherMissingDocumentsDigestService: query error', error)
        stats.errors++
        return stats
      }
      if (!rows || rows.length === 0) return stats

      const missingRows = rows as unknown as MissingRow[]

      const orgIds = Array.from(new Set(missingRows.map(r => r.organization_id)))
      const { data: orgs } = await this.supabase.from('organizations').select('id, name').in('id', orgIds)
      const orgsById = new Map((orgs ?? []).map((o: any) => [o.id, o]))

      const teacherUserIds = Array.from(new Set(missingRows.map(r => r.teacher_user_id)))
      const { data: teacherUsers } = await this.supabase.from('users').select('id, full_name').in('id', teacherUserIds)
      const teacherNameById = new Map((teacherUsers ?? []).map((u: any) => [u.id, u.full_name as string | null]))

      const { data: admins } = await this.supabase
        .from('users')
        .select('id, email, organization_id')
        .in('organization_id', orgIds)
        .in('role', ADMIN_ROLES)
      const adminsByOrg = new Map<string, { id: string; email: string }[]>()
      for (const admin of (admins ?? []) as { id: string; email: string; organization_id: string }[]) {
        if (!admin.email) continue
        const list = adminsByOrg.get(admin.organization_id) ?? []
        list.push(admin)
        adminsByOrg.set(admin.organization_id, list)
      }

      // Regroupe par organisation, puis par formateur
      const byOrg = new Map<string, Map<string, MissingRow[]>>()
      for (const row of missingRows) {
        const orgMap = byOrg.get(row.organization_id) ?? new Map<string, MissingRow[]>()
        const teacherRows = orgMap.get(row.teacher_user_id) ?? []
        teacherRows.push(row)
        orgMap.set(row.teacher_user_id, teacherRows)
        byOrg.set(row.organization_id, orgMap)
      }

      const logRows: Record<string, unknown>[] = []

      for (const [organizationId, byTeacher] of byOrg) {
        const orgName = orgsById.get(organizationId)?.name ?? 'Votre organisme'
        const orgAdmins = adminsByOrg.get(organizationId) ?? []

        const teacherSummaries = Array.from(byTeacher.entries()).map(([teacherUserId, teacherRows]) => ({
          teacherName: teacherNameById.get(teacherUserId) ?? 'Formateur',
          labels: teacherRows.map(r => r.label),
        }))

        for (const row of missingRows.filter(r => r.organization_id === organizationId)) {
          logRows.push({
            organization_id: organizationId,
            teacher_id: row.teacher_user_id,
            required_document_type_id: row.required_document_type_id,
            alert_type: 'missing_weekly_digest',
            recipient: orgName,
            sent_by: null,
          })
        }

        if (orgAdmins.length === 0) {
          stats.errors++
          continue
        }

        for (const admin of orgAdmins) {
          try {
            await this.sendDigestEmail(admin.email, orgName, teacherSummaries)
            stats.emailsSent++
          } catch (err) {
            logger.error('TeacherMissingDocumentsDigestService: send error', err, {
              recipient: maskEmail(admin.email),
              error: sanitizeError(err),
            })
            stats.errors++
          }
        }

        stats.organizationsNotified++
      }

      if (logRows.length > 0) {
        const { error: insertError } = await this.supabase.from('teacher_document_alert_log').insert(logRows)
        if (insertError) {
          logger.error('TeacherMissingDocumentsDigestService: log insert error', insertError)
          stats.errors++
        } else {
          stats.missingItemsLogged = logRows.length
        }
      }
    } catch (err) {
      logger.error('TeacherMissingDocumentsDigestService.runWeeklyDigest', err)
      stats.errors++
    }

    logger.info('TeacherMissingDocumentsDigestService.runWeeklyDigest completed', { ...stats })
    return stats
  }

  private async sendDigestEmail(
    recipient: string,
    orgName: string,
    teacherSummaries: { teacherName: string; labels: string[] }[]
  ) {
    const dashboardUrl = `${APP_URLS.getBaseUrl()}/dashboard/formateurs`
    const totalMissing = teacherSummaries.reduce((acc, t) => acc + t.labels.length, 0)
    const subject = `📋 ${totalMissing} document${totalMissing > 1 ? 's' : ''} manquant${totalMissing > 1 ? 's' : ''} — ${teacherSummaries.length} formateur${teacherSummaries.length > 1 ? 's' : ''}`

    if (!this.resend) {
      logger.info('TeacherMissingDocumentsDigestService: mode test (RESEND_API_KEY absente)', { recipient: maskEmail(recipient) })
      return
    }

    const rowsHtml = teacherSummaries
      .map(t => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:600;">${t.teacherName}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">${t.labels.join(', ')}</td>
        </tr>
      `)
      .join('')

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
        <tr>
          <td style="background:#274472;border-radius:12px 12px 0 0;padding:24px 32px;">
            <span style="color:white;font-size:20px;font-weight:700;">eduzen</span>
            <span style="color:rgba(255,255,255,0.7);font-size:13px;margin-left:8px;">Récapitulatif hebdomadaire — Formateurs</span>
          </td>
        </tr>
        <tr>
          <td style="background:white;padding:28px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
              Pour <strong>${orgName}</strong>, ${teacherSummaries.length} formateur${teacherSummaries.length > 1 ? 's ont' : ' a'} au moins un document de conformité jamais déposé :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:0 0 24px;">
              <tr style="background:#f9fafb;">
                <td style="padding:8px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Formateur</td>
                <td style="padding:8px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Documents manquants</td>
              </tr>
              ${rowsHtml}
            </table>
            <a href="${dashboardUrl}" style="display:inline-block;background:#274472;color:white;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">Voir le dashboard Formateurs</a>
            <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
              Ce récapitulatif est envoyé chaque semaine tant que des documents manquent. Une relance ponctuelle peut aussi être envoyée depuis le dashboard.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">Envoyé automatiquement par EDUZEN · © ${new Date().getFullYear()}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

    const { error } = await this.resend.emails.send({
      from: EMAIL_CONFIG.getFromEmail(),
      to: recipient,
      subject,
      html,
    })
    if (error) throw error
  }
}
