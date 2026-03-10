import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      .from('v_employee_diploma_compliance' as any)
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
    let records = (rows || []) as any[]
    if (search) {
      const q = search.toLowerCase()
      records = records.filter((r: any) =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        r.diploma_name?.toLowerCase().includes(q)
      )
    }

    // Stats globales
    const all = (rows || []) as any[]
    const stats = {
      total:   all.length,
      expired: all.filter((r: any) => r.status === 'expired').length,
      warning: all.filter((r: any) => r.status === 'warning').length,
      valid:   all.filter((r: any) => r.status === 'valid').length,
    }

    return NextResponse.json({ records, stats })
  } catch (err) {
    console.error('[compliance] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { company_employee_id, diploma_type_id, company_id, expiry_date, issued_at, document_url, notes } = body

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('employee_diplomas' as any)
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

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[compliance] POST error:', err)
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

    const { error } = await supabase
      .from('employee_diplomas' as any)
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[compliance] DELETE error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
