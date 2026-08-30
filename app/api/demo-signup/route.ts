import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { filterXSS } from 'xss'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { buildDemoTrialUnlockedEmail } from '@/lib/emails/onboarding-emails'
import { withDistributedRateLimit } from '@/lib/utils/rate-limiter-distributed'
import { logger } from '@/lib/utils/logger'

const TRIAL_DAYS = 14
const DEFAULT_PLAN_NAME = 'Pro'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 20; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd + '!1Aa'
}

export async function POST(request: NextRequest) {
  return withDistributedRateLimit(request, 'auth', async (req) => {
    try {
      const body = await req.json()
      const { prenom, nom, email, organisme, website } = body

      // Honeypot : un bot qui remplit ce champ caché reçoit une réponse de
      // succès sans qu'aucune écriture n'ait lieu, pour ne pas révéler le piège.
      if (typeof website === 'string' && website.trim().length > 0) {
        return NextResponse.json({ success: true, status: 'new_account' })
      }

      if (!prenom || !nom || !email || !organisme) {
        return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 })
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
      }

      const cleanPrenom = filterXSS(String(prenom).trim().slice(0, 100))
      const cleanNom = filterXSS(String(nom).trim().slice(0, 100))
      const cleanOrganisme = filterXSS(String(organisme).trim().slice(0, 200))
      const cleanEmail = String(email).trim().toLowerCase().slice(0, 200)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.eduzen.io'
      const supabaseAdmin = createAdminClient()

      // Écriture CRM non bloquante — enregistrée dans les deux branches
      // (nouveau compte ou compte déjà existant).
      const insertDemoLead = async () => {
        const { error } = await (supabaseAdmin as any).from('demo_leads').insert({
          first_name: cleanPrenom,
          last_name: cleanNom,
          company: cleanOrganisme,
          email: cleanEmail,
          phone: null,
          message: null,
        })
        if (error) logger.error('[demo-signup] demo_leads insert error:', error)
      }

      // Créer le compte (email confirmé immédiatement, mot de passe aléatoire
      // jamais communiqué — l'utilisateur en définit un via le lien de récupération)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        password: generatePassword(),
        user_metadata: {
          full_name: `${cleanPrenom} ${cleanNom}`,
          first_name: cleanPrenom,
          last_name: cleanNom,
          organization_name: cleanOrganisme,
          onboarding_source: 'demo_page',
        },
      })

      if (authError) {
        const msg = authError.message?.toLowerCase() ?? ''
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already exists')) {
          await insertDemoLead()
          return NextResponse.json({ success: true, status: 'existing_account' })
        }
        logger.error('[demo-signup] createUser error:', authError)
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }

      if (!authData.user) {
        return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
      }

      const userId = authData.user.id

      // Créer l'organisation — pays/fuseau France (contrairement aux defaults
      // Sénégal de la RPC, hérités d'un autre parcours d'inscription)
      // Suffixe aléatoire systématique (pas seulement en secours si la chaîne
      // est vide) : deux organismes au nom proche — ou un même nom testé
      // deux fois — produiraient sinon le même code et percuteraient la
      // contrainte unique organizations_code_key.
      const orgCodeBase = cleanOrganisme.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'OF'
      const orgCode = `${orgCodeBase}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      let orgId: string | null = null

      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        'create_organization_for_user' as never,
        {
          org_name: cleanOrganisme,
          org_code: orgCode,
          org_type: 'primary',
          org_country: 'FR',
          org_currency: 'EUR',
          org_language: 'fr',
          org_timezone: 'Europe/Paris',
          user_id: userId,
        } as never
      )

      if (!rpcError && rpcResult) {
        orgId = rpcResult as string
      } else {
        const { data: orgData, error: orgInsertError } = await supabaseAdmin
          .from('organizations')
          .insert({
            name: cleanOrganisme,
            code: orgCode,
            type: 'primary',
            country: 'FR',
            currency: 'EUR',
            language: 'fr',
            timezone: 'Europe/Paris',
            subscription_tier: 'free',
            subscription_status: 'active',
            settings: {},
          })
          .select('id')
          .single()

        if (orgInsertError || !orgData) {
          logger.error('[demo-signup] Org creation error:', orgInsertError)
          // Ne pas laisser un utilisateur auth orphelin sans organisation
          await supabaseAdmin.auth.admin.deleteUser(userId)
          return NextResponse.json({ error: 'Erreur lors de la création de votre espace.' }, { status: 500 })
        }
        orgId = orgData.id
      }

      // Abonnement d'essai 14 jours (best-effort : un échec ici ne doit pas
      // faire échouer la création du compte, déjà actée à ce stade)
      const trialStartAt = new Date()
      const trialEndAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

      const { data: defaultPlan } = await supabaseAdmin
        .from('plans')
        .select('id')
        .eq('name', DEFAULT_PLAN_NAME)
        .single()

      if (defaultPlan?.id) {
        const { error: orgUpdateError } = await supabaseAdmin
          .from('organizations')
          .update({ subscription_status: 'active', updated_at: new Date().toISOString() })
          .eq('id', orgId!)
        if (orgUpdateError) logger.error('[demo-signup] org subscription_status update error:', orgUpdateError)

        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            organization_id: orgId!,
            plan_id: defaultPlan.id,
            status: 'trialing',
            trial_start_at: trialStartAt.toISOString(),
            trial_end_at: trialEndAt.toISOString(),
            current_period_start: trialStartAt.toISOString(),
            current_period_end: trialEndAt.toISOString(),
            stripe_customer_id: null,
            stripe_subscription_id: null,
            payment_method_id: null,
          }, { onConflict: 'organization_id' })
        if (subError) logger.error('[demo-signup] subscription upsert error:', subError)
      } else {
        logger.error(`[demo-signup] Default plan "${DEFAULT_PLAN_NAME}" not found — trial subscription not created`)
      }

      // Profil public.users
      const { error: userInsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          organization_id: orgId!,
          email: cleanEmail,
          full_name: `${cleanPrenom} ${cleanNom}`,
          first_name: cleanPrenom,
          last_name: cleanNom,
          role: 'admin',
          is_active: true,
          onboarding_source: 'demo_page',
        } as never, { onConflict: 'id' })

      if (userInsertError) {
        logger.error('[demo-signup] User profile creation error:', userInsertError)
      }

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: `${cleanPrenom} ${cleanNom}`,
          first_name: cleanPrenom,
          last_name: cleanNom,
          organization_name: cleanOrganisme,
          organization_id: orgId,
          onboarding_source: 'demo_page',
        },
      })

      await insertDemoLead()

      // Lien de récupération (définition du mot de passe) — sans passer par
      // l'auto-email Supabase, pour garder le contrôle total du contenu envoyé.
      const { data: recoveryData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: cleanEmail,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/auth/reset-password?mode=setup')}`,
        },
      })

      const actionLink = recoveryData?.properties?.action_link

      sendEmailViaResend({
        to: cleanEmail,
        subject: `${cleanPrenom}, votre essai gratuit de 14 jours est prêt`,
        html: buildDemoTrialUnlockedEmail({ firstName: cleanPrenom, actionLink }),
      }).catch(err => logger.error('[demo-signup] Error sending welcome email:', err))

      return NextResponse.json({ success: true, status: 'new_account' })
    } catch (error) {
      logger.error('[demo-signup] Unexpected error:', error)
      return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
    }
  })
}
