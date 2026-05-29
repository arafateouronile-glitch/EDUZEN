import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Clock, ArrowLeft, ArrowRight, Tag as TagIcon } from 'lucide-react'
import type { BlogPost, BlogCategory, BlogTag } from '@/types/super-admin.types'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { ShareButton } from '@/components/blog/share-button'
import { ReadingProgress } from '@/components/blog/reading-progress'
import { logger } from '@/lib/utils/logger'
import { sanitizeBlogContent } from '@/lib/utils/sanitize-html'

const BLOG_STATIC_PARAMS_LIMIT = 20

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('status', 'published')
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order('published_at', { ascending: false })
      .limit(BLOG_STATIC_PARAMS_LIMIT)
    return (data ?? []).map((row) => ({ slug: row.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!post) return { title: 'Article non trouvé | EDUZEN' }

  return {
    title: `${post.meta_title || post.title} | EDUZEN Blog`,
    description: post.meta_description || post.excerpt || '',
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || '',
      images: post.featured_image_url ? [post.featured_image_url] : [],
    },
  }
}

async function getBlogPost(slug: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .maybeSingle()

  if (error) {
    logger.error('[Blog] Error fetching blog post:', error)
    return null
  }

  if (!post) return null

  // Catégorie
  let category: BlogCategory | null = null
  if (post.category_id) {
    const { data } = await supabase
      .from('blog_categories')
      .select('*')
      .eq('id', post.category_id)
      .maybeSingle()
    category = data as BlogCategory | null
  }

  // Tags
  let tags: BlogTag[] = []
  const { data: postTags } = await supabase
    .from('blog_post_tags')
    .select('tag_id')
    .eq('post_id', post.id)

  if (postTags && postTags.length > 0) {
    const tagIds = postTags
      .map((pt: { tag_id?: string }) => pt.tag_id)
      .filter((id): id is string => typeof id === 'string')
    if (tagIds.length > 0) {
      const { data: tagsData } = await supabase.from('blog_tags').select('*').in('id', tagIds)
      tags = (tagsData || []) as BlogTag[]
    }
  }

  return { ...post, blog_categories: category, tags } as BlogPost & {
    blog_categories: BlogCategory | null
    tags: BlogTag[]
  }
}

async function getRelatedPosts(postId: string, categoryId: string | null, limit: number = 3) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image_url, published_at, reading_time_minutes, category_id')
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .neq('id', postId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query
  if (error) {
    logger.error('[Blog] Error fetching related posts:', error)
    return []
  }

  // Si pas assez d'articles dans la même catégorie, on complète sans filtre
  if ((data || []).length < limit && categoryId) {
    const existing = (data || []).map((p) => p.id)
    let moreQuery = supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image_url, published_at, reading_time_minutes, category_id')
      .eq('status', 'published')
      .or(`published_at.is.null,published_at.lte.${now}`)
      .neq('id', postId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit - (data || []).length)

    if (existing.length > 0) {
      moreQuery = moreQuery.not('id', 'in', `(${existing.join(',')})`)
    }

    const { data: more } = await moreQuery
    return [...(data || []), ...(more || [])] as Partial<BlogPost>[]
  }

  return (data || []) as Partial<BlogPost>[]
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPost(slug)

  if (!post) notFound()

  const relatedPosts = await getRelatedPosts(post.id, post.category_id || null)

  return (
    <div className="min-h-screen bg-white">
      <ReadingProgress />
      <Navbar />

      <article className="container mx-auto px-4 md:px-6 lg:px-8 pt-16 md:pt-24 pb-12">
        {/* Retour */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-brand-blue hover:text-brand-blue-dark mb-10 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Retour au blog</span>
        </Link>

        {/* En-tête de l'article */}
        <header className="max-w-3xl mx-auto mb-10">
          {/* Badges catégorie + "À la une" */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {post.is_featured && (
              <Badge className="bg-brand-blue text-white">À la une</Badge>
            )}
            {post.blog_categories && (
              <Link href={`/blog?category=${post.blog_categories.id}`}>
                <Badge variant="outline" className="hover:bg-gray-50 transition-colors cursor-pointer">
                  {post.blog_categories.name}
                </Badge>
              </Link>
            )}
          </div>

          {/* Titre */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-cyan font-display leading-tight">
            {post.title}
          </h1>

          {/* Extrait */}
          {post.excerpt && (
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">{post.excerpt}</p>
          )}

          {/* Méta : date + temps de lecture */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b border-gray-100">
            {post.published_at && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(post.published_at, 'dd MMMM yyyy')}</span>
              </div>
            )}
            {post.reading_time_minutes && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{post.reading_time_minutes} min de lecture</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <TagIcon className="h-4 w-4 text-gray-400" />
              {post.tags.map((tag) => (
                <Link key={tag.id} href={`/blog?tag=${tag.slug}`}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-50 transition-colors text-xs"
                    style={{
                      borderColor: tag.color || undefined,
                      color: tag.color || undefined,
                    }}
                  >
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* Image à la une */}
        {post.featured_image_url && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="relative w-full h-64 md:h-96 lg:h-[480px] rounded-2xl overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Corps de l'article */}
        <div
          className="max-w-3xl mx-auto prose prose-lg prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-blockquote:border-l-brand-blue prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-img:rounded-lg prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(post.content) }}
        />

        {/* Partage + tags */}
        <div className="max-w-3xl mx-auto">
          <ShareButton post={post} />
        </div>
      </article>

      {/* Articles connexes */}
      {relatedPosts.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-100 py-16">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Articles connexes</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link key={related.id} href={`/blog/${related.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group border hover:border-brand-blue/20 overflow-hidden bg-white">
                    {related.featured_image_url && (
                      <div className="relative h-44 w-full overflow-hidden">
                        <img
                          src={related.featured_image_url}
                          alt={related.title || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-brand-blue transition-colors">
                        {related.title}
                      </h3>
                      {related.excerpt && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{related.excerpt}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        {related.published_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(related.published_at, 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {related.reading_time_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{related.reading_time_minutes} min</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex items-center text-brand-blue text-sm font-semibold">
                        Lire l'article
                        <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
