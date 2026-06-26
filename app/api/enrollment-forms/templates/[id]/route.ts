import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getOrgId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  return data?.organization_id ?? null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('enrollment_form_templates')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error) return NextResponse.json({ error: 'Formulaire introuvable' }, { status: 404 })
  return NextResponse.json({ template: data })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient() as any

  const { data, error } = await admin
    .from('enrollment_form_templates')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient() as any
  const { error } = await admin
    .from('enrollment_form_templates')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
