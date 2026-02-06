/**
 * GET /api/qualiopi/compliance-rate
 * Retourne le score de conformité Qualiopi affiché (même logique que la page Qualiopi) :
 * indicateurs DB + preuves (auto + manuelles), 32 indicateurs du référentiel.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QUALIOPI_REFERENTIAL } from '@/lib/services/auditor-portal.service'

const TOTAL_REFERENTIAL_INDICATORS = 32

function indicatorCodeToReferentialNumber(code: string): number | null {
  const parts = String(code || '').trim().split('.')
  const c = parseInt(parts[0], 10)
  const i = parseInt(parts[1], 10)
  if (Number.isNaN(c) || Number.isNaN(i)) return null
  const criterion = QUALIOPI_REFERENTIAL.find((cr) => cr.number === c)
  if (!criterion) return null
  const indicator = criterion.indicators[i - 1]
  return indicator?.number ?? null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userRow?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const orgId = userRow.organization_id

    // Requêtes séparées pour éviter les problèmes de typage TypeScript
    const indicatorsRes = await supabase
      .from('qualiopi_indicators')
      .select('id, indicator_code, status')
      .eq('organization_id', orgId)

    const autoRes = await supabase
      .from('compliance_evidence_automated')
      .select('indicator_number')
      .eq('organization_id', orgId)
      .eq('status', 'valid')
      .limit(200)

    // Requête simplifiée ; cast pour éviter "Type instantiation is excessively deep" (types Supabase)
    const manualRes = await (supabase as any)
      .from('qualiopi_evidence')
      .select('indicator_id')
      .eq('organization_id', orgId)
      .in('status', ['pending', 'approved'])
      .limit(200)

    // Récupérer les codes d'indicateurs si des preuves existent
    const indicatorIds = (manualRes.data || [])
      .map((e: { indicator_id: string | null }) => e.indicator_id)
      .filter((id: string | null): id is string => !!id)

    let manualIndicatorCodes: { indicator_code: string }[] = []
    if (indicatorIds.length > 0) {
      const { data: indicatorCodesData } = await supabase
        .from('qualiopi_indicators')
        .select('indicator_code')
        .in('id', indicatorIds)
      manualIndicatorCodes = (indicatorCodesData || []) as { indicator_code: string }[]
    }

    const indicators = (indicatorsRes.data || []) as { id: string; indicator_code: string; status: string }[]
    const autoEvidence = (autoRes.data || []) as { indicator_number: number }[]
    // manualRes ne contient que indicator_id ; les codes sont dans manualIndicatorCodes (requête séparée ci-dessus)

    const evidenceIndicatorNumbers = new Set<number>()
    for (const e of autoEvidence) {
      if (e.indicator_number >= 1 && e.indicator_number <= TOTAL_REFERENTIAL_INDICATORS) {
        evidenceIndicatorNumbers.add(e.indicator_number)
      }
    }
    for (const row of manualIndicatorCodes) {
      const code = row.indicator_code
      if (!code) continue
      const refNum = indicatorCodeToReferentialNumber(String(code))
      const asNum = /^([1-9]|[1-2][0-9]|3[0-2])$/.test(String(code).trim()) ? parseInt(String(code).trim(), 10) : null
      const num = refNum ?? asNum
      if (num != null && num >= 1 && num <= TOTAL_REFERENTIAL_INDICATORS) {
        evidenceIndicatorNumbers.add(num)
      }
    }

    const effectiveIndicators = indicators.map((ind) => {
      const refNum = indicatorCodeToReferentialNumber(ind.indicator_code)
      const hasEvidence = refNum != null && evidenceIndicatorNumbers.has(refNum)
      const status =
        ind.status === 'not_started' && hasEvidence ? 'in_progress' : ind.status
      return { ...ind, refNum, status }
    })

    let covered = 0
    for (let num = 1; num <= TOTAL_REFERENTIAL_INDICATORS; num++) {
      const ind = effectiveIndicators.find((i) => i.refNum === num)
      if (ind && (ind.status === 'compliant' || ind.status === 'in_progress')) {
        covered++
      } else if (!ind && evidenceIndicatorNumbers.has(num)) {
        covered++
      }
    }

    const score = Math.round((covered / TOTAL_REFERENTIAL_INDICATORS) * 100)
    const res = NextResponse.json({ score })
    // Cache navigateur 60s pour limiter les appels (~500ms chacun)
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
    return res
  } catch (err) {
    console.error('compliance-rate error', err)
    return NextResponse.json({ error: 'Erreur serveur', score: 0 }, { status: 500 })
  }
}
