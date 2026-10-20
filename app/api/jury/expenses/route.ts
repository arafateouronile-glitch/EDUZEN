/**
 * Défraiements des membres du jury d'une session (table session_jury_expenses).
 *
 * GET    /api/jury/expenses?session_id=  — défraiements de la session
 * POST   /api/jury/expenses              — crée / met à jour (upsert par session_jury_id)
 * PATCH  /api/jury/expenses?id=          — attestation envoyée en signature
 * DELETE /api/jury/expenses?id=          — supprime (la charge liée part par trigger)
 *
 * Chaque enregistrement synchronise la charge « Jury » de la session
 * (session_charges), visible dans l'onglet Finances et le BPF.
 *
 * Client utilisateur (RLS par organisation) : pas de client admin ici.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { logger } from '@/lib/utils/logger'
import { juryMemberFullName } from '@/lib/services/jury-expense.service'

// session_jury_expenses est récente : on évite de dépendre des types générés.
type AnyClient = any

const AMOUNT_FIELDS = ['hours', 'hourly_rate', 'distance_km', 'km_rate', 'other_transport', 'meals', 'lodging'] as const

const EXPENSE_SELECT = '*, documents(signed_file_url, file_url)'

async function getContext() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return null
  return { supabase: supabase as AnyClient, userId: user.id, orgId }
}

function parseAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return 0
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 1000) / 1000
}

/** Catégorie « Jury » de l'organisation, créée au besoin */
async function getJuryCategoryId(supabase: AnyClient, orgId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('charge_categories')
    .select('id')
    .eq('organization_id', orgId)
    .eq('code', 'JURY')
    .maybeSingle()
  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from('charge_categories')
    .insert({
      organization_id: orgId,
      name: 'Jury',
      code: 'JURY',
      description: 'Vacations et frais des membres du jury d\'examen',
      bpf_category: 'subcontracting',
    })
    .select('id')
    .single()
  if (error) {
    logger.warn('Création catégorie de charge JURY impossible', { error: error.message })
    return null
  }
  return created.id
}

/**
 * Crée, met à jour ou supprime la charge de session correspondant au
 * défraiement. Renvoie l'id de charge à stocker (null si total = 0).
 */
async function syncSessionCharge(
  supabase: AnyClient,
  orgId: string,
  userId: string,
  expense: { id: string; session_id: string; total: number; currency: string; session_charge_id: string | null; reference: string | null },
  memberName: string,
  examDate: string | null
): Promise<string | null> {
  const total = Number(expense.total ?? 0)

  if (total <= 0) {
    if (expense.session_charge_id) {
      await supabase.from('session_charges').delete().eq('id', expense.session_charge_id)
    }
    return null
  }

  const payload = {
    description: `Défraiement jury — ${memberName}`,
    amount: total,
    currency: expense.currency || 'EUR',
    vendor: memberName,
    vendor_invoice_number: expense.reference,
    notes: 'Charge générée automatiquement depuis l\'onglet Examen & Jury',
  }

  if (expense.session_charge_id) {
    const { data, error } = await supabase
      .from('session_charges')
      .update(payload)
      .eq('id', expense.session_charge_id)
      .select('id')
      .maybeSingle()
    if (!error && data?.id) return data.id
    // Charge supprimée manuellement depuis Finances : on la recrée
  }

  const { data: created, error: createError } = await supabase
    .from('session_charges')
    .insert({
      ...payload,
      organization_id: orgId,
      session_id: expense.session_id,
      category_id: await getJuryCategoryId(supabase, orgId),
      charge_date: (examDate ?? new Date().toISOString()).slice(0, 10),
      payment_status: 'pending',
      created_by: userId,
    })
    .select('id')
    .single()
  if (createError) throw createError
  return created.id
}

