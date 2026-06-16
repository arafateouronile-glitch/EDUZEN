import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 20; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd + '!1Aa'
}

function buildWelcomeEmail({
  prenom,
  loginUrl,
  passwordUrl,
}: {
  prenom: string
  loginUrl: string | undefined
  passwordUrl: string | undefined
}): string {
  const loginBtn = loginUrl
    ? `<a href="${loginUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Accéder à mon espace EduZen</a>`
    : '<p style="margin:0 0 20px;color:#555;">Le lien de connexion n\'a pas pu être généré. Contactez le support.</p>'

  const passwordBtn = passwordUrl
    ? `<a href="${passwordUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Définir mon mot de passe</a>`
    : ''

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

            <p style="margin:0 0 20px;">Votre espace EduZen est prêt. Cliquez sur le lien ci-dessous pour vous connecter directement et commencer la configuration de votre organisme de formation.</p>

            <p style="margin:0 0 8px;font-size:14px;color:#555;">Ce lien de connexion est à usage unique et valable 24 heures.</p>

            <p style="margin:0 0 32px;">
              ${loginBtn}
            </p>

            <p style="margin:0 0 20px;">Pour vous connecter à tout moment avec votre adresse email et un mot de passe de votre choix, vous pouvez également définir votre mot de passe ici :</p>

            <p style="margin:0 0 8px;">
              ${passwordBtn}
            </p>

            <p style="margin:0 0 20px;font-size:14px;color:#555;">Ce lien est valable 24 heures et n'est utilisable qu'une seule fois.</p>

            <p style="margin:0 0 20px;font-size:14px;color:#555;">Si vous n'avez pas rempli ce formulaire, ignorez simplement cet email — aucun compte ne sera activé sans confirmation.</p>

            <p style="margin:0 0 40px;">Bienvenue,</p>

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prenom, nom, email, telephone, organisme } = body

    if (!prenom || !nom || !email || !telephone || !organisme) {
      return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.eduzen.io'
    const supabaseAdmin = createAdminClient()

    // Créer l'utilisateur via admin (email confirmé immédiatement, pas d'auto-email Supabase)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: generatePassword(),
      user_metadata: {
        full_name: `${prenom} ${nom}`,
        first_name: prenom,
        last_name: nom,
        phone: telephone,
        organization_name: organisme,
        onboarding_source: 'vsl',
      },
    })

    if (authError) {
      const msg = authError.message?.toLowerCase() ?? ''
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already exists')) {
        return NextResponse.json(
          { error: 'Cette adresse email est déjà associée à un compte. Connectez-vous ou réinitialisez votre mot de passe.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
    }

    const userId = authData.user.id

    // Créer l'organisation
    const orgCode = organisme.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'OF' + Date.now().toString().slice(-4)
    let orgId: string | null = null

    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'create_organization_for_user' as never,
      {
        org_name: organisme,
        org_code: orgCode,
        org_type: 'primary',
        org_country: 'SN',
        org_currency: 'EUR',
        org_language: 'fr',
        org_timezone: 'Africa/Dakar',
        user_id: userId,
      } as never
    )

    if (!rpcError && rpcResult) {
      orgId = rpcResult as string
    } else {
      const { data: orgData, error: orgInsertError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: organisme,
          code: orgCode,
          type: 'primary',
          country: 'SN',
          currency: 'EUR',
          language: 'fr',
          timezone: 'Africa/Dakar',
          subscription_tier: 'free',
          subscription_status: 'active',
          settings: {},
        })
        .select('id')
        .single()

      if (orgInsertError || !orgData) {
        logger.error('[vsl-signup] Org creation error:', orgInsertError)
        return NextResponse.json({ error: 'Erreur lors de la création de votre espace.' }, { status: 500 })
      }
      orgId = orgData.id
    }

    // Créer le profil utilisateur
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        organization_id: orgId!,
        email,
        full_name: `${prenom} ${nom}`,
        first_name: prenom,
        last_name: nom,
        phone: telephone,
        role: 'admin',
        is_active: true,
        onboarding_source: 'vsl',
      } as never, { onConflict: 'id' })

    if (userInsertError) {
      logger.error('[vsl-signup] User profile creation error:', userInsertError)
    }

    // Stocker organization_id dans les métadonnées auth
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: `${prenom} ${nom}`,
        first_name: prenom,
        last_name: nom,
        phone: telephone,
        organization_name: organisme,
        organization_id: orgId,
        onboarding_source: 'vsl',
      },
    })

    // Générer le lien de connexion (magic link, usage unique)
    const { data: magicData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard/onboarding`,
      },
    })

    // Générer le lien de définition du mot de passe
    const { data: recoveryData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/auth/reset-password?mode=setup')}`,
      },
    })

    const loginUrl = magicData?.properties?.action_link
    const passwordUrl = recoveryData?.properties?.action_link

    // Envoyer l'email de bienvenue personnalisé via Resend
    await sendEmailViaResend({
      to: email,
      subject: `Bienvenue sur EduZen, ${prenom} — Votre espace est prêt`,
      html: buildWelcomeEmail({ prenom, loginUrl, passwordUrl }),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[vsl-signup] Unexpected error:', error)
    return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
  }
}
