import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'

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
    ? `<a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#0052b4,#00b4d8);color:#ffffff;font-family:'DM Sans',Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;margin:8px 0;">Accéder à mon espace EduZen →</a>`
    : '<p style="color:#555;">Le lien de connexion n\'a pas pu être généré. Contactez le support.</p>'

  const passwordBtn = passwordUrl
    ? `<a href="${passwordUrl}" style="display:inline-block;background:#ffffff;color:#0052b4;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;border:2px solid #0052b4;margin:8px 0;">Définir mon mot de passe</a>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Bienvenue sur EduZen</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1628 0%,#0d2240 60%,#0a2a4a 100%);padding:40px 48px 36px;text-align:center;">
            <div style="font-family:'Syne',Arial,sans-serif;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
              Edu<span style="color:#00b4d8;">Zen</span>
            </div>
            <p style="color:#93c5fd;font-size:13px;margin:8px 0 0;letter-spacing:1px;text-transform:uppercase;">Plateforme de gestion d'organismes de formation</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:48px 48px 32px;">
            <h1 style="font-size:26px;font-weight:700;color:#0a1628;margin:0 0 16px;line-height:1.3;">
              Bienvenue, ${prenom}&nbsp;! 🎉
            </h1>
            <p style="font-size:16px;color:#4b5563;line-height:1.7;margin:0 0 8px;">
              Votre espace EduZen est prêt. Cliquez sur le bouton ci-dessous pour vous connecter directement et commencer la configuration de votre organisme de formation.
            </p>
            <p style="font-size:14px;color:#9ca3af;margin:0 0 32px;">Ce lien de connexion est à usage unique et valable 24&nbsp;heures.</p>

            <div style="text-align:center;margin:0 0 40px;">
              ${loginBtn}
            </div>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 36px;">
              <tr>
                <td style="border-top:1px solid #e5e7eb;"></td>
                <td style="padding:0 16px;white-space:nowrap;color:#9ca3af;font-size:13px;">ou</td>
                <td style="border-top:1px solid #e5e7eb;"></td>
              </tr>
            </table>

            <!-- Password section -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;margin:0 0 32px;">
              <tr>
                <td style="padding:28px 32px;">
                  <p style="font-size:17px;font-weight:700;color:#0052b4;margin:0 0 10px;">🔐 Définissez votre mot de passe</p>
                  <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px;">
                    Pour vous connecter à tout moment avec votre adresse email et un mot de passe de votre choix, cliquez sur le lien ci-dessous. Cela prend moins d'une minute.
                  </p>
                  <div style="text-align:center;">
                    ${passwordBtn}
                  </div>
                  <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;text-align:center;">
                    Ce lien est valable 24&nbsp;heures et n'est utilisable qu'une seule fois.
                  </p>
                </td>
              </tr>
            </table>

            <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0;">
              Si vous n'avez pas rempli ce formulaire, ignorez simplement cet email — aucun compte ne sera activé sans confirmation.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 48px;border-top:1px solid #e5e7eb;">
            <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;line-height:1.6;">
              EduZen — La plateforme tout-en-un pour les organismes de formation<br>
              <a href="https://www.eduzen.io" style="color:#0052b4;text-decoration:none;">www.eduzen.io</a>
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
        console.error('[vsl-signup] Org creation error:', orgInsertError)
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
      }, { onConflict: 'id' })

    if (userInsertError) {
      console.error('[vsl-signup] User profile creation error:', userInsertError)
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
    console.error('[vsl-signup] Unexpected error:', error)
    return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
  }
}
