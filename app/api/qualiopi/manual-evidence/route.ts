/**
 * POST   /api/qualiopi/manual-evidence  — Ajouter une preuve manuelle
 * DELETE /api/qualiopi/manual-evidence?id=xxx — Supprimer une preuve manuelle
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 401 })

  const body = await req.json() as {
    indicator_number: number
    title: string
    description?: string | null
    event_date?: string | null
    evidence_type?: string
    file_url?: string | null
  }

  const { indicator_number, title, description, event_date, evidence_type, file_url } = body

  if (!indicator_number || !title?.trim()) {
    return NextResponse.json({ error: 'indicator_number et title sont requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('compliance_evidence_automated')
    .insert({
      organization_id:  orgId,
      indicator_number: indicator_number,
      evidence_type:    evidence_type ?? 'document',
      source:           'manual_upload',
      entity_type:      'manual',
      entity_id:        orgId,
      entity_name:      null,
      title:            title.trim(),
      description:      description?.trim() ?? null,
      status:           'valid',
      confidence_score: 100,
      event_date:       event_date ?? new Date().toISOString().split('T')[0],
      file_url:         file_url?.trim() ?? null,
      metadata:         { added_by: user.id, manual: true },
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabase
    .from('compliance_evidence_automated')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
    .eq('source', 'manual_upload')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
