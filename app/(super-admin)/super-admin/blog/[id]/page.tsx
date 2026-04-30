'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { BlogPostEditor } from '@/components/super-admin/blog/blog-post-editor'
import { motion } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { BlogPost, BlogCategory, BlogTag, CreateBlogPostInput } from '@/types/super-admin.types'

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['blog-post', id],
    queryFn: async (): Promise<BlogPost | null> => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`*, category:blog_categories(*), tags:blog_post_tags(tag:blog_tags(*))`)
        .eq('id', id)
        .maybeSingle()

      if (error || !data) return null
      return {
        ...data,
        tags: (data.tags ?? []).map((t: any) => t.tag).filter(Boolean),
      } as BlogPost
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async (): Promise<BlogCategory[]> => {
      const { data } = await supabase
        .from('blog_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      return (data ?? []) as BlogCategory[]
    },
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['blog-tags'],
    queryFn: async (): Promise<BlogTag[]> => {
      const { data } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name', { ascending: true })
      return (data ?? []) as BlogTag[]
    },
  })

  const handleSave = async (data: CreateBlogPostInput) => {
    const response = await fetch(`/api/super-admin/blog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Erreur lors de la sauvegarde')
    }
    toast.success('Article sauvegardé')
  }

  const handlePublish = async (data: CreateBlogPostInput) => {
    const response = await fetch(`/api/super-admin/blog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, status: 'published' }),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Erreur lors de la publication')
    }
    toast.success('Article publié avec succès')
    router.push('/super-admin/blog')
  }

  // Single return — structure stable pour éviter le hydration mismatch
  return (
    <PlatformAdminGuard requiredPermission="manage_blog">
      <div className="space-y-6">
        {postLoading ? (
          // Skeleton chargement
          <>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-[600px] w-full rounded-lg" />
          </>
        ) : !post ? (
          // Article introuvable
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <p className="text-lg font-semibold">Article introuvable</p>
            <p className="text-sm text-muted-foreground">
              Cet article n'existe pas ou vous n'avez pas les droits pour y accéder.
            </p>
            <Button variant="outline" asChild>
              <Link href="/super-admin/blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la liste
              </Link>
            </Button>
          </div>
        ) : (
          // Éditeur
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/super-admin/blog">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-bold tracking-tight"
                  >
                    Modifier l'article
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-muted-foreground text-sm truncate max-w-md"
                  >
                    {post.title}
                  </motion.p>
                </div>
              </div>

              {post.status === 'published' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/blog/${post.slug}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Voir sur le site
                  </Link>
                </Button>
              )}
            </div>

            <BlogPostEditor
              post={post}
              categories={categories}
              tags={tags}
              onSave={handleSave}
              onPublish={handlePublish}
            />
          </>
        )}
      </div>
    </PlatformAdminGuard>
  )
}
