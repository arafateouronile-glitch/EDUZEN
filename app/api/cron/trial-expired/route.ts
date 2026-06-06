/**
 * GET /api/cron/trial-expired
 * Tourne chaque jour à 11h. Gère trois fenêtres post-expiration :
 * - J+1 après expiry : "votre essai vient de se terminer"
 * - J+3 après expiry : "vous avez encore accès à tout"
 * - J+7 après expiry : dernière relance win-back
 *
 * Ne cible que les orgs encore en statut 'trialing' (non converties).
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

function buildExpiredEmail(prenom: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">
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
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildWinBackJ3Email(prenom: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">
          <p style="margin:0 0 20px;">Bonjour ${prenom},</p>
          <p style="margin:0 0 20px;">C'est Airtone. Votre essai s'est terminé il y a quelques jours — je voulais vous donner un dernier coup de main avant que vous preniez votre décision.</p>
          <p style="margin:0 0 20px;">Si vous n'avez pas eu le temps de tout tester, je vous propose 30 minutes ensemble pour faire une démonstration personnalisée sur votre propre compte. Vous repartez avec EduZen configuré pour votre organisme, prêt à générer vos premiers documents.</p>
          <p style="margin:0 0 20px;text-align:center;">
            <a href="https://calendly.com/airtonenile/30min" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">📅 Réserver 30 minutes →</a>
          </p>
          <p style="margin:0 0 20px;">Ou si vous êtes prêt à reprendre :</p>
          <p style="margin:0 0 28px;text-align:center;">
            <a href="${APP_URL}/dashboard/subscribe" style="display:inline-block;background:#274472;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:6px;">Reprendre mon compte →</a>
          </p>
          <p style="margin:0 0 40px;">À bientôt,</p>
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
            Airtone NILE<br>
            <span style="font-size:14px;color:#555;">Fondateur, EduZen</span><br>
            <span style="font-size:14px;color:#555;"><a href="tel:+33610441324" style="color:#555;text-decoration:none;">06 10 44 13 24</a> · <a href="https://www.eduzen.io" style="color:#555;text-decoration:none;">eduzen.io</a></span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildWinBackJ7Email(prenom: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">
          <p style="margin:0 0 20px;">Bonjour ${prenom},</p>
          <p style="margin:0 0 20px;">Je vous écris une dernière fois.</p>
          <p style="margin:0 0 20px;">Votre essai EduZen est terminé depuis une semaine. Je ne vais pas vous relancer après ce message — mais avant de partir définitivement, je voulais vous poser une question directe : qu'est-ce qui vous a retenu ?</p>
          <p style="margin:0 0 20px;">Le prix ? Une fonctionnalité manquante ? Le manque de temps pour tout configurer ? Votre retour m'aide vraiment à améliorer le produit pour les prochains organismes.</p>
          <p style="margin:0 0 20px;">Et si c'est juste une question de timing — votre compte est toujours là si vous changez d'avis.</p>
          <p style="margin:0 0 20px;text-align:center;">
            <a href="https://calendly.com/airtonenile/30min" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">📅 Réserver 30 minutes →</a>
          </p>
          <p style="margin:0 0 20px;">Ou directement :</p>
          <p style="margin:0 0 28px;text-align:center;">
            <a href="${APP_URL}/dashboard/subscribe" style="display:inline-block;background:#274472;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:6px;">Revenir sur EduZen →</a>
          </p>
          <p style="margin:0 0 40px;">Merci pour votre temps,</p>
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
            Airtone NILE<br>
            <span style="font-size:14px;color:#555;">Fondateur, EduZen</span><br>
            <span style="font-size:14px;color:#555;"><a href="tel:+33610441324" style="color:#555;text-decoration:none;">06 10 44 13 24</a> · <a href="https://www.eduzen.io" style="color:#555;text-decoration:none;">eduzen.io</a></span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

type Window = {
  daysAfterExpiry: number
  label: string
  subject: (prenom: string) => string
  html: (prenom: string) => string
}

const WINDOWS: Window[] = [
  {
    daysAfterExpiry: 1,
    label: 'expired+1',
    subject: (p) => `${p}, votre essai EduZen est terminé`,
    html: buildExpiredEmail,
  },
  {
    daysAfterExpiry: 3,
    label: 'expired+3',
    subject: (p) => `${p}, 20 minutes pour tout configurer ensemble`,
    html: buildWinBackJ3Email,
  },
  {
    daysAfterExpiry: 7,
    label: 'expired+7',
    subject: (p) => `${p}, une dernière question avant de partir`,
    html: buildWinBackJ7Email,
  },
]

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const results: Record<string, { sent: number; errors: number }> = {}

  for (const window of WINDOWS) {
    const windowStart = new Date(now.getTime() - (window.daysAfterExpiry + 1) * 24 * 60 * 60_000).toISOString()
    const windowEnd   = new Date(now.getTime() - window.daysAfterExpiry * 24 * 60 * 60_000).toISOString()

    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('status', 'trialing')
      .gte('trial_end_at', windowStart)
      .lt('trial_end_at', windowEnd)

    if (error) {
      logger.error(`[trial-expired] ${window.label} DB error`, error)
      results[window.label] = { sent: 0, errors: 1 }
      continue
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
        subject: window.subject(prenom),
        html: window.html(prenom),
      })

      if (result.success) {
        sent++
        logger.info(`[trial-expired] ${window.label} sent`, { orgId: sub.organization_id, email: admin.email })
      } else {
        errors++
        logger.error(`[trial-expired] ${window.label} failed`, { orgId: sub.organization_id, error: result.error })
      }
    }

    results[window.label] = { sent, errors }
  }

  logger.info('[trial-expired] Done', results)
  return NextResponse.json({ success: true, results })
}
