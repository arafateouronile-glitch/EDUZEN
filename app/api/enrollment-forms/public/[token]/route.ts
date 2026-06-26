import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FormField, DynamicSource } from '@/lib/types/enrollment-forms'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient() as any

  const { data: link, error } = await supabase
    .from('enrollment_form_links')
    .select(`
      id, token, org_id, template_id, session_id,
      expires_at, max_uses, current_uses, is_active,
      enrollment_form_templates (
        id, name, description, fields
      ),
      sessions (
        id, name, start_date, end_date, location
      ),
      organizations (
        id, name, logo_url, email, phone
      )
    `)
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (error || !link) {
    return NextResponse.json({ error: 'Lien invalide ou introuvable' }, { status: 404 })
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Ce formulaire a expiré' }, { status: 410 })
  }

  if (link.max_uses !== null && link.current_uses >= link.max_uses) {
    return NextResponse.json({ error: 'Ce formulaire a atteint sa limite d\'inscriptions' }, { status: 410 })
  }

  // Fetch options for dynamic fields (programs / sessions / funding_types)
  const fields = (link.enrollment_form_templates?.fields ?? []) as FormField[]
  const sources = [...new Set(
    fields.filter(f => f.dynamic_source).map(f => f.dynamic_source as DynamicSource)
  )]

  const dynamicOptions: Record<string, Array<{ id: string; label: string }>> = {}

  for (const source of sources) {
    if (source === 'programs') {
      const { data } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', link.org_id)
        .eq('is_active', true)
        .order('name', { ascending: true })
      dynamicOptions.programs = (data ?? []).map((p: { id: string; name: string }) => ({ id: p.id, label: p.name }))
    } else if (source === 'sessions') {
      const { data } = await supabase
        .from('sessions')
        .select('id, name, start_date, formation_id, formations(program_id)')
        .eq('organization_id', link.org_id)
        .order('start_date', { ascending: true })
      dynamicOptions.sessions = (data ?? []).map((s: { id: string; name: string; start_date: string | null; formation_id: string | null; formations?: { program_id?: string | null } | null }) => ({
        id: s.id,
        formation_id: s.formation_id,
        program_id: s.formations?.program_id ?? null,
        label: s.start_date
          ? `${s.name} — ${new Date(s.start_date).toLocaleDateString('fr-FR')}`
          : s.name,
      }))
    } else if (source === 'funding_types') {
      const { data } = await supabase
        .from('funding_types')
        .select('id, name')
        .eq('organization_id', link.org_id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      dynamicOptions.funding_types = (data ?? []).map((f: { id: string; name: string }) => ({ id: f.id, label: f.name }))
    }
  }

  return NextResponse.json({ link, dynamicOptions })
}
