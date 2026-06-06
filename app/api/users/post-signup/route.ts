import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { seedDefaultTemplatesForOrg } from '@/lib/utils/seed-default-templates'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'
import { buildWelcomeEmail, firstName } from '@/lib/emails/onboarding-emails'

// POST /api/users/post-signup
// Appelé une fois après l'inscription : seeder les templates + envoyer l'email de bienvenue immédiat.
// Les emails J+2 / J+7 / J+11 / J+13 sont gérés par le cron /api/cron/onboarding-sequence.
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
    const prenom = firstName(full_name, email ?? user.email ?? null)
    const recipient = email ?? user.email ?? ''

    // Seeder les modèles de documents par défaut avec le client admin (bypass RLS)
    const adminClient = createAdminClient()
    seedDefaultTemplatesForOrg(adminClient, orgId)
      .then(({ created }) => logger.info('[post-signup] Templates seeded', { orgId, created }))
      .catch(err => logger.error('[post-signup] Error seeding templates:', err))

    // Email de bienvenue immédiat (pas de scheduledAt — Resend exige min 30min pour les emails planifiés)
    sendEmailViaResend({
      to: recipient,
      from: 'Airtone NILE — EduZen <contact@eduzen.io>',
      replyTo: 'contact@eduzen.io',
      subject: `${prenom}, bienvenue dans l'écosystème EduZen 👋`,
      html: buildWelcomeEmail({ prenom, organisme: orgName }),
    }).catch(err => logger.error('[post-signup] Error sending welcome email:', err))

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[post-signup] Unexpected error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
