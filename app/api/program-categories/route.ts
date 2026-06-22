import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
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

    const { data, error } = await (supabase as any)
      .from('program_categories')
      .select('id, name, color')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json()
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const { data, error } = await (supabase as any)
      .from('program_categories')
      .insert({ organization_id: userData.organization_id, name, color: body.color ?? null })
      .select('id, name, color')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Cette catégorie existe déjà' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
