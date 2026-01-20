import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateBlogPostInput } from '@/types/super-admin.types'

// GET - Récupérer un article
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:users(id, email, full_name, avatar_url),
        category:blog_categories(*),
        tags:blog_post_tags(
          tag:blog_tags(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post: data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'article' },
      { status: 500 }
    )
  }
}

// PATCH - Modifier un article
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    const body: Partial<UpdateBlogPostInput> = await request.json()

    const updates: any = {}

    if (body.title) updates.title = body.title
    if (body.slug) updates.slug = body.slug
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt
    if (body.content) updates.content = body.content
    if (body.featured_image_url !== undefined) updates.featured_image_url = body.featured_image_url
    if (body.meta_title !== undefined) updates.meta_title = body.meta_title
    if (body.meta_description !== undefined) updates.meta_description = body.meta_description
    if (body.canonical_url !== undefined) updates.canonical_url = body.canonical_url
    if (body.status) {
      updates.status = body.status
      if (body.status === 'published' && !body.published_at) {
        updates.published_at = new Date().toISOString()
      }
    }
    if (body.scheduled_for !== undefined) {
      updates.scheduled_for = body.scheduled_for ? new Date(body.scheduled_for).toISOString() : null
    }
    if (body.category_id !== undefined) updates.category_id = body.category_id
    if (body.allow_comments !== undefined) updates.allow_comments = body.allow_comments
    if (body.is_featured !== undefined) updates.is_featured = body.is_featured
    if (body.metadata) updates.metadata = body.metadata

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mettre à jour les tags si fournis
    if (body.tag_ids !== undefined) {
      // Supprimer les tags existants
      await supabase
        .from('blog_post_tags')
        .delete()
        .eq('post_id', id)

      // Ajouter les nouveaux tags
      if (body.tag_ids.length > 0) {
        await supabase
          .from('blog_post_tags')
          .insert(
            body.tag_ids.map((tagId) => ({
              post_id: id,
              tag_id: tagId,
            }))
          )
      }
    }

    return NextResponse.json({ post: data, message: 'Article modifié avec succès' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'article' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un article
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Article supprimé avec succès' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'article' },
      { status: 500 }
    )
  }
}
