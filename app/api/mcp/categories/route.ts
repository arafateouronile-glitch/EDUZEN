import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { validateMcpToken } from '@/lib/mcp-auth'

// GET /api/mcp/categories
export async function GET(request: NextRequest) {
  const authError = validateMcpToken(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('blog_categories')
      .select('id, name, slug, description, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ categories: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
