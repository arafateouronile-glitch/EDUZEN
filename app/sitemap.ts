import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.io'
  const currentDate = new Date()

  const comparatifDate = new Date('2025-01-01')

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: currentDate, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/demo`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/formations`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/a-propos`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/affiliation`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/auth/register`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/auth/login`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/legal/privacy`, lastModified: currentDate, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/legal/terms`, lastModified: currentDate, changeFrequency: 'yearly', priority: 0.3 },
    // Pages comparatif — priorité haute, concurrents recherchés par les OF
    { url: `${baseUrl}/comparatif`, lastModified: comparatifDate, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/comparatif/eduzen-vs-digiforma`, lastModified: comparatifDate, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/comparatif/eduzen-vs-dendreo`, lastModified: comparatifDate, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/comparatif/eduzen-vs-smartof`, lastModified: comparatifDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/comparatif/eduzen-vs-qualiobee`, lastModified: comparatifDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/comparatif/eduzen-vs-ymag`, lastModified: comparatifDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/comparatif/eduzen-vs-teachizy`, lastModified: comparatifDate, changeFrequency: 'monthly', priority: 0.8 },
  ]

  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const [blogResult, formationsResult, catalogueResult] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at')
        .eq('status', 'published')
        .or(`published_at.is.null,published_at.lte.${now}`)
        .order('published_at', { ascending: false }),
      supabase
        .from('public_formations')
        .select('slug, updated_at')
        .eq('is_public', true)
        .not('published_at', 'is', null),
      supabase
        .from('public_formations')
        .select('slug, updated_at')
        .eq('is_public', true)
        .not('published_at', 'is', null),
    ])

    const blogRoutes: MetadataRoute.Sitemap = (blogResult.data ?? []).map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updated_at ? new Date(post.updated_at) : currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

    const formationRoutes: MetadataRoute.Sitemap = (formationsResult.data ?? []).map((f) => ({
      url: `${baseUrl}/formations/${f.slug}`,
      lastModified: f.updated_at ? new Date(f.updated_at) : currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    const catalogueRoutes: MetadataRoute.Sitemap = (catalogueResult.data ?? []).map((f) => ({
      url: `${baseUrl}/cataloguepublic/${f.slug}`,
      lastModified: f.updated_at ? new Date(f.updated_at) : currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

    return [...staticRoutes, ...blogRoutes, ...formationRoutes, ...catalogueRoutes]
  } catch {
    return staticRoutes
  }
}
