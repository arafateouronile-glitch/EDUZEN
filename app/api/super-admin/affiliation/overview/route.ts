import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AffiliateOverviewStats } from '@/types/super-admin.types'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: admin } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!admin || (admin as { role?: string }).role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès réservé' }, { status: 403 })
    }

    const { data: referrals, error: refError } = await supabase
      .from('affiliate_referrals')
      .select('id, affiliate_id, type, mrr_contribution, commission_amount')

    if (refError) {
      logger.error('[affiliation/overview] affiliate_referrals', refError)
      return NextResponse.json(
        { error: refError.message },
        { status: 500 }
      )
    }

    const rows = (referrals || []) as Array<{
      id: string
      affiliate_id: string
      type: string
      mrr_contribution: number
      commission_amount: number
    }>

    const totalClicks = rows.filter((r) => r.type === 'click').length
    const conversions = rows.filter((r) => r.type === 'conversion').length
    const conversionRate =
      totalClicks > 0 ? Math.round((conversions / totalClicks) * 10000) / 100 : 0
    const mrrFromAffiliates = rows.reduce((s, r) => s + (Number(r.mrr_contribution) || 0), 0)
    const commissionDue = rows.reduce((s, r) => s + (Number(r.commission_amount) || 0), 0)

    const affiliateIds = [...new Set(rows.map((r) => r.affiliate_id))]
    const { data: affiliatesData } = await supabase
      .from('affiliates')
      .select('id, email, full_name, company_name')
      .in('id', affiliateIds.length ? affiliateIds : ['00000000-0000-0000-0000-000000000000'])

    const affiliates = (affiliatesData || []) as Array<{
      id: string
      email: string
      full_name: string | null
      company_name: string | null
    }>
    const byAffiliate = new Map<
      string,
      { conversions: number; mrr: number; commissionDue: number }
    >()
    for (const r of rows) {
      if (r.type !== 'conversion') continue
      const cur = byAffiliate.get(r.affiliate_id) || {
        conversions: 0,
        mrr: 0,
        commissionDue: 0,
      }
      cur.conversions += 1
      cur.mrr += Number(r.mrr_contribution) || 0
      cur.commissionDue += Number(r.commission_amount) || 0
      byAffiliate.set(r.affiliate_id, cur)
    }

    const topAffiliates = affiliates
      .map((a) => {
        const stats = byAffiliate.get(a.id) || {
          conversions: 0,
          mrr: 0,
          commissionDue: 0,
        }
        return {
          id: a.id,
          email: a.email,
          full_name: a.full_name,
          company_name: a.company_name,
          conversions: stats.conversions,
          mrr: stats.mrr,
          commissionDue: stats.commissionDue,
        }
      })
      .filter((t) => t.conversions > 0 || t.mrr > 0)
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 10)

    const stats: AffiliateOverviewStats = {
      totalClicks: totalClicks,
      totalConversions: conversions,
      conversionRate,
      mrrFromAffiliates,
      topAffiliates,
    }

    return NextResponse.json(stats)
  } catch (e) {
    logger.error('[affiliation/overview]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
