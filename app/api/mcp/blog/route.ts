import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { validateMcpToken } from '@/lib/mcp-auth'

const BLOG_STATUS = ['draft', 'published', 'archived', 'scheduled'] as const

const BlogPostCreateSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  slug: z.string().max(255).optional(),
  excerpt: z.string().max(500).optional().nullable(),
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

// GET /api/mcp/blog — lister les articles
export async function GET(request: NextRequest) {
  const authError = validateMcpToken(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const categoryId = searchParams.get('category_id')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0)

    let query = supabase
      .from('blog_posts')
      .select(`
        id, title, slug, excerpt, status, published_at, created_at, updated_at,
        is_featured, views_count, reading_time_minutes,
        category:blog_categories(id, name, slug),
        tags:blog_post_tags(tag:blog_tags(id, name, slug, color))
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (search) query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

    return NextResponse.json({ posts: data ?? [], count: data?.length ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/mcp/blog — créer un article
export async function POST(request: NextRequest) {
  const authError = validateMcpToken(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const raw = await request.json()
    const parsed = BlogPostCreateSchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const body = parsed.data

    // Auto-génération du slug
    const slug = body.slug ?? body.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const status = body.status ?? 'draft'

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: body.title,
        slug,
        excerpt: body.excerpt ?? null,
        content: body.content,
        featured_image_url: body.featured_image_url ?? null,
        meta_title: body.meta_title ?? null,
        meta_description: body.meta_description ?? null,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
        scheduled_for: body.scheduled_for ?? null,
        category_id: body.category_id ?? null,
        allow_comments: body.allow_comments ?? true,
        is_featured: body.is_featured ?? false,
      } as any)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

    // Tags
    if (body.tag_ids && body.tag_ids.length > 0) {
      await supabase.from('blog_post_tags').insert(
        body.tag_ids.map((tagId) => ({ post_id: data.id, tag_id: tagId }))
      )
    }

    return NextResponse.json({ post: data, message: 'Article créé avec succès' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
