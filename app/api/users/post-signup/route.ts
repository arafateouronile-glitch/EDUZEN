import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { seedDefaultTemplatesForOrg } from '@/lib/utils/seed-default-templates'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'
import { buildWelcomeEmail, firstName } from '@/lib/emails/onboarding-emails'
import { sendTikTokEvent, tiktokEventId } from '@/lib/utils/tiktok-capi'

// POST /api/users/post-signup
// Appelé une fois après l'inscription : seeder les templates + envoyer l'email de bienvenue immédiat.
// Les emails J+2 / J+7 / J+11 / J+13 sont gérés par le cron /api/cron/onboarding-sequence.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Lire organization_id depuis les métadonnées auth en priorité (dispo immédiatement)
    // puis fallback sur la table users si besoin
    let orgId = user.user_metadata?.organization_id as string | undefined
    let email: string | null = user.email ?? null
    let full_name: string | null = (user.user_metadata?.full_name as string) ?? null

    if (!orgId) {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, email, full_name')
        .eq('id', user.id)
        .maybeSingle()
      orgId = userData?.organization_id ?? undefined
      email = userData?.email ?? email
      full_name = userData?.full_name ?? full_name
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
    }

    const { data: orgData } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const orgName = orgData?.name ?? 'votre organisme'
    const prenom = firstName(full_name, email ?? user.email ?? null)
    const recipient = email ?? user.email ?? ''

    // TikTok Events API — conversion « création de compte / essai gratuit ».
    // Fire-and-forget, event_id partagé avec le pixel navigateur (register/page.tsx).
    if (recipient) {
      void sendTikTokEvent({
        eventName: 'CompleteRegistration',
        email: recipient,
        eventId: tiktokEventId('cr', recipient),
        clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: request.headers.get('user-agent'),
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.eduzen.io'}/auth/register`,
        properties: { content_name: 'Essai gratuit EduZen' },
      })
    }

    // Seeder les modèles AVANT de répondre — Vercel coupe la fonction dès le return
    const adminClient = createAdminClient()
    const seedResult = await seedDefaultTemplatesForOrg(adminClient, orgId)
      .catch(err => { logger.error('[post-signup] Error seeding templates:', err); return null })
    logger.info('[post-signup] Templates seeded', { orgId, created: seedResult?.created ?? 0 })

    // Email de bienvenue (non bloquant — ok car email est fire-and-forget)
    sendEmailViaResend({
      to: recipient,
      from: 'Airtone NILE — EduZen <contact@eduzen.io>',
      replyTo: 'contact@eduzen.io',
      subject: `${prenom}, bienvenue dans l'écosystème EduZen 👋`,
      html: buildWelcomeEmail({ prenom, organisme: orgName }),
    }).catch(err => logger.error('[post-signup] Error sending welcome email:', err))

    return NextResponse.json({ success: true, templatesCreated: seedResult?.created ?? 0 })
  } catch (error) {
    logger.error('[post-signup] Unexpected error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
