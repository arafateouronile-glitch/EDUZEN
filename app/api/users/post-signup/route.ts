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

// POST /api/users/post-signup
// Appelé une fois après l'inscription pour : seeder les templates + planifier l'email fondateur
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

    // Email fondateur planifié 15 min après inscription
    const scheduledAt = new Date(Date.now() + 15 * 60_000).toISOString()
    sendEmailViaResend({
      to: email ?? user.email ?? '',
      from: 'Airtone NILE — EduZen <contact@eduzen.io>',
      replyTo: 'contact@eduzen.io',
      subject: `${prenom}, bienvenue dans l'écosystème EduZen 👋`,
      html: buildFounderWelcomeEmail({ prenom, organisme: orgName }),
      scheduledAt,
    }).catch(err => logger.error('[post-signup] Error scheduling founder email:', err))

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[post-signup] Unexpected error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
