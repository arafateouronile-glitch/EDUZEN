import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateBlogPostInput, UpdateBlogPostInput } from '@/types/super-admin.types'

// GET - Liste des articles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier les permissions
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('permissions')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!admin || !(admin.permissions as any)?.manage_blog) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const categoryId = searchParams.get('category_id')
    const search = searchParams.get('search')

    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        author:users(id, email, full_name, avatar_url),
        category:blog_categories(*),
        tags:blog_post_tags(
          tag:blog_tags(*)
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts: data || [] })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des articles' },
      { status: 500 }
    )
  }
}

// POST - Créer un article
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier les permissions
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('permissions')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!admin || !(admin.permissions as any)?.manage_blog) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body: CreateBlogPostInput = await request.json()

    // Générer le slug si non fourni
    let slug = body.slug
    if (!slug) {
      slug = body.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: body.title,
        slug,
        excerpt: body.excerpt || null,
        content: body.content,
        featured_image_url: body.featured_image_url || null,
        meta_title: body.meta_title || null,
        meta_description: body.meta_description || null,
        canonical_url: body.canonical_url || null,
        status: body.status,
        published_at: body.status === 'published' ? new Date().toISOString() : null,
        scheduled_for: body.scheduled_for ? new Date(body.scheduled_for).toISOString() : null,
        author_id: user.id,
        category_id: body.category_id || null,
        allow_comments: body.allow_comments ?? true,
        is_featured: body.is_featured ?? false,
        metadata: (body.metadata || {}) as any,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Ajouter les tags si fournis
    if (body.tag_ids && body.tag_ids.length > 0) {
      await supabase
        .from('blog_post_tags')
        .insert(
          body.tag_ids.map((tagId) => ({
            post_id: data.id,
            tag_id: tagId,
          }))
        )
    }

    return NextResponse.json({ post: data, message: 'Article créé avec succès' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'article' },
      { status: 500 }
    )
  }
}
