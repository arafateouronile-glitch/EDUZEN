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

export async function GET(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const templateId = searchParams.get('template_id')
  const sessionId = searchParams.get('session_id')
  const status = searchParams.get('status')

  const admin = createAdminClient() as any
  let query = admin
    .from('enrollment_submissions')
    .select(`
      *,
      students (id, first_name, last_name, email),
      sessions (id, name),
      enrollment_form_links (template_id)
    `)
    .eq('org_id', orgId)
    .order('submitted_at', { ascending: false })

  if (sessionId) query = query.eq('session_id', sessionId)
  if (status) query = query.eq('status', status)
  if (templateId) {
    // Filter by template via the link
    const { data: linkIds } = await admin
      .from('enrollment_form_links')
      .select('id')
      .eq('template_id', templateId)
      .eq('org_id', orgId)

    if (linkIds?.length) {
      query = query.in('link_id', linkIds.map((l: { id: string }) => l.id))
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions: data })
}
