/**
 * GET /api/cron/onboarding-reengagement
 * Tourne chaque jour à 10h. Envoie un email aux admins en essai
 * qui ne se sont pas connectés depuis 2, 4 ou 7 jours.
 *
 * Chaque fenêtre est mutuellement exclusive (plage 24h).
 * Ne cible pas les orgs qui ont déjà converti.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'
import { firstName } from '@/lib/emails/onboarding-emails'

const FROM = 'Airtone NILE — EduZen <contact@eduzen.io>'
const REPLY_TO = 'contact@eduzen.io'

function buildJ2Email(prenom: string): string {
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
            <p style="margin:0 0 20px;">C'est Airtone. Je vois que vous n'êtes pas revenu sur EduZen depuis votre inscription — je voulais juste m'assurer que tout s'était bien passé.</p>
            <p style="margin:0 0 20px;">Est-ce qu'il y a eu un problème au démarrage ? Parfois la configuration initiale peut sembler intimidante, mais ça prend vraiment 5 minutes une fois qu'on sait par où commencer.</p>
            <p style="margin:0 0 20px;">Si vous voulez, <strong>demandez à Jeane</strong> depuis votre tableau de bord — elle peut créer votre premier programme, votre formation et votre session en quelques secondes, sans que vous ayez à faire quoi que ce soit.</p>
            <p style="margin:0 0 20px;">Répondez à cet email si vous avez des questions. Je réponds personnellement.</p>
            <p style="margin:0 0 40px;">À bientôt,</p>
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

function buildJ4Email(prenom: string): string {
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
            <p style="margin:0 0 20px;">Je vous propose qu'on se parle 30 minutes. Je peux vous montrer en direct comment configurer EduZen pour votre organisme — beaucoup de clients ont eu le déclic lors de ce type d'appel.</p>
            <p style="margin:0 0 20px;text-align:center;">
              <a href="https://calendly.com/airtonenile/30min" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">📅 Réserver 30 minutes →</a>
            </p>
            <p style="margin:0 0 20px;">Ou répondez à cet email — je m'adapte à votre agenda.</p>
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

function buildJ7Email(prenom: string): string {
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
            <p style="margin:0 0 20px;">Ça fait une semaine que vous n'êtes pas revenu sur EduZen. Je ne vais pas tourner autour du pot : est-ce qu'il y a quelque chose qui ne correspond pas à ce que vous attendiez ?</p>
            <p style="margin:0 0 20px;">Si c'est le cas, je préfère le savoir maintenant plutôt qu'après. Votre retour m'aide à améliorer le produit, et peut-être qu'ensemble on peut trouver une façon dont EduZen peut vraiment vous être utile.</p>
            <p style="margin:0 0 20px;">Il vous reste encore du temps sur votre essai. Appelez-moi directement au <a href="tel:+33610441324" style="color:#1a1a1a;">06 10 44 13 24</a> ou répondez à cet email — je m'adapte à votre agenda.</p>
            <p style="margin:0 0 40px;">Honnêtement,</p>
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

type Window = {
  daysInactive: number
  label: string
  subject: (prenom: string) => string
  html: (prenom: string) => string
}

// J+7 supprimé — couvert par onboarding-sequence (mi-essai)
// J+2 uniquement pour les users qui sont revenus au moins une fois après signup
// J+4 reste — tombe entre J+2 et J+7 séquence, aucun overlap
const WINDOWS: Window[] = [
  {
    daysInactive: 2,
    label: 'J+2',
    subject: (p) => `${p}, tout s'est bien passé ?`,
    html: buildJ2Email,
  },
  {
    daysInactive: 4,
    label: 'J+4',
    subject: (p) => `${p}, on ne vous a plus vu sur EduZen`,
    html: buildJ4Email,
  },
]

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const trialStart = new Date(now.getTime() - 14 * 24 * 60 * 60_000).toISOString()
  const results: Record<string, { sent: number; errors: number }> = {}

  for (const window of WINDOWS) {
    const loginCutoffOld = new Date(now.getTime() - (window.daysInactive + 1) * 24 * 60 * 60_000).toISOString()
    const loginCutoffNew = new Date(now.getTime() - window.daysInactive * 24 * 60 * 60_000).toISOString()

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, organization_id, created_at, last_login_at')
      .eq('role', 'admin')
      .eq('is_active', true)
      .gte('created_at', trialStart)
      .gte('last_login_at', loginCutoffOld)
      .lt('last_login_at', loginCutoffNew)

    if (error) {
      logger.error(`[onboarding-reengagement] ${window.label} DB error`, error)
      results[window.label] = { sent: 0, errors: 1 }
      continue
    }

    let sent = 0, errors = 0

    const FOUR_HOURS_MS = 4 * 60 * 60_000

    for (const u of users ?? []) {
      if (!u.email) continue

      // J+2 : exclure les users qui n'ont jamais rouvert l'app après signup
      // (last_login ≈ created_at → déjà couverts par onboarding-sequence J+2)
      if (window.daysInactive === 2 && u.created_at && u.last_login_at) {
        const gap = new Date(u.last_login_at).getTime() - new Date(u.created_at).getTime()
        if (gap < FOUR_HOURS_MS) continue
      }

      // Ne pas envoyer si l'org a déjà converti
      if (u.organization_id) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('organization_id', u.organization_id)
          .maybeSingle()

        if (sub && sub.status !== 'trialing') continue
      }

      const prenom = firstName(u.full_name, u.email)
      const result = await sendEmailViaResend({
        to: u.email,
        from: FROM,
        replyTo: REPLY_TO,
        subject: window.subject(prenom),
        html: window.html(prenom),
      })

      if (result.success) {
        sent++
        logger.info(`[onboarding-reengagement] ${window.label} sent`, { email: u.email })
      } else {
        errors++
        logger.error(`[onboarding-reengagement] ${window.label} failed`, { email: u.email, error: result.error })
      }
    }

    results[window.label] = { sent, errors }
  }

  logger.info('[onboarding-reengagement] Done', results)
  return NextResponse.json({ success: true, results })
}
