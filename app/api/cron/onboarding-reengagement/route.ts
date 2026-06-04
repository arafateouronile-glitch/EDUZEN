/**
 * GET /api/cron/onboarding-reengagement
 * Tourne chaque jour à 10h. Envoie un email aux utilisateurs en essai
 * qui ne se sont pas connectés depuis 4+ jours.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'

const FROM = 'Airtone NILE — EduZen <contact@eduzen.io>'
const REPLY_TO = 'contact@eduzen.io'

function firstName(fullName: string | null, email: string | null): string {
  return fullName?.trim().split(/\s+/)[0] || email?.split('@')[0] || 'vous'
}

function buildReengagementEmail(prenom: string): string {
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

            <p style="margin:0 0 20px;">On ne vous a plus vu sur EduZen depuis quelques jours — je voulais juste m'assurer que tout allait bien.</p>

            <p style="margin:0 0 20px;">Est-ce qu'il y a quelque chose qui vous a bloqué ? Un problème technique, une fonctionnalité pas claire, ou simplement le manque de temps ?</p>

            <p style="margin:0 0 20px;">Si vous avez 10 minutes cette semaine, je vous propose qu'on se parle. Je peux vous montrer en direct comment configurer EduZen pour qu'il corresponde exactement à votre façon de travailler. Beaucoup de nos clients ont eu le déclic lors de ce type d'appel.</p>

            <p style="margin:0 0 20px;">Répondez à cet email avec vos disponibilités, ou appelez-moi directement au <a href="tel:+33610441324" style="color:#1a1a1a;">06 10 44 13 24</a>.</p>

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

  // Utilisateurs dont le last_login_at est entre 4 et 5 jours (fenêtre 24h pour éviter les doublons)
  const loginCutoffOld = new Date(now.getTime() - 5 * 24 * 60 * 60_000).toISOString()
  const loginCutoffNew = new Date(now.getTime() - 4 * 24 * 60 * 60_000).toISOString()

  // Seulement les comptes créés il y a moins de 14 jours (pendant l'essai)
  const trialStart = new Date(now.getTime() - 14 * 24 * 60 * 60_000).toISOString()

  const { data: users, error } = await supabase
    .from('users')
    .select('email, full_name, last_login_at, created_at')
    .eq('role', 'admin')
    .eq('is_active', true)
    .gte('created_at', trialStart)
    .gte('last_login_at', loginCutoffOld)
    .lt('last_login_at', loginCutoffNew)

  if (error) {
    logger.error('[onboarding-reengagement] DB error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let errors = 0

  for (const u of users ?? []) {
    if (!u.email) continue

    const prenom = firstName(u.full_name, u.email)
    const result = await sendEmailViaResend({
      to: u.email,
      from: FROM,
      replyTo: REPLY_TO,
      subject: `${prenom}, on ne vous a plus vu sur EduZen`,
      html: buildReengagementEmail(prenom),
    })

    if (result.success) {
      sent++
      logger.info('[onboarding-reengagement] Email sent', { email: u.email })
    } else {
      errors++
    }
  }

  logger.info('[onboarding-reengagement] Done', { sent, errors })
  return NextResponse.json({ success: true, sent, errors })
}
