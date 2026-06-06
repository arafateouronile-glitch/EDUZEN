/**
 * GET /api/cron/trial-expired
 * Tourne chaque jour à 11h. Envoie un email aux orgs dont le trial
 * a expiré dans les dernières 24h et qui n'ont pas encore converti.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'
import { firstName } from '@/lib/emails/onboarding-emails'

const FROM = 'Airtone NILE — EduZen <contact@eduzen.io>'
const REPLY_TO = 'contact@eduzen.io'
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.io').replace(/\/$/, '')

function buildTrialExpiredEmail(prenom: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${prenom},</p>

            <p style="margin:0 0 20px;">Votre essai gratuit EduZen vient de se terminer.</p>

            <p style="margin:0 0 20px;">Tout ce que vous avez configuré — votre organisme, vos programmes, vos modèles de documents — est encore là. Vous pouvez reprendre exactement là où vous en étiez.</p>

            <p style="margin:0 0 28px;">Pour continuer à utiliser EduZen :</p>

            <p style="margin:0 0 28px;text-align:center;">
              <a href="${APP_URL}/dashboard/subscribe" style="display:inline-block;background:#274472;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:6px;">Choisir ma formule →</a>
            </p>

            <p style="margin:0 0 20px;">Si vous avez des questions ou si quelque chose vous retient, répondez à cet email — je lis tous les messages personnellement.</p>

            <p style="margin:0 0 40px;">À bientôt j'espère,</p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              Airtone NILE<br>
              <span style="font-size:14px;color:#555;">Fondateur, EduZen</span><br>
              <span style="font-size:14px;color:#555;"><a href="tel:+33610441324" style="color:#555;text-decoration:none;">06 10 44 13 24</a> · <a href="https://www.eduzen.io" style="color:#555;text-decoration:none;">eduzen.io</a></span>
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - 2 * 24 * 60 * 60_000).toISOString()
  const windowEnd   = new Date(now.getTime() - 1 * 24 * 60 * 60_000).toISOString()

  // Orgs dont le trial a expiré dans les dernières 24-48h et toujours en trialing
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('status', 'trialing')
    .gte('trial_end_at', windowStart)
    .lt('trial_end_at', windowEnd)

  if (error) {
    logger.error('[trial-expired] DB error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0, errors = 0

  for (const sub of subs ?? []) {
    const { data: admin } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('organization_id', sub.organization_id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (!admin?.email) continue

    const prenom = firstName(admin.full_name, admin.email)
    const result = await sendEmailViaResend({
      to: admin.email,
      from: FROM,
      replyTo: REPLY_TO,
      subject: `${prenom}, votre essai EduZen est terminé`,
      html: buildTrialExpiredEmail(prenom),
    })

    if (result.success) {
      sent++
      logger.info('[trial-expired] Email sent', { orgId: sub.organization_id, email: admin.email })
    } else {
      errors++
      logger.error('[trial-expired] Email failed', { orgId: sub.organization_id, error: result.error })
    }
  }

  logger.info('[trial-expired] Done', { sent, errors })
  return NextResponse.json({ success: true, sent, errors })
}
