import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPIService } from '@/lib/services/api.service'
import { canUseWebhooks } from '@/lib/services/plan-limits'

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
    const webhooks = await apiService.getWebhooks(user.organization_id)

    return NextResponse.json({ data: webhooks })
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

    const hasAccess = await canUseWebhooks(supabase, user.organization_id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Webhook access requires the Enterprise plan' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, url, events } = body

    if (!name || !url || !events?.length) {
      return NextResponse.json(
        { error: 'Name, URL and at least one event are required' },
        { status: 400 }
      )
    }

    const apiService = createAPIService(supabase)
    const result = await apiService.createWebhook({
      organization_id: user.organization_id,
      url,
      events,
      description: name,
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
    const webhookId = searchParams.get('id')
    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    const apiService = createAPIService(supabase)
    await apiService.deleteWebhook(webhookId)

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(supabase)
    if (!user?.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['super_admin', 'admin'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    const apiService = createAPIService(supabase)
    const result = await apiService.updateWebhook(id, updates)

    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
