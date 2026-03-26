import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'
import { auditLog, getClientIp } from '@/lib/utils/audit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const postSchema = z.object({
  company_employee_id: z.string().regex(UUID_RE, 'UUID invalide'),
  diploma_type_id:     z.string().regex(UUID_RE, 'UUID invalide'),
  company_id:          z.string().regex(UUID_RE, 'UUID invalide'),
  expiry_date:         z.string().refine(v => !isNaN(Date.parse(v)), 'Date invalide'),
  issued_at:           z.string().refine(v => !isNaN(Date.parse(v)), 'Date invalide').optional().nullable(),
  document_url:        z.string().url('URL invalide').optional().nullable(),
  notes:               z.string().max(2000).optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    const status    = searchParams.get('status')   // expired | warning | valid | null
    const search    = searchParams.get('search')   // recherche par nom

    if (!companyId) return NextResponse.json({ error: 'company_id requis' }, { status: 400 })

    // Récupérer l'organisation de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    // Requête sur la vue de conformité
    let query = supabase
      .from('v_employee_diploma_compliance')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('company_id', companyId)
      .order('expiry_date', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: rows, error } = await query

    if (error) throw error

    // Filtre search côté JS (noms non indexables facilement en SQL sur une vue)
    let records = rows || []
    if (search) {
      const q = search.toLowerCase()
      records = records.filter(r =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        r.diploma_name?.toLowerCase().includes(q)
      )
    }

    // Stats globales
    const all = rows || []
    const stats = {
      total:   all.length,
      expired: all.filter(r => r.status === 'expired').length,
      warning: all.filter(r => r.status === 'warning').length,
      valid:   all.filter(r => r.status === 'valid').length,
    }

    return NextResponse.json({ records, stats })
  } catch (err) {
    logger.error('[compliance] GET error', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const rawBody = await request.json()
    const parsed = postSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { company_employee_id, diploma_type_id, company_id, expiry_date, issued_at, document_url, notes } = parsed.data

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    // Vérifier que company_id appartient à l'organisation de l'utilisateur
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .eq('organization_id', userData.organization_id)
      .maybeSingle()

    if (!company) {
      return NextResponse.json({ error: 'Entreprise introuvable ou non autorisée' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('employee_diplomas')
      .insert({
        organization_id:     userData.organization_id,
        company_id,
        company_employee_id,
        diploma_type_id,
        expiry_date,
        issued_at:    issued_at || null,
        document_url: document_url || null,
        notes:        notes || null,
        created_by:   user.id,
      })
      .select()
      .single()

    if (error) throw error

    auditLog({
      actorId:        user.id,
      organizationId: userData.organization_id,
      action:         'create',
      tableName:      'employee_diplomas',
      recordId:       (data as { id?: string })?.id,
      ipAddress:      getClientIp(request),
      userAgent:      request.headers.get('user-agent') ?? undefined,
      metadata:       { company_id, diploma_type_id },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logger.error('[compliance] POST error', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id invalide' }, { status: 400 })

    // Récupérer l'organisation de l'utilisateur pour scoper la suppression
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const { error } = await supabase
      .from('employee_diplomas')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData.organization_id) // Scoper à l'organisation

    if (error) throw error

    auditLog({
      actorId:        user.id,
      organizationId: userData.organization_id,
      action:         'delete',
      tableName:      'employee_diplomas',
      recordId:       id,
      ipAddress:      getClientIp(request),
      userAgent:      request.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('[compliance] DELETE error', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
