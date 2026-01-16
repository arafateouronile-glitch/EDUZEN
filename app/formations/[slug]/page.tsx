/**
 * Page publique - Détail d'une formation
 * Route: /formations/[slug]
 * SEO optimisé avec métadonnées dynamiques
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicFormationDetail } from '@/components/public/formation-detail'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = await createClient()
  const { data: formation } = await supabase
    .from('public_formations')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_public', true)
    .not('published_at', 'is', null)
    .maybeSingle()

  if (!formation) {
    return {
      title: 'Formation non trouvée | EDUZEN',
    }
  }

  return {
    title: `${formation.seo_title || formation.public_title} | EDUZEN`,
    description: formation.seo_description || formation.public_description?.substring(0, 160) || '',
    keywords: formation.seo_keywords || [],
    openGraph: {
      title: formation.seo_title || formation.public_title,
      description: formation.seo_description || formation.public_description?.substring(0, 160) || '',
      images: formation.cover_image_url ? [formation.cover_image_url] : [],
      type: 'website',
    },
    alternates: {
      canonical: `/formations/${formation.slug}`,
    },
  }
}

export default async function FormationDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: formation } = await supabase
    .from('public_formations')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_public', true)
    .not('published_at', 'is', null)
    .maybeSingle()

  if (!formation || !formation.is_public) {
    notFound()
  }

  return <PublicFormationDetail formation={formation} />
}

