import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

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

    // Seed des types par défaut si aucun n'existe
    const { count } = await supabase
      .from('diploma_types' as any)
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)

    if (count === 0) {
      await supabase.rpc('seed_default_diploma_types' as any, { org_id: userData.organization_id })
    }

    const { data, error } = await supabase
      .from('diploma_types' as any)
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err) {
    logger.error('[diploma-types] GET error', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
