import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { validateMcpToken } from '@/lib/mcp-auth'

const TagCreateSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

// GET /api/mcp/tags
export async function GET(request: NextRequest) {
  const authError = validateMcpToken(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('blog_tags')
      .select('id, name, slug, color')
      .order('name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ tags: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/mcp/tags — créer un tag
export async function POST(request: NextRequest) {
  const authError = validateMcpToken(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const raw = await request.json()
    const parsed = TagCreateSchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const body = parsed.data

    const slug = body.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const { data, error } = await supabase
      .from('blog_tags')
      .insert({ name: body.name, slug, color: body.color ?? '#6366f1' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

    return NextResponse.json({ tag: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
