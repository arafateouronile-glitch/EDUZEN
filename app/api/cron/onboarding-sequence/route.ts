/**
 * GET /api/cron/onboarding-sequence
 * Tourne chaque jour à 8h30. Envoie les emails de la séquence d'essai :
 * - J+2  : check-in 48h
 * - J+7  : mi-essai
 * - J+11 : 3 jours restants (avec CTA d'upgrade)
 * - J+13 : dernier jour (avec CTA d'upgrade)
 *
 * N'envoie pas si l'org a déjà converti (subscription status != 'trialing').
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'
import {
  buildCheckInEmail,
  buildMidTrialEmail,
  buildTrialEndingSoonEmail,
  buildTrialLastDayEmail,
  firstName,
} from '@/lib/emails/onboarding-emails'

const FROM = 'Airtone NILE — EduZen <contact@eduzen.io>'
const REPLY_TO = 'contact@eduzen.io'
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.io').replace(/\/$/, '')

type Window = { daysAgo: number; label: string; subject: (prenom: string) => string; html: (prenom: string) => string }

const WINDOWS: Window[] = [
  {
    daysAgo: 2,
    label: 'J+2',
    subject: (p) => `${p}, comment ça se passe ?`,
    html: (p) => buildCheckInEmail({ prenom: p }),
  },
  {
    daysAgo: 7,
    label: 'J+7',
    subject: (p) => `${p}, vous avez une semaine d'EduZen derrière vous`,
    html: (p) => buildMidTrialEmail({ prenom: p }),
  },
  {
    daysAgo: 11,
    label: 'J+11',
    subject: () => `Plus que 3 jours sur votre essai EduZen`,
    html: (p) => buildTrialEndingSoonEmail({ prenom: p, appUrl: APP_URL }),
  },
  {
    daysAgo: 13,
    label: 'J+13',
    subject: (p) => `${p}, votre essai EduZen se termine demain`,
    html: (p) => buildTrialLastDayEmail({ prenom: p, appUrl: APP_URL }),
  },
]

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const results: Record<string, { sent: number; skipped: number; errors: number }> = {}

  for (const window of WINDOWS) {
    const windowStart = new Date(now.getTime() - (window.daysAgo + 1) * 24 * 60 * 60_000).toISOString()
    const windowEnd   = new Date(now.getTime() - window.daysAgo * 24 * 60 * 60_000).toISOString()

    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .gte('created_at', windowStart)
      .lt('created_at', windowEnd)

    let sent = 0, skipped = 0, errors = 0

    for (const org of orgs ?? []) {
      // Ne pas envoyer si l'org a déjà converti (plus en trialing)
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('organization_id', org.id)
        .maybeSingle()

      if (sub && sub.status !== 'trialing') {
        skipped++
        continue
      }

      const { data: admin } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('organization_id', org.id)
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (!admin?.email) { skipped++; continue }

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
        logger.info(`[onboarding-sequence] ${window.label} sent`, { orgId: org.id, email: admin.email })
      } else {
        errors++
        logger.error(`[onboarding-sequence] ${window.label} failed`, { orgId: org.id, error: result.error })
      }
    }

    results[window.label] = { sent, skipped, errors }
  }

  logger.info('[onboarding-sequence] Done', results)
  return NextResponse.json({ success: true, results })
}
