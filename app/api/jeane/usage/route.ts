import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { getJeaneQuota } from '@/lib/services/jeane-limits'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const quota = await getJeaneQuota(supabase, orgId)
  return NextResponse.json(quota)
}
