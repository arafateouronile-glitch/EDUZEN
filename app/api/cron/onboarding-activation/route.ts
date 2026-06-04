/**
 * GET /api/cron/onboarding-activation
 * Tourne chaque jour à 9h. Envoie des emails d'activation conditionnels :
 * - J+3 : si l'org n'a aucun programme → "créez votre premier programme"
 * - J+5 : si l'org a des programmes mais aucune session → "il manque la session"
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

function buildNoProgramEmail(prenom: string): string {
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

            <p style="margin:0 0 20px;">Je vois que vous n'avez pas encore créé votre premier programme de formation.</p>

            <p style="margin:0 0 20px;">C'est la première chose à faire — et c'est plus simple que ça en a l'air. Un programme, c'est juste un titre, une durée et un objectif. Ça prend 2 minutes.</p>

            <p style="margin:0 0 20px;">Une fois le programme créé, vous pouvez y rattacher une formation, puis planifier une session. C'est à partir de là que tout le reste d'EduZen prend son sens : les conventions, les émargements, les attestations — tout se génère automatiquement.</p>

            <p style="margin:0 0 20px;">Si vous voulez, <strong>demandez à Jeane</strong> depuis votre tableau de bord — elle peut créer votre premier programme en quelques secondes.</p>

            <p style="margin:0 0 20px;">Ou répondez à cet email si vous préférez qu'on le fasse ensemble.</p>

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

function buildNoSessionEmail(prenom: string): string {
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

            <p style="margin:0 0 20px;">Vous avez créé votre programme — c'est le plus dur de fait.</p>

            <p style="margin:0 0 20px;">Il manque juste une étape : créer votre première session. C'est là que tout devient concret. Une session, c'est une date, un lieu, et vos apprenants. Une fois créée, EduZen peut générer vos conventions de formation, lancer les émargements numériques et suivre la présence automatiquement.</p>

            <p style="margin:0 0 20px;">Ça prend moins de 3 minutes. Et si vous voulez de l'aide, <strong>Jeane</strong> peut le faire pour vous depuis votre tableau de bord.</p>

            <p style="margin:0 0 20px;">Répondez à cet email si vous avez des questions.</p>

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

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const sent = { noProgram: 0, noSession: 0, errors: 0 }

  // Fenêtre J+3 : orgs créées il y a entre 3 et 4 jours
  const j3Start = new Date(now.getTime() - 4 * 24 * 60 * 60_000).toISOString()
  const j3End   = new Date(now.getTime() - 3 * 24 * 60 * 60_000).toISOString()

  // Fenêtre J+5 : orgs créées il y a entre 5 et 6 jours
  const j5Start = new Date(now.getTime() - 6 * 24 * 60 * 60_000).toISOString()
  const j5End   = new Date(now.getTime() - 5 * 24 * 60 * 60_000).toISOString()

  // ── J+3 : pas de programme ──────────────────────────────────────────────────
  const { data: j3Orgs } = await supabase
    .from('organizations')
    .select('id, created_at')
    .gte('created_at', j3Start)
    .lt('created_at', j3End)

  for (const org of j3Orgs ?? []) {
    const { count } = await supabase
      .from('programs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)

    if ((count ?? 0) > 0) continue

    // Récupérer l'admin de l'org
    const { data: admin } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('organization_id', org.id)
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
      subject: `${prenom}, vous n'avez pas encore créé votre premier programme`,
      html: buildNoProgramEmail(prenom),
    })

    if (result.success) {
      sent.noProgram++
      logger.info('[onboarding-activation] J+3 email sent', { orgId: org.id, email: admin.email })
    } else {
      sent.errors++
    }
  }

  // ── J+5 : a des programmes mais aucune session ──────────────────────────────
  const { data: j5Orgs } = await supabase
    .from('organizations')
    .select('id, created_at')
    .gte('created_at', j5Start)
    .lt('created_at', j5End)

  for (const org of j5Orgs ?? []) {
    const { count: programCount } = await supabase
      .from('programs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)

    if ((programCount ?? 0) === 0) continue // déjà ciblé en J+3

    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)

    if ((sessionCount ?? 0) > 0) continue

    const { data: admin } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('organization_id', org.id)
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
      subject: `${prenom}, il vous manque juste une session pour démarrer`,
      html: buildNoSessionEmail(prenom),
    })

    if (result.success) {
      sent.noSession++
      logger.info('[onboarding-activation] J+5 email sent', { orgId: org.id, email: admin.email })
    } else {
      sent.errors++
    }
  }

  logger.info('[onboarding-activation] Done', sent)
  return NextResponse.json({ success: true, sent })
}
