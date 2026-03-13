import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationPlanFeatures } from '@/lib/services/plan-limits'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', authUser.id)
      .single()

    if (!user?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 })
    }

    const planInfo = await getOrganizationPlanFeatures(supabase, user.organization_id)

    return NextResponse.json({ data: planInfo })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
