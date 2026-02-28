import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: admin } = await supabase
      .from('platform_admins')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!admin || (admin as { role?: string }).role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès réservé au super administrateur' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || undefined
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined

    const adminSupabase = createAdminClient()

    let query = adminSupabase
      .from('support_tickets')
      .select(
        `
        *,
        user:users!support_tickets_user_id_fkey(id, full_name, email),
        assigned_user:users!support_tickets_assigned_to_fkey(id, full_name, email),
        category:support_categories(*),
        organization:organizations!support_tickets_organization_id_fkey(id, name)
      `
      )
      .order('created_at', { ascending: false })

    if (organizationId) query = query.eq('organization_id', organizationId)
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    const { data: tickets, error } = await query

    if (error) {
      logger.error('[GET /api/super-admin/support/tickets]', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(tickets || [])
  } catch (e) {
    logger.error('[GET /api/super-admin/support/tickets]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
