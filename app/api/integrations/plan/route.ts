import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { getOrganizationPlanFeatures } from '@/lib/services/plan-limits'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, authUser.id)
    if (!orgId) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 })
    }

    const planInfo = await getOrganizationPlanFeatures(supabase, orgId)

    return NextResponse.json({ data: planInfo })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
