import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, TrendingUp, BookOpen, Tag as TagIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { BlogCategory, BlogPost } from '@/types/super-admin.types'

async function getRecentPosts(limit: number = 5) {
  const supabase = await createClient()
  const now = new Date().toISOString()
  
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, published_at, featured_image_url')
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    console.error('[Blog] Error fetching recent posts:', error)
    return []
  }

  return (posts || []) as BlogPost[]
}

async function getPopularTags(limit: number = 10) {
  const supabase = await createClient()
  
  const { data: tags, error } = await supabase
    .from('blog_tags')
    .select('id, name, slug, color')
    .limit(limit)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tags:', error)
    return []
  }

  return tags || []
}

export async function BlogSidebar({ categories }: { categories: BlogCategory[] }) {
  const [recentPosts, popularTags] = await Promise.all([
    getRecentPosts(5),
    getPopularTags(10),
  ])

  return (
    <div className="space-y-6">
      {/* Categories */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-brand-blue" />
              Catégories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/blog?category=${category.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-700 group-hover:text-brand-blue">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-brand-blue" />
              Articles récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="flex gap-3 group"
                >
                  {post.featured_image_url && (
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-brand-blue transition-colors">
                      {post.title}
                    </h3>
                    {post.published_at && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(post.published_at, 'dd MMM yyyy')}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TagIcon className="h-5 w-5 text-brand-blue" />
              Tags populaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog?tag=${tag.slug}`}
                  className="inline-block"
                >
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: tag.color || undefined,
                      color: tag.color || undefined,
                    }}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Newsletter CTA */}
      <Card className="bg-gradient-to-br from-brand-blue to-brand-cyan text-white border-0">
        <CardHeader>
          <CardTitle className="text-white">Restez informé</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/90 mb-4">
            Recevez nos derniers articles directement dans votre boîte mail.
          </p>
          <Link href="/auth/register">
            <button className="w-full px-4 py-2 bg-white text-brand-blue rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              S'inscrire
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
