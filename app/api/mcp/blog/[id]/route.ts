import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { validateMcpToken } from '@/lib/mcp-auth'

const BLOG_STATUS = ['draft', 'published', 'archived', 'scheduled'] as const

const BlogPostPatchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z.string().max(255).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(1).optional(),
  featured_image_url: z.string().url().optional().nullable(),
  meta_title: z.string().max(255).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
  status: z.enum(BLOG_STATUS).optional(),
  scheduled_for: z.string().datetime().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  allow_comments: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
})

// GET /api/mcp/blog/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateMcpToken(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(id, name, slug),
        tags:blog_post_tags(tag:blog_tags(id, name, slug, color))
      `)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })

    return NextResponse.json({ post: data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/mcp/blog/[id] — modifier ou publier
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateMcpToken(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const { id } = await params
    const raw = await request.json()
    const parsed = BlogPostPatchSchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const body = parsed.data
    const updates: Record<string, unknown> = {}

    if (body.title !== undefined) updates.title = body.title
    if (body.slug !== undefined) updates.slug = body.slug
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt
    if (body.content !== undefined) updates.content = body.content
    if (body.featured_image_url !== undefined) updates.featured_image_url = body.featured_image_url
    if (body.meta_title !== undefined) updates.meta_title = body.meta_title
    if (body.meta_description !== undefined) updates.meta_description = body.meta_description
    if (body.category_id !== undefined) updates.category_id = body.category_id
    if (body.allow_comments !== undefined) updates.allow_comments = body.allow_comments
    if (body.is_featured !== undefined) updates.is_featured = body.is_featured
    if (body.status !== undefined) {
      updates.status = body.status
      if (body.status === 'published') {
        updates.published_at = new Date().toISOString()
      }
    }
    if (body.scheduled_for !== undefined) {
      updates.scheduled_for = body.scheduled_for ?? null
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

    // Mettre à jour les tags si fournis
    if (body.tag_ids !== undefined) {
      await supabase.from('blog_post_tags').delete().eq('post_id', id)
      if (body.tag_ids.length > 0) {
        await supabase.from('blog_post_tags').insert(
          body.tag_ids.map((tagId) => ({ post_id: id, tag_id: tagId }))
        )
      }
    }

    return NextResponse.json({ post: data, message: 'Article modifié avec succès' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/mcp/blog/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateMcpToken(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const { id } = await params

    const { error } = await supabase.from('blog_posts').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ message: 'Article supprimé avec succès' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
