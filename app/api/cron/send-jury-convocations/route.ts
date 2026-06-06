/**
 * GET /api/cron/send-jury-convocations
 *
 * CRON quotidien (ex. 08h00 chaque matin via Vercel Cron Jobs).
 *
 * Logique :
 *   Chercher toutes les entrées session_jury où :
 *     - La sessions.exam_date est dans exactement 14 jours (± 12h pour absorber le décalage d'exécution)
 *     - email_sent_at IS NULL (convocation pas encore envoyée)
 *   Pour chacune, envoyer l'email de convocation et mettre à jour email_sent_at.
 *
 * Sécurité : CRON_SECRET Bearer token (même pattern que les autres crons).
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withCronSecurity } from '@/lib/utils/cron-security'
import { logger } from '@/lib/utils/logger'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const CRON_SECRET  = process.env.CRON_SECRET
const ALLOWED_IPS  = process.env.CRON_ALLOWED_IPS?.split(',').map((ip) => ip.trim()) || []
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.io'

export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  }

  return withCronSecurity(
    request,
    async () => {
      const supabase = createAdminClient()

      // ── Fenêtre de J-14 (± 12h pour absorber les délais cron) ──────────────
      const now     = new Date()
      const target  = new Date(now)
      target.setDate(target.getDate() + 14)

      const windowStart = new Date(target)
      windowStart.setHours(0, 0, 0, 0)

      const windowEnd = new Date(target)
      windowEnd.setHours(23, 59, 59, 999)

      // ── Requête ─────────────────────────────────────────────────────────────
      const { data: entries, error: fetchError } = await supabase
        .from('session_jury')
        .select(`
          *,
          jury_members(*),
          sessions(
            id,
            name,
            start_date,
            end_date,
            exam_date,
            location,
            organization_id,
            organizations(name, email)
          )
        `)
        .is('email_sent_at', null)
        .gte('sessions.exam_date', windowStart.toISOString())
        .lte('sessions.exam_date', windowEnd.toISOString())

      if (fetchError) throw fetchError

      if (!entries || entries.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Aucune convocation à envoyer aujourd\'hui (J-14)',
          sent: 0,
          failed: 0,
        })
      }

      let sent   = 0
      let failed = 0
      const errors: string[] = []

      for (const sj of entries) {
        const juryMember    = sj.jury_members
        const session       = sj.sessions
        const organization  = session?.organizations

        if (!juryMember?.email || !session) {
          failed++
          errors.push(`session_jury ${sj.id} : données manquantes`)
          continue
        }

        try {
          // ── Construire les liens ─────────────────────────────────────────
          const confirmUrl = `${APP_URL}/api/jury/confirm?token=${sj.token}&action=confirm`
          const declineUrl = `${APP_URL}/api/jury/confirm?token=${sj.token}&action=decline`

          const formatDt = (dt: string | null) =>
            dt ? format(new Date(dt), 'd MMMM yyyy', { locale: fr }) : 'Non définie'

          const examDateStr = session.exam_date
            ? format(new Date(session.exam_date), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
            : 'Date à confirmer'

          const orgName = organization?.name || 'L\'organisme de formation'
          const subject = `[CONVOCATION] Jury d'examen — ${session.name}`

          const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Convocation — Jury d'examen</h1>
            <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">${orgName}</p>
          </td>
        </tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;">
            Bonjour <strong>${juryMember.first_name} ${juryMember.last_name}</strong>,
          </p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            Vous êtes convoqué(e) en tant que membre du jury pour l'examen de la session suivante :
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr>
                  <td style="color:#64748b;font-size:13px;width:140px;">Formation</td>
                  <td style="color:#1e293b;font-size:14px;font-weight:600;">${session.name}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px;">📅 Date d'examen</td>
                  <td style="color:#2563eb;font-size:14px;font-weight:700;">${examDateStr}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px;">Période session</td>
                  <td style="color:#1e293b;font-size:14px;">
                    ${formatDt(session.start_date)} → ${formatDt(session.end_date)}
                  </td>
                </tr>
                ${session.location ? `
                <tr>
                  <td style="color:#64748b;font-size:13px;">📍 Lieu</td>
                  <td style="color:#1e293b;font-size:14px;">${session.location}</td>
                </tr>` : ''}
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.6;">
            Merci de confirmer votre présence. <strong>Un seul clic suffit</strong>, aucun compte n'est nécessaire.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" align="center" style="padding-right:8px;">
                <a href="${confirmUrl}"
                  style="display:block;background:#16a34a;color:#fff;text-decoration:none;
                         padding:14px 24px;border-radius:8px;font-size:15px;font-weight:700;text-align:center;">
                  ✅ Je confirme ma présence
                </a>
              </td>
              <td width="48%" align="center" style="padding-left:8px;">
                <a href="${declineUrl}"
                  style="display:block;background:#dc2626;color:#fff;text-decoration:none;
                         padding:14px 24px;border-radius:8px;font-size:15px;font-weight:700;text-align:center;">
                  ❌ Je ne serai pas disponible
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:28px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
            Ce lien est personnel. En cas de problème, contactez ${orgName}.
          </p>
        </td></tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Envoyé par ${orgName} via <strong>EDUZEN</strong>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

          // ── Envoyer via Resend (client admin direct pour le cron) ──────────
          const RESEND_API_KEY = process.env.RESEND_API_KEY
          const FROM_EMAIL     = process.env.EMAIL_FROM || 'noreply@eduzen.io'

          if (RESEND_API_KEY) {
            const { Resend } = await import('resend')
            const resend = new Resend(RESEND_API_KEY)
            await resend.emails.send({
              from:    FROM_EMAIL,
              to:      juryMember.email,
              subject,
              html,
            })
          } else {
            // Mode développement
            logger.debug(`[cron/jury-convocations] DEV — email simulé`, { to: juryMember.email, subject })
          }

          // ── Mettre à jour email_sent_at + token_expires_at (J+7) ────────
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7)
          await supabase
            .from('session_jury')
            .update({
              email_sent_at:    new Date().toISOString(),
              token_expires_at: expiresAt.toISOString(),
            })
            .eq('id', sj.id)

          sent++
        } catch (err) {
          failed++
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`session_jury ${sj.id} (${juryMember.email}): ${msg}`)
          logger.error(`[cron/jury-convocations] Erreur pour ${juryMember.email}`, err instanceof Error ? err : new Error(String(err)))
        }
      }

      return NextResponse.json({
        success: true,
        sent,
        failed,
        total: entries.length,
        ...(errors.length > 0 && { errors }),
      })
    },
    {
      secret:     CRON_SECRET,
      allowedIPs: ALLOWED_IPS,
      requireSecret: true,
      logExecution:  true,
    }
  )
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
