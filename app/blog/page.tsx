import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowRight, TrendingUp, BookOpen, Tag as TagIcon } from 'lucide-react'
import type { BlogPost, BlogCategory, BlogTag } from '@/types/super-admin.types'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { BlogSearch } from '@/components/blog/blog-search'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { logger } from '@/lib/utils/logger'

export const metadata = {
  title: 'Blog formation professionnelle — Qualiopi, LMS, gestion OF | EduZen',
  description: "Conseils et guides sur la gestion d'organisme de formation, Qualiopi, e-learning et LMS. Actualités de la formation professionnelle.",
}

async function getBlogPosts(
  categoryId?: string,
  tagSlug?: string,
  search?: string,
  page: number = 1,
  limit: number = 12
) {
  const supabase = await createClient()
  const offset = (page - 1) * limit
  const now = new Date().toISOString()

  // Si on filtre par tag, on récupère d'abord les IDs des posts associés à ce tag
  let tagPostIds: string[] | null = null
  if (tagSlug) {
    const { data: tag } = await supabase
      .from('blog_tags')
      .select('id')
      .eq('slug', tagSlug)
      .maybeSingle()

    if (tag) {
      const { data: postTags } = await supabase
        .from('blog_post_tags')
        .select('post_id')
        .eq('tag_id', tag.id)
      tagPostIds = (postTags || []).map((pt: { post_id: string }) => pt.post_id)
    } else {
      tagPostIds = [] // tag inconnu → aucun résultat
    }
  }

  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (tagPostIds !== null) {
    if (tagPostIds.length === 0) return { posts: [], total: 0 }
    query = query.in('id', tagPostIds)
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
  }

  const { data: posts, error, count } = await query

  if (error) {
    logger.error('[Blog] Error fetching blog posts:', error)
    return { posts: [], total: 0 }
  }

  const rawPosts = posts || []

  // Batch fetch categories (1 query)
  const categoryIds = [...new Set(rawPosts.map((p) => p.category_id).filter(Boolean) as string[])]
  const categoriesMap = new Map<string, BlogCategory>()
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase.from('blog_categories').select('*').in('id', categoryIds)
    cats?.forEach((c) => categoriesMap.set(c.id, c as BlogCategory))
  }

  // Batch fetch tags (2 queries: post_tags join + tags)
  const postIds = rawPosts.map((p) => p.id)
  const tagsMap = new Map<string, BlogTag[]>()
  if (postIds.length > 0) {
    const { data: postTagRows } = await supabase
      .from('blog_post_tags')
      .select('post_id, tag_id')
      .in('post_id', postIds)
    const allTagIds = [...new Set((postTagRows || []).map((pt: { tag_id?: string }) => pt.tag_id).filter((id): id is string => typeof id === 'string'))]
    const tagById = new Map<string, BlogTag>()
    if (allTagIds.length > 0) {
      const { data: tagsData } = await supabase.from('blog_tags').select('*').in('id', allTagIds)
      tagsData?.forEach((t) => tagById.set(t.id, t as BlogTag))
    }
    ;(postTagRows || []).forEach((pt: { post_id: string; tag_id?: string }) => {
      if (!pt.tag_id) return
      if (!tagsMap.has(pt.post_id)) tagsMap.set(pt.post_id, [])
      const tag = tagById.get(pt.tag_id)
      if (tag) tagsMap.get(pt.post_id)!.push(tag)
    })
  }

  const postsWithRelations = rawPosts.map((post) => ({
    ...post,
    blog_categories: categoriesMap.get(post.category_id) ?? null,
    tags: tagsMap.get(post.id) ?? [],
  }))

  return {
    posts: postsWithRelations as (BlogPost & { tags: BlogTag[]; blog_categories?: BlogCategory | null })[],
    total: count || 0,
  }
}

async function getFeaturedPosts() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .eq('is_featured', true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3)

  if (error) {
    logger.error('[Blog] Error fetching featured posts:', error)
    return []
  }

  const rawPosts = posts || []
  const catIds = [...new Set(rawPosts.map((p) => p.category_id).filter(Boolean) as string[])]
  const catsMap = new Map<string, BlogCategory>()
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from('blog_categories').select('*').in('id', catIds)
    cats?.forEach((c) => catsMap.set(c.id, c as BlogCategory))
  }

  return rawPosts.map((post) => ({
    ...post,
    blog_categories: catsMap.get(post.category_id) ?? null,
  })) as (BlogPost & { blog_categories?: BlogCategory | null })[]
}

