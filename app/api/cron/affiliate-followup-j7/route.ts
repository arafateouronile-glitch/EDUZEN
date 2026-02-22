/**
 * GET /api/cron/affiliate-followup-j7
 * Relance J+7 : envoie un email aux affiliés validés depuis 7+ jours
 * qui n'ont pas encore généré de clic. À appeler via un cron (ex. Vercel Cron).
 * Sécuriser par CRON_SECRET ou vérification d'origine.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import {
  getAffiliateFollowupJ7Subject,
  getAffiliateFollowupJ7Html,
} from '@/lib/email-templates/affiliate-followup-j7'
import { logger } from '@/lib/utils/logger'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.fr'

function getFirstName(fullName: string | null, companyName: string | null): string {
  const full = fullName?.trim()
  if (full) {
    const first = full.split(/\s+/)[0]
    if (first) return first
  }
  if (companyName?.trim()) return companyName.trim()
  return 'Partenaire'
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString()

    const { data: affiliates, error: affError } = await supabase
      .from('affiliates')
      .select('id, email, full_name, company_name, updated_at')
      .eq('status', 'approved')
      .lt('updated_at', cutoff)

    if (affError) {
      logger.error('[affiliate-followup-j7] fetch affiliates', affError)
      return NextResponse.json({ error: affError.message }, { status: 500 })
    }

    const list = (affiliates || []) as Array<{
      id: string
      email: string
      full_name: string | null
      company_name: string | null
      updated_at: string
    }>

    const sent: string[] = []
    const skipped: string[] = []

    for (const aff of list) {
      const { count, error: countError } = await supabase
        .from('affiliate_referrals')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', aff.id)
        .eq('type', 'click')

      if (countError || (count ?? 0) > 0) {
        skipped.push(aff.email)
        continue
      }

      const referralLink = `${BASE_URL}?ref=${aff.id}`
      const html = getAffiliateFollowupJ7Html({
        firstName: getFirstName(aff.full_name, aff.company_name),
        referralLink,
      })

      const result = await sendEmailViaResend({
        to: aff.email,
        subject: getAffiliateFollowupJ7Subject(),
        html,
      })

      if (result.success) {
        sent.push(aff.email)
      } else {
        logger.warn('[affiliate-followup-j7] send failed', { email: aff.email, error: result.error })
      }
    }

    return NextResponse.json({
      ok: true,
      sent: sent.length,
      skipped: skipped.length,
      emailsSent: sent,
    })
  } catch (e) {
    logger.error('[affiliate-followup-j7]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
