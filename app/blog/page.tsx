import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, formatRelativeTime } from '@/lib/utils/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowRight, Search, TrendingUp, BookOpen, Tag as TagIcon } from 'lucide-react'
import type { BlogPost, BlogCategory, BlogTag } from '@/types/super-admin.types'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { BlogSearch } from '@/components/blog/blog-search'
import { BlogSidebar } from '@/components/blog/blog-sidebar'

export const metadata = {
  title: 'Blog | EDUZEN',
  description: 'Découvrez nos articles sur la formation professionnelle, la gestion d\'organisme de formation et bien plus encore.',
}

async function getBlogPosts(categoryId?: string, search?: string, page: number = 1, limit: number = 12) {
  const supabase = await createClient()
  const offset = (page - 1) * limit
  
  // Construire la requête de base
  const now = new Date().toISOString()
  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    // Articles publiés : soit published_at est NULL, soit published_at <= maintenant
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
  }

  const { data: posts, error, count } = await query

  if (error) {
    console.error('[Blog] Error fetching blog posts:', error)
    console.error('[Blog] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return { posts: [], total: 0 }
  }

  console.log(`[Blog] Found ${posts?.length || 0} published posts (total: ${count || 0})`)

  // Enrichir avec les catégories et tags
  const postsWithRelations = await Promise.all(
    (posts || []).map(async (post) => {
      // Récupérer la catégorie
      let category: BlogCategory | null = null
      if (post.category_id) {
        const { data: catData } = await supabase
          .from('blog_categories')
          .select('*')
          .eq('id', post.category_id)
          .maybeSingle()
        category = catData as BlogCategory | null
      }

      // Récupérer les tags
      const { data: postTags } = await supabase
        .from('blog_post_tags')
        .select('*')
        .eq('post_id', post.id)

      let tags: BlogTag[] = []
      if (postTags && postTags.length > 0) {
        // La table blog_post_tags a probablement une colonne tag_id
        const tagIds = postTags
          .map((pt: any) => pt.tag_id || pt.blog_tag_id)
          .filter(Boolean)
        if (tagIds.length > 0) {
          const { data: tagsData } = await supabase
            .from('blog_tags')
            .select('*')
            .in('id', tagIds)
          tags = (tagsData || []) as BlogTag[]
        }
      }

      return {
        ...post,
        tags,
        blog_categories: category,
      }
    })
  )

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
    console.error('[Blog] Error fetching featured posts:', error)
    return []
  }

  // Enrichir avec les catégories
  const postsWithCategories = await Promise.all(
    (posts || []).map(async (post) => {
      let category: BlogCategory | null = null
      if (post.category_id) {
        const { data: catData } = await supabase
          .from('blog_categories')
          .select('*')
          .eq('id', post.category_id)
          .maybeSingle()
        category = catData as BlogCategory | null
      }
      return {
        ...post,
        blog_categories: category,
      }
    })
  )

  return postsWithCategories as (BlogPost & { blog_categories?: BlogCategory | null })[]
}

