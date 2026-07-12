/**
 * Route d'embed catalogue — conçue pour être intégrée en iframe dans WordPress ou tout site tiers.
 * Pas de navbar/footer, pas de CSP restrictive (voir next.config.js /embed/:path*).
 * Envoie la hauteur au parent via postMessage pour l'auto-resize.
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicProgramsList } from '@/components/public/programs-list'
import { CatalogStyles } from '@/components/public/catalog-styles'
import { CatalogStats } from '@/components/public/catalog-stats'
import { CatalogOrganizationInfo } from '@/components/public/catalog-organization-info'
import { CatalogHero } from '@/components/public/catalog-hero'
import { CatalogSearchFilters } from '@/components/public/catalog-search-filters'
import { CatalogTestimonials, type CatalogTestimonial } from '@/components/public/catalog-testimonials'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function EmbedCatalogPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined
  const category = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined
  const cpfOnly = resolvedSearchParams.cpf === '1'

  const supabase = await createClient()

  let { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .ilike('code', slug)
    .maybeSingle()

  if (!organization) {
    const { data: orgById } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', slug)
      .maybeSingle()
    organization = orgById || null
  }

  if (!organization) notFound()

  const { data: catalogSettings } = await supabase
    .from('public_catalog_settings')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('is_enabled', true)
    .maybeSingle()

  let programsQuery = supabase
    .from('programs')
    .select('*, formations(*, sessions(*))')
    .eq('organization_id', organization.id)
    .eq('is_public', true)
    .eq('is_active', true)

  if (search) {
    programsQuery = programsQuery.or(
      `name.ilike.%${search}%,description.ilike.%${search}%,public_description.ilike.%${search}%`
    )
  }
  if (category) {
    programsQuery = programsQuery.eq('category', category)
  }
  if (cpfOnly) {
    programsQuery = programsQuery.eq('eligible_cpf', true)
  }

  const { data: programsData } = await programsQuery.order('created_at', { ascending: false })
  const programs = programsData ?? []

  const { data: facetRows } = await supabase
    .from('programs')
    .select('category, eligible_cpf')
    .eq('organization_id', organization.id)
    .eq('is_public', true)
    .eq('is_active', true)

  const availableCategories = Array.from(
    new Set((facetRows ?? []).map((row) => (row as { category: string | null }).category).filter((c): c is string => Boolean(c && c.trim())))
  ).sort((a, b) => a.localeCompare(b, 'fr'))
  const cpfEligibleCount = (facetRows ?? []).filter((row) => (row as { eligible_cpf?: boolean }).eligible_cpf).length

  type FormationRow = { is_active?: boolean; sessions?: Array<{ status?: string }> }
  type ProgramRow  = { formations?: FormationRow[] } & Record<string, unknown>

  const programsWithActiveContent = (programs as ProgramRow[]).map((program) => ({
    ...program,
    formations: (program.formations || [])
      .filter((f) => f.is_active)
      .map((formation) => ({
        ...formation,
        sessions: (formation.sessions || []).filter(
          (s: { status?: string }) => s.status === 'planned' || s.status === 'ongoing'
        ),
      })),
  }))

  const primaryColor    = catalogSettings?.primary_color || '#274472'
  const heroTitle       = catalogSettings?.hero_title    || organization.name || 'Catalogue des Formations'
  const heroSubtitle    = catalogSettings?.hero_subtitle || 'Découvrez nos formations professionnelles'
  const heroDescription = catalogSettings?.hero_description
  const heroButtonText  = catalogSettings?.hero_button_text || 'Voir les formations'
  const heroButtonLink  = catalogSettings?.hero_button_link || '#programmes'
  const coverImageUrl   = catalogSettings?.cover_image_url
  const logoUrl         = catalogSettings?.logo_url || organization.logo_url
  const totalLearners   = (catalogSettings as { stats_trained_students?: number } | null)?.stats_trained_students ?? 1200
  // Témoignages réels issus des évaluations de fin de formation, voir get_catalog_testimonials
  // (migration 20260710000002) — jamais de contenu saisi/hardcodé.
  // Cast `any` nécessaire : fonction absente des types générés tant que la migration n'a
  // pas été appliquée + `npm run db:generate` relancé.
  const { data: testimonialRows } = await supabase.rpc(
    'get_catalog_testimonials' as any,
    { p_organization_id: organization.id, p_limit: 9 } as any
  )
  const testimonials    = (testimonialRows ?? []) as CatalogTestimonial[]

  return (
    <>
      <CatalogStyles primaryColor={primaryColor} />
      <div className="bg-white">
        <CatalogHero
          title={heroTitle}
          subtitle={heroSubtitle}
          description={heroDescription}
          buttonText={heroButtonText}
          buttonLink={heroButtonLink}
          coverImageUrl={coverImageUrl}
          primaryColor={primaryColor}
          hasQualiopi={Boolean(organization.qualiopi_certificate_url)}
          cpfEligibleCount={cpfEligibleCount}
          totalLearners={totalLearners}
        />

        <CatalogOrganizationInfo
          organization={organization}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
        />

        <CatalogStats
          primaryColor={primaryColor}
          stats={{
            courses:         programsWithActiveContent.length,
            learners:        (catalogSettings as { stats_trained_students?: number } | null)?.stats_trained_students        ?? 1200,
            certifications:  (catalogSettings as { stats_satisfaction_rate?: number } | null)?.stats_satisfaction_rate      ?? 98,
            successRate:     (catalogSettings as { stats_success_rate?: number } | null)?.stats_success_rate               ?? 95,
          }}
        />

        <section id="programmes" className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <div className="flex justify-between items-center mb-12">
              <h2 className="font-display text-3xl font-bold text-gray-900">Nos programmes de formation</h2>
              <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl shadow text-gray-700 font-semibold">
                {programsWithActiveContent.length} programme{programsWithActiveContent.length > 1 ? 's' : ''}
              </div>
            </div>

            <Suspense fallback={<div className="h-[76px] rounded-2xl bg-white/60 mb-10 animate-pulse" />}>
              <CatalogSearchFilters categories={availableCategories} primaryColor={primaryColor} />
            </Suspense>

            {programsWithActiveContent.length > 0 ? (
              <PublicProgramsList
                programs={programsWithActiveContent as Parameters<typeof PublicProgramsList>[0]['programs']}
                primaryColor={primaryColor}
                isEmbed={true}
              />
            ) : (
              <p className="text-center text-gray-500 py-16 text-lg">
                {search || category || cpfOnly ? 'Aucun programme ne correspond à ces critères.' : 'Aucun programme disponible.'}
              </p>
            )}
          </div>
        </section>

        <CatalogTestimonials testimonials={testimonials} primaryColor={primaryColor} />
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){function s(){window.parent.postMessage({type:'eduzen-resize',height:document.documentElement.scrollHeight},'*')}s();new ResizeObserver(s).observe(document.body)})()`,
        }}
      />
    </>
  )
}
