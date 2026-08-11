import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    // Seed du catalogue standard français si aucun type n'existe encore pour cette organisation
    const { count } = await (supabase as any)
      .from('teacher_required_document_types')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    if (count === 0) {
      await supabase.rpc('seed_default_teacher_document_types' as any, { org_id: orgId })
    }

    const { data, error } = await (supabase as any)
      .from('teacher_required_document_types')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    logger.error('[teacher-required-document-types] GET error', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