async function getCategories() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: categories, error } = await supabase
    .from('blog_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    logger.error('Error fetching categories:', error)
    return []
  }

  // 1 query au lieu de N count queries parallèles
  const { data: postCatRows } = await supabase
    .from('blog_posts')
    .select('category_id')
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .not('category_id', 'is', null)

  const countByCat = new Map<string, number>()
  postCatRows?.forEach((p: { category_id: string }) => {
    countByCat.set(p.category_id, (countByCat.get(p.category_id) ?? 0) + 1)
  })

  return (categories || [])
    .filter((cat) => (countByCat.get(cat.id) ?? 0) > 0) as BlogCategory[]
}

async function getTagBySlug(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('blog_tags').select('*').eq('slug', slug).maybeSingle()
  return data as BlogTag | null
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const categoryId = params.category
  const tagSlug = params.tag
  const search = params.search
  const page = parseInt(params.page || '1', 10)

  const [{ posts, total }, featuredPosts, categories, selectedTag] = await Promise.all([
    getBlogPosts(categoryId, tagSlug, search, page, 12),
    getFeaturedPosts(),
    getCategories(),
    tagSlug ? getTagBySlug(tagSlug) : Promise.resolve(null),
  ])

  const totalPages = Math.ceil(total / 12)
  const selectedCategory = categoryId ? categories.find((c) => c.id === categoryId) : null
  const isFiltered = Boolean(categoryId || tagSlug || search)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p: Record<string, string> = {}
    if (categoryId) p.category = categoryId
    if (tagSlug) p.tag = tagSlug
    if (search) p.search = search
    if (page > 1) p.page = String(page)
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined) delete p[k]
      else p[k] = v
    })
    const qs = new URLSearchParams(p).toString()
    return `/blog${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50/50 to-white">
      <Navbar />

      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-cyan font-display">
            Blog EDUZEN
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Découvrez nos articles sur la formation professionnelle, la gestion d'organisme de formation,
            les bonnes pratiques et les actualités du secteur.
          </p>
        </div>

        {/* Featured Posts — page 1, sans filtre */}
        {featuredPosts.length > 0 && page === 1 && !isFiltered && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-brand-blue" />
              <h2 className="text-2xl font-bold text-gray-900">Articles à la une</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-brand-blue/30 overflow-hidden">
                    {post.featured_image_url && (
                      <div className="relative h-56 w-full overflow-hidden">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-brand-blue text-white">À la une</Badge>
                        </div>
                      </div>
                    )}
                    <CardHeader>
                      {post.blog_categories && (
                        <Badge variant="outline" className="mb-2 w-fit text-xs">
                          {post.blog_categories.name}
                        </Badge>
                      )}
                      <CardTitle className="line-clamp-2 group-hover:text-brand-blue transition-colors text-xl">
                        {post.title}
                      </CardTitle>
                      {post.excerpt && (
                        <CardDescription className="line-clamp-2 mt-2">{post.excerpt}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        {post.published_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(post.published_at, 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {post.reading_time_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{post.reading_time_minutes} min</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center text-brand-blue">
                        <span className="font-semibold">Lire l'article</span>
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search */}
            <div className="mb-8">
              <BlogSearch initialSearch={search} />
            </div>

            {/* Filtres catégories */}
            {categories.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Catégories :</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/blog">
                    <Badge
                      variant={!categoryId && !tagSlug ? 'default' : 'outline'}
                      className={!categoryId && !tagSlug ? 'bg-brand-blue text-white' : 'cursor-pointer hover:bg-gray-100'}
                    >
                      Tous
                    </Badge>
                  </Link>
                  {categories.map((category) => (
                    <Link key={category.id} href={buildUrl({ category: category.id, tag: undefined, page: undefined })}>
                      <Badge
                        variant={categoryId === category.id ? 'default' : 'outline'}
                        className={
                          categoryId === category.id
                            ? 'bg-brand-blue text-white'
                            : 'cursor-pointer hover:bg-gray-100'
                        }
                      >
                        {category.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Filtre actif : catégorie */}
            {selectedCategory && (
              <div className="mb-5 flex items-center gap-3 p-3 bg-brand-blue-ghost border border-brand-blue-pale rounded-lg">
                <BookOpen className="h-4 w-4 text-brand-blue flex-shrink-0" />
                <p className="text-sm text-gray-600 flex-1">
                  Catégorie : <span className="font-semibold text-brand-blue">{selectedCategory.name}</span>
                </p>
                <Link href="/blog" className="text-xs text-gray-500 hover:text-gray-700 underline">
                  Effacer
                </Link>
              </div>
            )}

            {/* Filtre actif : tag */}
            {selectedTag && (
              <div className="mb-5 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <TagIcon className="h-4 w-4 flex-shrink-0" style={{ color: selectedTag.color || undefined }} />
                <p className="text-sm text-gray-600 flex-1">
                  Tag :{' '}
                  <Badge
                    variant="outline"
                    className="ml-1"
                    style={{
                      borderColor: selectedTag.color || undefined,
                      color: selectedTag.color || undefined,
                    }}
                  >
                    {selectedTag.name}
                  </Badge>
                </p>
                <Link href="/blog" className="text-xs text-gray-500 hover:text-gray-700 underline">
                  Effacer
                </Link>
              </div>
            )}

            {/* Résultats de recherche */}
            {search && (
              <div className="mb-5 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 flex-1">
                  Recherche : <span className="font-semibold">"{search}"</span>{' '}
                  <span className="text-gray-400">({total} article{total > 1 ? 's' : ''})</span>
                </p>
              </div>
            )}

            {/* Grille d'articles */}
            {posts.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  {search ? 'Aucun article trouvé' : 'Aucun article publié pour le moment'}
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  {search
                    ? "Essayez avec d'autres mots-clés"
                    : 'Revenez bientôt pour découvrir nos contenus !'}
                </p>
                {isFiltered && (
                  <Link href="/blog">
                    <Button variant="outline">Voir tous les articles</Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  {posts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`}>
                      <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-brand-blue/20 overflow-hidden">
                        {post.featured_image_url && (
                          <div className="relative h-48 w-full overflow-hidden">
                            <img
                              src={post.featured_image_url}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {post.is_featured && (
                              <div className="absolute top-3 left-3">
                                <Badge className="bg-brand-blue text-white text-xs">À la une</Badge>
                              </div>
                            )}
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {post.blog_categories && (
                              <Badge variant="outline" className="text-xs">
                                {post.blog_categories.name}
                              </Badge>
                            )}
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                <TagIcon className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {post.tags
                                    .slice(0, 2)
                                    .map((t) => t.name)
                                    .join(', ')}
                                  {post.tags.length > 2 && '…'}
                                </span>
                              </div>
                            )}
                          </div>
                          <CardTitle className="line-clamp-2 group-hover:text-brand-blue transition-colors">
                            {post.title}
                          </CardTitle>
                          {post.excerpt && (
                            <CardDescription className="line-clamp-3 mt-2">{post.excerpt}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                            {post.published_at && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(post.published_at, 'dd MMM yyyy')}</span>
                              </div>
                            )}
                            {post.reading_time_minutes && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{post.reading_time_minutes} min</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center text-brand-blue">
                            <span className="font-semibold text-sm">Lire l'article</span>
                            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center items-center gap-2 flex-wrap">
                    {page > 1 && (
                      <Link href={buildUrl({ page: String(page - 1) })}>
                        <Button variant="outline">Précédent</Button>
                      </Link>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1]
                        const showEllipsis = prev && p - prev > 1
                        return (
                          <div key={p} className="flex items-center gap-2">
                            {showEllipsis && <span className="px-1 text-gray-400">…</span>}
                            <Link href={buildUrl({ page: String(p) })}>
                              <Button
                                variant={p === page ? 'default' : 'outline'}
                                className={p === page ? 'bg-brand-blue' : ''}
                              >
                                {p}
                              </Button>
                            </Link>
                          </div>
                        )
                      })}
                    {page < totalPages && (
                      <Link href={buildUrl({ page: String(page + 1) })}>
                        <Button variant="outline">Suivant</Button>
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <BlogSidebar categories={categories} />
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
