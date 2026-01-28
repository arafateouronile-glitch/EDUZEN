/**
 * Page publique - Catalogue personnalisé par organisation
 * Route: /cataloguepublic/[slug]
 * Affiche le catalogue public d'une organisation spécifique en utilisant son slug
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicProgramsList } from '@/components/public/programs-list'
import { createClient } from '@/lib/supabase/server'
import { CatalogNavbar } from '@/components/public/catalog-navbar'
import { CatalogFooter } from '@/components/public/catalog-footer'
import { CatalogStyles } from '@/components/public/catalog-styles'
import { CatalogHero } from '@/components/public/catalog-hero'
import { CatalogOrganizationInfo } from '@/components/public/catalog-organization-info'

import { CatalogStats } from '@/components/public/catalog-stats'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = await createClient()
  const { slug } = await params
  
  // Récupérer l'organisation par son code (slug) - recherche insensible à la casse
  let { data: organization } = await supabase
    .from('organizations')
    .select('name, code, logo_url')
    .ilike('code', slug)
    .maybeSingle()

  // Si pas trouvé avec ilike, essayer recherche exacte
  if (!organization) {
    const { data: orgExact } = await supabase
      .from('organizations')
      .select('name, code, logo_url')
      .eq('code', slug)
      .maybeSingle()
    organization = orgExact || null
  }

  // Si toujours pas trouvé et que c'est un UUID, essayer par ID
  if (!organization && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
    const { data: orgById } = await supabase
      .from('organizations')
      .select('name, code, logo_url')
      .eq('id', slug)
      .maybeSingle()
    organization = orgById || null
  }

  if (!organization) {
    return {
      title: 'Catalogue non trouvé',
    }
  }

  // Récupérer les paramètres du catalogue
  const { data: settings } = await supabase
    .from('public_catalog_settings')
    .select('meta_title, meta_description, meta_image_url, site_title')
    .eq('organization_id', (organization as any).id)
    .eq('is_enabled', true)
    .maybeSingle()

  return {
    title: settings?.meta_title || settings?.site_title || `${organization.name} - Catalogue des Formations`,
    description: settings?.meta_description || `Découvrez le catalogue complet de formations de ${organization.name}. Formations certifiées, éligibles CPF, avec inscription en ligne.`,
    keywords: ['formations', 'formation professionnelle', 'CPF', 'certification', 'formation continue'],
    openGraph: {
      title: settings?.meta_title || settings?.site_title || `${organization.name} - Catalogue des Formations`,
      description: settings?.meta_description || `Découvrez le catalogue complet de formations de ${organization.name}`,
      images: settings?.meta_image_url || organization.logo_url ? [settings?.meta_image_url || organization.logo_url!] : [],
      type: 'website',
    },
  }
}

export default async function PublicCatalogPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined
  const supabase = await createClient()

  // Récupérer l'organisation par son code (slug)
  // D'abord essayer par code (insensible à la casse), puis par ID si le slug est un UUID
  let { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .ilike('code', slug) // Recherche insensible à la casse
    .maybeSingle()

  // Si pas trouvé par code (avec ilike), essayer une recherche exacte
  if (!organization) {
    const { data: orgExact } = await supabase
      .from('organizations')
      .select('*')
      .eq('code', slug)
      .maybeSingle()
    organization = orgExact || null
  }

  // Si pas trouvé par code et que le slug ressemble à un UUID, essayer par ID
  if (!organization && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
    const { data: orgById } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', slug)
      .maybeSingle()
    organization = orgById || null
  }

  if (!organization) {
    // Ne pas logger le slug complet car peut contenir des informations sensibles
    notFound()
  }

  // Récupérer les paramètres du catalogue public
  const { data: catalogSettings } = await supabase
    .from('public_catalog_settings')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('is_enabled', true)
    .maybeSingle()

  // Récupérer les programmes publics de cette organisation
  let programsQuery = supabase
    .from('programs')
    .select(`
      *,
      formations(
        *,
        sessions(*)
      )
    `)
    .eq('organization_id', organization.id)
    .eq('is_public', true)
    .eq('is_active', true)

  if (search) {
    programsQuery = programsQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,public_description.ilike.%${search}%`)
  }

  const { data: programsData } = await programsQuery.order('created_at', { ascending: false })
  const programs = programsData || []

  // Filtrer les formations et sessions inactives
  const programsWithActiveContent = programs.map((program: any) => ({
    ...program,
    formations: (program.formations || []).filter((f: any) => f.is_active).map((formation: any) => ({
      ...formation,
      sessions: (formation.sessions || []).filter((s: any) => s.status === 'scheduled' || s.status === 'ongoing'),
    })),
  }))

  // Utiliser les valeurs des settings ou celles par défaut
  const heroTitle = catalogSettings?.hero_title || organization.name || 'Catalogue des Formations'
  const heroSubtitle = catalogSettings?.hero_subtitle || 'Découvrez nos formations professionnelles certifiées et éligibles au CPF'
  const heroDescription = catalogSettings?.hero_description
  const heroButtonText = catalogSettings?.hero_button_text || 'Découvrir nos formations'
  // Le bouton pointe vers une ancre sur la même page (section programmes)
  const heroButtonLink = catalogSettings?.hero_button_link || '#programmes'
  const logoUrl = catalogSettings?.logo_url || organization.logo_url
  const primaryColor = catalogSettings?.primary_color || '#274472'
  const coverImageUrl = catalogSettings?.cover_image_url

  return (
    <>
      <CatalogStyles primaryColor={primaryColor} />
      <CatalogNavbar 
        organizationName={organization.name}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
      />
      <div className="min-h-screen bg-white">
        {/* Hero Section Premium */}
        <CatalogHero
          title={heroTitle}
          subtitle={heroSubtitle}
          description={heroDescription}
          buttonText={heroButtonText}
          buttonLink={heroButtonLink}
          coverImageUrl={coverImageUrl}
          primaryColor={primaryColor}
        />

        {/* Informations de l'organisme Premium */}
        <CatalogOrganizationInfo
          organization={organization}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
        />

        {/* Statistiques Clés */}
        <CatalogStats 
          primaryColor={primaryColor}
          stats={{
            courses: programsWithActiveContent.length,
            learners: catalogSettings?.stats_trained_students ?? 1200,
            certifications: catalogSettings?.stats_satisfaction_rate ?? 98,
            successRate: catalogSettings?.stats_success_rate ?? 95
          }}
        />

        {/* Liste des programmes Premium */}
        <section id="programmes" className="py-24 lg:py-32 scroll-mt-20 relative overflow-hidden bg-gray-50">
          {/* Background sophistiqué */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50/60 via-white to-white" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          {/* Effet de lumière accent */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px opacity-30"
            style={{
              background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`,
            }}
          />
          
          <div className="relative container mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
              <div className="flex-1">
                <h2 className="text-4xl lg:text-6xl xl:text-7xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
                  {search ? `Résultats pour "${search}"` : 'Nos programmes de formation'}
                </h2>
                <div className="flex items-center gap-4">
                  <div 
                    className="h-2 w-32 rounded-full"
                    style={{ 
                      background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}88, transparent)` 
                    }}
                  />
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-300 to-transparent max-w-md" />
                </div>
              </div>
              <div className="px-6 py-3 bg-white/90 backdrop-blur-md border border-gray-200/60 rounded-2xl shadow-lg">
                <span className="text-gray-800 font-bold text-lg">
                  {programsWithActiveContent.length} programme{programsWithActiveContent.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {programsWithActiveContent.length > 0 ? (
              <PublicProgramsList programs={programsWithActiveContent} primaryColor={primaryColor} />
            ) : (
              <div className="text-center py-24">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 mb-8 shadow-lg">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-gray-600 text-xl font-semibold">
                  Aucun programme disponible pour le moment.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      <CatalogFooter
        organizationName={organization.name}
        footerContent={catalogSettings?.footer_text}
        contactEmail={catalogSettings?.contact_email || organization.email}
        contactPhone={catalogSettings?.contact_phone || organization.phone}
        contactAddress={catalogSettings?.contact_address || organization.address}
        primaryColor={primaryColor}
      />
    </>
  )
}

