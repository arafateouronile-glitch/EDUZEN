/**
 * GET /api/cron/lead-nurture — toutes les heures.
 * Envoie l'email suivant de la séquence marketing aux leads des outils
 * gratuits (/outils) dont la date est atteinte. L'étape est enregistrée avant
 * l'envoi : un échec ou un double passage n'envoie jamais deux fois le même email.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { buildLeadNurtureEmail, LEAD_EMAIL_FROM, LEAD_EMAIL_REPLY_TO } from '@/lib/emails/lead-nurture-emails'
import { nurtureSendDate, NURTURE_STEPS } from '@/lib/outils/nurture-schedule'
import { unsubscribeHeaders, unsubscribeUrl } from '@/lib/outils/leads'
import { isOutilKey } from '@/lib/outils/tools'
import { APP_URLS } from '@/lib/config/app-config'
import { logger } from '@/lib/utils/logger'

export const maxDuration = 300

const BATCH = 100

interface DueLead {
  id: string
  email: string
  first_name: string | null
  first_tool: string
  qualiopi_score: number | null
  nurture_step: number
  unsubscribe_token: string
  created_at: string
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient() as any
  const now = new Date()
  const { data, error } = await admin
    .from('lead_magnet_leads')
    .select('id, email, first_name, first_tool, qualiopi_score, nurture_step, unsubscribe_token, created_at')
    .lte('next_email_at', now.toISOString())
    .lt('nurture_step', NURTURE_STEPS)
    .is('unsubscribed_at', null)
    .is('bounced_at', null)
    .is('converted_at', null)
    .order('next_email_at', { ascending: true })
    .limit(BATCH)
  if (error) {
    logger.error('[lead-nurture] lecture des leads impossible', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = APP_URLS.getBaseUrl()
  let sent = 0
  let converted = 0
  let failed = 0

  for (const lead of (data ?? []) as DueLead[]) {
    // Devenu client entre-temps : fin de la séquence
    const { data: user } = await admin.from('users').select('id').ilike('email', lead.email).limit(1).maybeSingle()
    if (user) {
      await admin.from('lead_magnet_leads').update({ converted_at: now.toISOString(), next_email_at: null }).eq('id', lead.id)
      converted++
      continue
    }

    const step = lead.nurture_step
    const nextAt = nurtureSendDate(lead.created_at, step + 1)
    // On réserve l'étape (garde sur l'étape lue) avant d'envoyer
    const { data: claimed } = await admin
      .from('lead_magnet_leads')
      .update({ nurture_step: step + 1, next_email_at: nextAt?.toISOString() ?? null, updated_at: now.toISOString() })
      .eq('id', lead.id)
      .eq('nurture_step', step)
      .select('id')
    if (!claimed?.length) continue

    const email = buildLeadNurtureEmail(step, {
      prenom: lead.first_name,
      firstTool: isOutilKey(lead.first_tool) ? lead.first_tool : 'convention',
      hasQualiopiScore: lead.qualiopi_score != null,
      unsubscribeUrl: unsubscribeUrl(baseUrl, lead.unsubscribe_token),
    })
    if (!email) continue

    const result = await sendEmailViaResend({
      from: LEAD_EMAIL_FROM,
      replyTo: LEAD_EMAIL_REPLY_TO,
      to: lead.email,
      subject: email.subject,
      html: email.html,
      headers: unsubscribeHeaders(baseUrl, lead.unsubscribe_token),
    })
    if (result.success) sent++
    else {
      failed++
      logger.warn('[lead-nurture] envoi échoué', { leadId: lead.id, step, error: result.error })
    }
  }

  logger.info('[lead-nurture] terminé', { sent, converted, failed })
  return NextResponse.json({ sent, converted, failed })
}
