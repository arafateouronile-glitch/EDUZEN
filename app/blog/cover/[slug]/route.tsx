/**
 * GET /blog/cover/[slug] — couverture générée d'un article de blog (1200×630),
 * utilisée quand aucune image n'a été choisie dans le super-admin.
 * Seuls les articles publiés et parus ont une couverture (lecture via la RLS publique).
 */

import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const WIDTH = 1200
const HEIGHT = 630

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, reading_time_minutes, blog_categories(name)')
    .eq('slug', slug)
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .maybeSingle()

  if (!post) return new Response('Not found', { status: 404 })

  const row = post as {
    title: string
    reading_time_minutes: number | null
    blog_categories: { name?: string } | { name?: string }[] | null
  }
  const categoryRaw = Array.isArray(row.blog_categories) ? row.blog_categories[0] : row.blog_categories
  const category = categoryRaw?.name ? categoryRaw.name.charAt(0) + categoryRaw.name.slice(1).toLowerCase() : 'Blog'
  const title = row.title
  const fontSize = title.length > 90 ? 50 : title.length > 60 ? 58 : 66

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #335ACF 0%, #34B9EE 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              padding: '10px 22px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.18)',
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            {category}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1 }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28 }}>
          <div style={{ display: 'flex', fontWeight: 700, fontSize: 36 }}>EduZen</div>
          <div style={{ display: 'flex', opacity: 0.9 }}>
            {row.reading_time_minutes ? `${row.reading_time_minutes} min de lecture · ` : ''}eduzen.io/blog
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
    }
  )
}
