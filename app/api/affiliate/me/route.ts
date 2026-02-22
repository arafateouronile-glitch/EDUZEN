/**
 * GET /api/affiliate/me
 * Données du portail affilié pour l'utilisateur connecté (match par email).
 * Retourne l'affilié approuvé + ses commissions pour stats, graphique et tableau.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export interface AffiliatePortalData {
  affiliate: {
    id: string
    email: string
    full_name: string | null
    company_name: string | null
    payment_iban: string | null
    payment_bic: string | null
    payment_holder_name: string | null
    status: string
  }
  commissions: Array<{
    id: string
    commission_amount: number
    order_amount: number
    status: string
    created_at: string
  }>
  promoCode: { code: string; discount_value: number } | null
  stats: {
    totalEarned: number
    pendingAmount: number
    conversionRate: number
    totalClicks: number
    totalConversions: number
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: affiliate, error: affError } = await admin
      .from('affiliates')
      .select('id, email, full_name, company_name, payment_iban, payment_bic, payment_holder_name, status')
      .eq('email', user.email)
      .eq('status', 'approved')
      .maybeSingle()

    if (affError || !affiliate) {
      return NextResponse.json({ error: 'Accès portail affilié non autorisé' }, { status: 403 })
    }

    const { data: commissions, error: commError } = await admin
      .from('affiliate_commissions')
      .select('id, commission_amount, order_amount, status, created_at')
      .eq('affiliate_id', affiliate.id)
      .in('status', ['pending', 'paid'])
      .order('created_at', { ascending: false })

    if (commError) {
      logger.error('[affiliate/me] commissions', commError)
      return NextResponse.json({ error: commError.message }, { status: 500 })
    }

    const { data: promo } = await admin
      .from('promo_codes')
      .select('code, discount_value')
      .eq('affiliate_id', affiliate.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    const { data: referrals } = await admin
      .from('affiliate_referrals')
      .select('type')
      .eq('affiliate_id', affiliate.id)

    const commList = (commissions || []) as Array<{
      id: string
      commission_amount: number
      order_amount: number
      status: string
      created_at: string
    }>
    const totalEarned = commList
      .filter((c) => c.status === 'paid')
      .reduce((s, c) => s + Number(c.commission_amount), 0)
    const pendingAmount = commList
      .filter((c) => c.status === 'pending')
      .reduce((s, c) => s + Number(c.commission_amount), 0)

    const refList = (referrals || []) as { type: string }[]
    const totalClicks = refList.filter((r) => r.type === 'click').length
    const totalConversions = refList.filter((r) => r.type === 'conversion').length
    const conversionRate =
      totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 1000) / 10 : 0

    const payload: AffiliatePortalData = {
      affiliate: affiliate as AffiliatePortalData['affiliate'],
      commissions: commList,
      promoCode: promo as { code: string; discount_value: number } | null,
      stats: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        conversionRate,
        totalClicks,
        totalConversions,
      },
    }

    return NextResponse.json(payload)
  } catch (e) {
    logger.error('[affiliate/me]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