export async function GET(request: NextRequest) {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'session_id requis' }, { status: 400 })

  const { data, error } = await ctx.supabase
    .from('session_jury_expenses')
    .select(EXPENSE_SELECT)
    .eq('session_id', sessionId)
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('GET /api/jury/expenses', error)
    return NextResponse.json({ error: 'Impossible de charger les défraiements' }, { status: 500 })
  }
  return NextResponse.json({ expenses: data ?? [] })
}

export async function POST(request: NextRequest) {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { supabase, orgId, userId } = ctx

  try {
    const body = (await request.json()) as Record<string, unknown>
    const sessionJuryId = typeof body.session_jury_id === 'string' ? body.session_jury_id : null
    if (!sessionJuryId) return NextResponse.json({ error: 'session_jury_id requis' }, { status: 400 })

    const amounts: Record<string, number> = {}
    for (const field of AMOUNT_FIELDS) {
      const value = parseAmount(body[field])
      if (value === null) return NextResponse.json({ error: `Montant invalide : ${field}` }, { status: 400 })
      amounts[field] = value
    }

    // L'affectation doit appartenir à une session de l'organisation (RLS + contrôle explicite)
    const { data: assignment } = await supabase
      .from('session_jury')
      .select('id, session_id, jury_member_id, jury_members(first_name, last_name), sessions!inner(organization_id, exam_date)')
      .eq('id', sessionJuryId)
      .maybeSingle()
    if (!assignment || assignment.sessions?.organization_id !== orgId) {
      return NextResponse.json({ error: 'Membre du jury introuvable pour cette session' }, { status: 404 })
    }

    const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

    const { data: existing } = await supabase
      .from('session_jury_expenses')
      .select('id, session_charge_id')
      .eq('session_jury_id', sessionJuryId)
      .maybeSingle()

    const write = existing
      ? supabase.from('session_jury_expenses').update({ ...amounts, notes }).eq('id', existing.id)
      : supabase.from('session_jury_expenses').insert({
          ...amounts,
          notes,
          organization_id: orgId,
          session_jury_id: sessionJuryId,
          session_id: assignment.session_id,
          jury_member_id: assignment.jury_member_id,
          created_by: userId,
        })
    const { data: saved, error: saveError } = await write.select(EXPENSE_SELECT).single()
    if (saveError) throw saveError

    const chargeId = await syncSessionCharge(
      supabase,
      orgId,
      userId,
      saved,
      juryMemberFullName(assignment.jury_members),
      assignment.sessions?.exam_date ?? null
    )

    if (chargeId !== saved.session_charge_id) {
      const { data: linked, error: linkError } = await supabase
        .from('session_jury_expenses')
        .update({ session_charge_id: chargeId })
        .eq('id', saved.id)
        .select(EXPENSE_SELECT)
        .single()
      if (linkError) throw linkError
      return NextResponse.json({ expense: linked })
    }
    return NextResponse.json({ expense: saved })
  } catch (error) {
    logger.error('POST /api/jury/expenses', error)
    return NextResponse.json({ error: 'Impossible d\'enregistrer le défraiement' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const body = (await request.json().catch(() => ({}))) as { document_id?: string; signature_request_id?: string | null }
  if (!body.document_id) return NextResponse.json({ error: 'document_id requis' }, { status: 400 })

  const { data, error } = await ctx.supabase
    .from('session_jury_expenses')
    .update({
      document_id: body.document_id,
      signature_request_id: body.signature_request_id ?? null,
      status: 'sent',
      sent_at: new Date().toISOString(),
      signed_at: null,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .select(EXPENSE_SELECT)
    .maybeSingle()

  if (error || !data) {
    logger.error('PATCH /api/jury/expenses', error)
    return NextResponse.json({ error: 'Défraiement introuvable' }, { status: 404 })
  }
  return NextResponse.json({ expense: data })
}

export async function DELETE(request: NextRequest) {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await ctx.supabase
    .from('session_jury_expenses')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) {
    logger.error('DELETE /api/jury/expenses', error)
    return NextResponse.json({ error: 'Impossible de supprimer le défraiement' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
