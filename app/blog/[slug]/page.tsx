import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, ArrowLeft } from 'lucide-react'
import type { BlogPost } from '@/types/super-admin.types'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { ShareButton } from '@/components/blog/share-button'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { sanitizeBlogContent } from '@/lib/utils/sanitize-html'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!post) {
    return {
      title: 'Article non trouvé | EDUZEN',
    }
  }

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

  return post as BlogPost | null
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <article className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24">
        {/* Back Button */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-brand-blue hover:text-brand-blue-dark mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour au blog</span>
        </Link>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {post.is_featured && (
              <Badge className="bg-brand-blue text-white">À la une</Badge>
            )}
            {post.published_at && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(post.published_at, 'dd MMMM yyyy')}</span>
              </div>
            )}
            {post.reading_time_minutes && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{post.reading_time_minutes} min de lecture</span>
              </div>
            )}
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-cyan font-display">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {post.featured_image_url && (
            <div className="relative w-full h-64 md:h-96 lg:h-[500px] rounded-2xl overflow-hidden mb-8">
              <Image
                src={post.featured_image_url}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority
              />
            </div>
          )}
        </header>

        {/* Content - Sanitized to prevent XSS */}
        <div
          className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-blockquote:border-l-brand-blue prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-img:rounded-lg prose-img:shadow-lg"
          dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(post.content) }}
        />

        {/* Share Section */}
        <ShareButton post={post} />
      </article>

      <Footer />
    </div>
  )
}