async function getCategories() {
  const supabase = await createClient()
  
  // Récupérer toutes les catégories actives
  const { data: categories, error } = await supabase
    .from('blog_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  // Compter les articles publiés par catégorie
  const now = new Date().toISOString()
  const categoriesWithCount = await Promise.all(
    (categories || []).map(async (category) => {
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id)
        .eq('status', 'published')
        .or(`published_at.is.null,published_at.lte.${now}`)

      return {
        ...category,
        postsCount: count || 0,
      }
    })
  )

  // Filtrer les catégories qui ont au moins un article publié
  return categoriesWithCount
    .filter((cat) => cat.postsCount > 0)
    .map(({ postsCount, ...cat }) => cat) as BlogCategory[]
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const categoryId = params.category
  const search = params.search
  const page = parseInt(params.page || '1', 10)

  const [{ posts, total }, featuredPosts, categories] = await Promise.all([
    getBlogPosts(categoryId, search, page, 12),
    getFeaturedPosts(),
    getCategories(),
  ])

  const totalPages = Math.ceil(total / 12)
  const selectedCategory = categoryId
    ? categories.find((c) => c.id === categoryId)
    : null

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

        {/* Featured Posts */}
        {featuredPosts.length > 0 && page === 1 && !categoryId && !search && (
          <div className="mb-16">
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
                        <Badge variant="outline" className="mb-2 w-fit">
                          {post.blog_categories.name}
                        </Badge>
                      )}
                      <CardTitle className="line-clamp-2 group-hover:text-brand-blue transition-colors text-xl">
                        {post.title}
                      </CardTitle>
                      {post.excerpt && (
                        <CardDescription className="line-clamp-2 mt-2">
                          {post.excerpt}
                        </CardDescription>
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
                      <div className="flex items-center text-brand-blue group-hover:gap-2 transition-all">
                        <span className="font-semibold">Lire l'article</span>
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Filters */}
            <div className="mb-8">
              <BlogSearch initialSearch={search} />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Catégories :</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/blog">
                    <Badge
                      variant={!categoryId ? 'default' : 'outline'}
                      className={!categoryId ? 'bg-brand-blue text-white' : 'cursor-pointer hover:bg-gray-100'}
                    >
                      Tous
                    </Badge>
                  </Link>
                  {categories.map((category) => (
                    <Link key={category.id} href={`/blog?category=${category.id}`}>
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

            {/* Selected Category Info */}
            {selectedCategory && (
              <div className="mb-6 p-4 bg-brand-blue-ghost border border-brand-blue-pale rounded-lg">
                <p className="text-sm text-gray-600">
                  Affichage des articles de la catégorie :{' '}
                  <span className="font-semibold text-brand-blue">{selectedCategory.name}</span>
                </p>
              </div>
            )}

            {/* Search Results Info */}
            {search && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  Résultats de recherche pour : <span className="font-semibold">"{search}"</span>
                  {' '}({total} article{total > 1 ? 's' : ''})
                </p>
              </div>
            )}

            {/* Posts Grid */}
            {posts.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  {search ? 'Aucun article trouvé' : 'Aucun article publié pour le moment'}
                </p>
                <p className="text-sm text-gray-500">
                  {search
                    ? 'Essayez avec d\'autres mots-clés'
                    : 'Revenez bientôt pour découvrir nos contenus !'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  {posts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`}>
                      <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-brand-blue/20">
                        {post.featured_image_url && (
                          <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
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
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {post.blog_categories && (
                              <Badge variant="outline" className="text-xs">
                                {post.blog_categories.name}
                              </Badge>
                            )}
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                <TagIcon className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {post.tags.slice(0, 2).map((t) => t.name).join(', ')}
                                  {post.tags.length > 2 && '...'}
                                </span>
                              </div>
                            )}
                          </div>
                          <CardTitle className="line-clamp-2 group-hover:text-brand-blue transition-colors">
                            {post.title}
                          </CardTitle>
                          {post.excerpt && (
                            <CardDescription className="line-clamp-3 mt-2">
                              {post.excerpt}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                            <div className="flex items-center gap-4">
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
                          </div>
                          <div className="flex items-center text-brand-blue group-hover:gap-2 transition-all">
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
                  <div className="mt-12 flex justify-center gap-2">
                    {page > 1 && (
                      <Link
                        href={`/blog?${new URLSearchParams({
                          ...(categoryId && { category: categoryId }),
                          ...(search && { search }),
                          page: String(page - 1),
                        }).toString()}`}
                      >
                        <Button variant="outline">Précédent</Button>
                      </Link>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        // Afficher la première, dernière, et les pages autour de la page actuelle
                        return (
                          p === 1 ||
                          p === totalPages ||
                          (p >= page - 1 && p <= page + 1)
                        )
                      })
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1]
                        const showEllipsis = prev && p - prev > 1
                        return (
                          <div key={p} className="flex items-center gap-2">
                            {showEllipsis && <span className="px-2">...</span>}
                            <Link
                              href={`/blog?${new URLSearchParams({
                                ...(categoryId && { category: categoryId }),
                                ...(search && { search }),
                                page: String(p),
                              }).toString()}`}
                            >
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
                      <Link
                        href={`/blog?${new URLSearchParams({
                          ...(categoryId && { category: categoryId }),
                          ...(search && { search }),
                          page: String(page + 1),
                        }).toString()}`}
                      >
                        <Button variant="outline">Suivant</Button>
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <BlogSidebar categories={categories} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
