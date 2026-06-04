import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedDefaultTemplatesForOrg } from '@/lib/utils/seed-default-templates'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'

function buildFounderWelcomeEmail({ prenom, organisme }: { prenom: string; organisme: string }): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Bienvenue sur EduZen</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${prenom},</p>

            <p style="margin:0 0 20px;">Je suis Airtone, fondateur d'EduZen. Je voulais vous écrire personnellement pour vous souhaiter la bienvenue — je suis vraiment content que vous ayez rejoint l'écosystème.</p>

            <p style="margin:0 0 20px;">Pour bien démarrer, voici ce que je vous recommande de faire en premier :</p>

            <p style="margin:0 0 12px;">1. <strong>Configurez votre organisme</strong> dans les réglages — logo, adresse, NDA, coordonnées. Ces infos s'afficheront automatiquement sur tous vos documents.</p>

            <p style="margin:0 0 12px;">2. <strong>Créez un programme</strong>, puis une formation, puis une session. C'est dans cet ordre que ça fonctionne.</p>

            <p style="margin:0 0 20px;">3. Si vous voulez aller plus vite, <strong>demandez à Jeane</strong> — notre assistante IA — de tout créer pour vous directement depuis le tableau de bord.</p>

            <p style="margin:0 0 20px;">Et si vous êtes bloqué ou que vous avez besoin d'aide sur quoi que ce soit, répondez directement à cet email ou appelez-moi au <a href="tel:+33610441324" style="color:#1a1a1a;">06 10 44 13 24</a>. Je réponds personnellement.</p>

            <p style="margin:0 0 40px;">Belle aventure avec EduZen,</p>

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

function buildCheckInEmail({ prenom }: { prenom: string }): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Comment ça se passe ?</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${prenom},</p>

            <p style="margin:0 0 20px;">C'est Airtone. Ça fait maintenant 48 heures que vous avez rejoint EduZen — je voulais juste prendre de vos nouvelles.</p>

            <p style="margin:0 0 20px;">Est-ce que tout se passe bien ? Avez-vous réussi à configurer votre organisme et à créer vos premières formations ?</p>

            <p style="margin:0 0 20px;">Si vous avez des questions, si quelque chose bloque, ou si vous voulez juste vous assurer que vous tirez le meilleur parti de l'application pour votre organisme — je vous propose qu'on prenne <strong>10 minutes ensemble</strong>.</p>

            <p style="margin:0 0 20px;">Pas de présentation, pas de démo. Juste un appel rapide pour débloquer ce dont vous avez besoin et vous montrer ce qui peut vraiment faire la différence pour vous.</p>

            <p style="margin:0 0 20px;">Répondez simplement à cet email avec vos disponibilités, et je m'adapte à votre agenda.</p>

            <p style="margin:0 0 40px;">À très vite,</p>

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

function buildMidTrialEmail({ prenom }: { prenom: string }): string {
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

            <p style="margin:0 0 20px;">Votre essai EduZen a une semaine — vous êtes à mi-parcours.</p>

            <p style="margin:0 0 20px;">Est-ce que vous avez eu le temps de créer votre premier programme et vos sessions ? Si ce n'est pas encore fait, c'est le bon moment.</p>

            <p style="margin:0 0 20px;">Les organismes qui tirent le plus de valeur d'EduZen dans les premières semaines sont ceux qui ont au moins un programme complet avec une session active. À partir de là, la génération de documents, les émargements et le suivi Qualiopi deviennent naturels.</p>

            <p style="margin:0 0 20px;">Si quelque chose bloque ou si vous avez des questions, répondez à cet email — je lis tous les messages personnellement.</p>

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

function buildTrialEndingSoonEmail({ prenom }: { prenom: string }): string {
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

            <p style="margin:0 0 20px;">Votre essai gratuit se termine dans 3 jours.</p>

            <p style="margin:0 0 20px;">Est-ce qu'EduZen vous a été utile ? Est-ce qu'il y a quelque chose qui n'a pas fonctionné comme prévu, ou une fonctionnalité que vous n'avez pas eu le temps de tester ?</p>

            <p style="margin:0 0 20px;">Si vous avez des doutes sur la suite, répondez à cet email et dites-moi ce qui vous retient. Je préfère qu'on en parle avant que vous partiez plutôt qu'après.</p>

            <p style="margin:0 0 20px;">Et si vous êtes prêt à continuer, vous pouvez choisir votre formule directement depuis votre tableau de bord.</p>

            <p style="margin:0 0 40px;">À très vite,</p>

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

function buildTrialLastDayEmail({ prenom }: { prenom: string }): string {
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

            <p style="margin:0 0 20px;">Votre essai se termine demain.</p>

            <p style="margin:0 0 20px;">Je voulais vous écrire une dernière fois avant la fin pour vous proposer quelque chose de concret : si vous avez 10 minutes cette semaine, je vous appelle personnellement pour faire le point — voir ce qui a marché, ce qui n'a pas marché, et comment EduZen peut vraiment s'adapter à votre façon de travailler.</p>

            <p style="margin:0 0 20px;">Pas de pression, pas de discours de vente. Juste un appel entre nous.</p>

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

// POST /api/users/post-signup
// Appelé une fois après l'inscription pour : seeder les templates + planifier les emails fondateur
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, email, full_name')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const { organization_id: orgId, email, full_name } = userData

    const { data: orgData } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const orgName = orgData?.name ?? 'votre organisme'
    const prenom = (full_name ?? email ?? '').split(' ')[0] || 'là'

    // Seeder les modèles de documents par défaut (non bloquant)
    seedDefaultTemplatesForOrg(supabase, orgId).catch(err =>
      logger.error('[post-signup] Error seeding templates:', err)
    )

    const recipient = email ?? user.email ?? ''
    const from = 'Airtone NILE — EduZen <contact@eduzen.io>'
    const replyTo = 'contact@eduzen.io'

    const schedule = (delayMs: number, subject: string, html: string) =>
      sendEmailViaResend({
        to: recipient, from, replyTo, subject, html,
        scheduledAt: new Date(Date.now() + delayMs).toISOString(),
      }).catch(err => logger.error(`[post-signup] Error scheduling "${subject}":`, err))

    const min = 60_000
    const h = 60 * min
    const d = 24 * h

    // J+0 15min — bienvenue + guide démarrage
    schedule(15 * min, `${prenom}, bienvenue dans l'écosystème EduZen 👋`, buildFounderWelcomeEmail({ prenom, organisme: orgName }))

    // J+2 — check-in + proposition de rendez-vous 10 min
    schedule(2 * d, `${prenom}, comment ça se passe ?`, buildCheckInEmail({ prenom }))

    // J+7 — mi-essai
    schedule(7 * d, `${prenom}, vous avez une semaine d'EduZen derrière vous`, buildMidTrialEmail({ prenom }))

    // J+11 — 3 jours restants
    schedule(11 * d, `Plus que 3 jours sur votre essai EduZen`, buildTrialEndingSoonEmail({ prenom }))

    // J+13 — dernier jour
    schedule(13 * d, `${prenom}, votre essai EduZen se termine demain`, buildTrialLastDayEmail({ prenom }))

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[post-signup] Unexpected error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
