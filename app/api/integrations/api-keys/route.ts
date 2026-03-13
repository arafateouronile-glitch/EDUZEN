import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPIService } from '@/lib/services/api.service'
import { canUseAPI } from '@/lib/services/plan-limits'

async function getAuthenticatedUser(supabase: ReturnType<typeof createClient> extends Promise<infer U> ? U : never) {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: user } = await supabase
    .from('users')
    .select('id, organization_id, role')
    .eq('id', authUser.id)
    .single()

  return user
}

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(supabase)
    if (!user?.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiService = createAPIService(supabase)
    const keys = await apiService.getAPIKeys(user.organization_id)

    return NextResponse.json({ data: keys })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(supabase)
    if (!user?.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['super_admin', 'admin'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const hasAccess = await canUseAPI(supabase, user.organization_id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'API access requires the Enterprise plan' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, scopes } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const apiService = createAPIService(supabase)
    const result = await apiService.createAPIKey(user.organization_id, user.id, name, {
      description,
      scopes: scopes || [],
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(supabase)
    if (!user?.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['super_admin', 'admin'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    const apiService = createAPIService(supabase)
    await apiService.revokeAPIKey(keyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
