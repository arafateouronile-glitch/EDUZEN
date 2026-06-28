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

  // Resolve dynamic-source UUIDs (programs, sessions, funding_types) into human-readable names.
  // Collect unique IDs from form_data across all submissions.
  const programIds = new Set<string>()
  const fundingIds = new Set<string>()
  const sessionIds = new Set<string>()

  for (const sub of data ?? []) {
    const fd = sub.form_data as Record<string, unknown>
    for (const val of Object.values(fd)) {
      if (typeof val !== 'string' || !/^[0-9a-f-]{36}$/.test(val)) continue
      // We don't know the source per value here — collect all UUID-like values;
      // we'll resolve them against each table and merge results.
      programIds.add(val)
      fundingIds.add(val)
      sessionIds.add(val)
    }
  }

  const labelMap: Record<string, string> = {}

  const [programs, funding, sessions] = await Promise.all([
    programIds.size
      ? admin.from('programs').select('id, name').in('id', [...programIds]).then(({ data: r }: { data: Array<{ id: string; name: string }> | null }) => r ?? [])
      : Promise.resolve([]),
    fundingIds.size
      ? admin.from('funding_types').select('id, name').in('id', [...fundingIds]).then(({ data: r }: { data: Array<{ id: string; name: string }> | null }) => r ?? [])
      : Promise.resolve([]),
    sessionIds.size
      ? admin.from('sessions').select('id, name').in('id', [...sessionIds]).then(({ data: r }: { data: Array<{ id: string; name: string }> | null }) => r ?? [])
      : Promise.resolve([]),
  ])

  for (const p of programs as Array<{ id: string; name: string }>) labelMap[p.id] = p.name
  for (const f of funding as Array<{ id: string; name: string }>) labelMap[f.id] = f.name
  for (const s of sessions as Array<{ id: string; name: string }>) labelMap[s.id] = s.name

  return NextResponse.json({ submissions: data, labelMap })
}
