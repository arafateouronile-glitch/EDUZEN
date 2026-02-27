/**
 * GET /api/super-admin/affiliation/pending-commissions
 * Retourne les commissions en attente (affiliate_commissions status=pending)
 * agrégées par affilié : total_amount, count, infos bancaires.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface PendingCommissionRow {
  affiliate_id: string
  name: string
  email: string
  iban: string
  total_amount: number
  count: number
}

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

    const { data: commissions, error: commError } = await supabase
      .from('affiliate_commissions')
      .select('id, affiliate_id, commission_amount')
      .eq('status', 'pending')

    if (commError) {
      logger.error('[pending-commissions]', commError)
      return NextResponse.json({ error: commError.message }, { status: 500 })
    }

    const rows = (commissions || []) as { id: string; affiliate_id: string; commission_amount: number }[]
    const byAffiliate = new Map<
      string,
      { total: number; count: number }
    >()
    for (const r of rows) {
      const cur = byAffiliate.get(r.affiliate_id) ?? { total: 0, count: 0 }
      cur.total += Number(r.commission_amount)
      cur.count += 1
      byAffiliate.set(r.affiliate_id, cur)
    }

    const affiliateIds = [...byAffiliate.keys()]
    if (affiliateIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const { data: affiliates, error: affError } = await supabase
      .from('affiliates')
      .select('id, email, full_name, company_name, payment_iban')
      .in('id', affiliateIds)

    if (affError) {
      logger.error('[pending-commissions] affiliates', affError)
      return NextResponse.json({ error: affError.message }, { status: 500 })
    }

    const data: PendingCommissionRow[] = (affiliates || []).map((a: unknown) => {
      const x = a as { id: string; email: string; full_name: string | null; company_name: string | null; payment_iban: string | null }
      const agg = byAffiliate.get(x.id) ?? { total: 0, count: 0 }
      return {
        affiliate_id: x.id,
        name: x.full_name || x.company_name || x.email || '—',
        email: x.email,
        iban: (x.payment_iban ?? '').replace(/\s/g, ''),
        total_amount: Math.round(agg.total * 100) / 100,
        count: agg.count,
      }
    })

    return NextResponse.json({ data })
  } catch (e) {
    logger.error('[pending-commissions]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
