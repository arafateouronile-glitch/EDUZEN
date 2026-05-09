import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 20; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd + '!1Aa'
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    // Client anon pour signUp (déclenche l'email de confirmation Supabase)
    const anonClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: authData, error: authError } = await anonClient.auth.signUp({
      email,
      password: generatePassword(),
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard/onboarding`,
        data: {
          full_name: `${prenom} ${nom}`,
          first_name: prenom,
          last_name: nom,
          phone: telephone,
          organization_name: organisme,
          onboarding_source: 'vsl',
        },
      },
    })

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered') || authError.message?.toLowerCase().includes('already been registered')) {
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
    const supabaseAdmin = createAdminClient()

    // Créer l'organisation (bypass RLS via service role)
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
      // Fallback : insertion directe
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
      // Non-bloquant : l'utilisateur peut toujours confirmer et continuer l'onboarding
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[vsl-signup] Unexpected error:', error)
    return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
  }
}
