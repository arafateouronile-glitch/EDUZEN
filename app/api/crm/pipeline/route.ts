import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CrmStatus, LearnerCard, LearnerPipelineData } from '@/lib/actions/learner-crm-actions'

export async function GET() {
  try {
    // Auth : lire l'org de l'utilisateur connecté
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const orgId  = userData.organization_id as string
    const admin  = createAdminClient() as any

    // Un seul appel RPC — tout calculé côté Postgres
    // Paginé par 1000 pour passer la limite PostgREST, mais en pratique 1–2 appels max
    const PAGE = 1000
    const seen = new Set<string>()
    let rows: any[] = []
    let from = 0

    while (true) {
      const { data, error } = await admin
        .rpc('get_crm_pipeline', { p_org_id: orgId })
        .range(from, from + PAGE - 1)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      for (const row of (data ?? []) as any[]) {
        if (!seen.has(row.id)) { seen.add(row.id); rows.push(row) }
      }

      if (!data || (data as any[]).length < PAGE) break
      from += PAGE
    }

    // Construire le pipeline groupé par statut
    const pipeline: LearnerPipelineData = {
      prospect: [], inscrit: [], en_cours: [], termine: [], abandon: [],
    }

    for (const row of rows) {
      const status = (row.crm_status ?? 'prospect') as CrmStatus

      const missing: string[] = []
      if (!row.has_convocation) missing.push('Convocation')
      if (!row.has_contract)    missing.push('Contrat')
      if (!row.has_attendance)  missing.push('Émargement')
      if (!row.has_evaluation)  missing.push('Évaluation')

      const card: LearnerCard = {
        id:                 row.id,
        first_name:         row.first_name,
        last_name:          row.last_name,
        email:              row.email ?? null,
        photo_url:          row.photo_url ?? null,
        crm_status:         status,
        session_id:         row.session_id ?? null,
        session_name:       row.session_name ?? null,
        session_start_date: row.session_start ? String(row.session_start) : null,
        session_end_date:   row.session_end   ? String(row.session_end)   : null,
        formation_id:       row.formation_id  ?? null,
        formation_name:     row.formation_name ?? null,
        program_name:       row.program_name  ?? null,
        program_category:   row.program_category ?? null,
        company_name:       row.company_name  ?? null,
        is_company:         row.is_company ?? false,
        missing_qualiopi:   missing,
        enrollment_id:      row.enrollment_id ?? null,
        created_at:         row.created_at ?? new Date().toISOString(),
        contacted:            row.contacted ?? false,
        contacted_at:         row.contacted_at ? String(row.contacted_at) : null,
        next_follow_up_date:  row.next_follow_up_date ? String(row.next_follow_up_date) : null,
        notes:                row.notes ?? null,
        commercial_status:    row.commercial_status ?? null,
      }

      pipeline[status].push(card)
    }

    return NextResponse.json(pipeline)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
