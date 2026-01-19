/**
 * Page publique - Catalogue des programmes
 * Route: /programmes
 * Affiche les programmes publics avec leurs formations et sessions
 */

import { Metadata } from 'next'
import { PublicProgramsList } from '@/components/public/programs-list'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { CatalogStyles } from '@/components/public/catalog-styles'

export const metadata: Metadata = {
  title: 'Catalogue des Formations | EDUZEN',
  description: 'Découvrez notre catalogue complet de formations professionnelles. Formations certifiées, éligibles CPF, avec inscription en ligne.',
  keywords: ['formations', 'formation professionnelle', 'CPF', 'certification', 'formation continue'],
  openGraph: {
    title: 'Catalogue des Formations | EDUZEN',
    description: 'Découvrez notre catalogue complet de formations professionnelles',
    type: 'website',
  },
}

export default async function ProgrammesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined
  const organizationId = typeof searchParams.org === 'string' ? searchParams.org : undefined

  const supabase = await createClient()

  // Récupérer les programmes publics avec leurs formations et sessions
  let programsQuery = supabase
    .from('programs')
    .select(`
      *,
      formations(
        *,
        sessions(*)
      )
    `)
    .eq('is_public', true)
    .eq('is_active', true)

  if (organizationId) {
    programsQuery = programsQuery.eq('organization_id', organizationId)
  }

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

  // Récupérer les informations de l'organisation si une seule organisation
  let organization = null
  if (organizationId || (programs.length > 0 && programs[0]?.organization_id)) {
    const orgId = organizationId || programs[0]?.organization_id
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle()
    
    organization = org
  }

  // Récupérer les paramètres du catalogue public
  let catalogSettings = null
  if (organizationId || (organization && organization.id)) {
    const orgId = organizationId || organization?.id
    if (orgId) {
      const { data: settings } = await supabase
        .from('public_catalog_settings')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_enabled', true)
        .maybeSingle()
    
      catalogSettings = settings
    }
  }

  // Utiliser les valeurs des settings ou celles par défaut
  const heroTitle = catalogSettings?.hero_title || organization?.name || 'Catalogue des Formations'
  const heroSubtitle = catalogSettings?.hero_subtitle || 'Découvrez nos formations professionnelles certifiées et éligibles au CPF'
  const heroDescription = catalogSettings?.hero_description
  const heroButtonText = catalogSettings?.hero_button_text || 'Découvrir nos formations'
  const heroButtonLink = catalogSettings?.hero_button_link || '/programmes'
  const logoUrl = catalogSettings?.logo_url || organization?.logo_url
  const primaryColor = catalogSettings?.primary_color || '#274472'
  const coverImageUrl = catalogSettings?.cover_image_url

  return (
    <>
      <CatalogStyles primaryColor={primaryColor} />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section avec image de couverture si disponible */}
        {coverImageUrl ? (
          <section className="relative h-96 w-full">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${coverImageUrl})` }}
            >
              <div className="absolute inset-0 bg-black/50" />
            </div>
            <div className="relative container mx-auto px-4 h-full flex items-center">
              <div className="max-w-3xl text-white">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  {heroTitle}
                </h1>
                {heroSubtitle && (
                  <p className="text-xl text-white/90 mb-4">
                    {heroSubtitle}
                  </p>
                )}
                {heroDescription && (
                  <p className="text-lg text-white/80 mb-6">
                    {heroDescription}
                  </p>
                )}
                <a
                  href={heroButtonLink}
                  className="inline-block px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  {heroButtonText}
                </a>
              </div>
            </div>
          </section>
        ) : (
          <section className="text-white py-16" style={{ backgroundColor: primaryColor }}>
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  {heroTitle}
                </h1>
                {heroSubtitle && (
                  <p className="text-xl opacity-90 mb-4">
                    {heroSubtitle}
                  </p>
                )}
                {heroDescription && (
                  <p className="text-lg opacity-80 mb-6">
                    {heroDescription}
                  </p>
                )}
                <a
                  href={heroButtonLink}
                  className="inline-block px-6 py-3 bg-white rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  style={{ color: primaryColor }}
                >
                  {heroButtonText}
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Informations de l'organisme */}
        {organization && (
          <section className="bg-white border-b py-8">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={organization.name}
                      className="h-16 w-auto object-contain"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{organization.name}</h2>
                    {organization.address && (
                      <p className="text-gray-600">{organization.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Lien vers l'attestation Qualiopi */}
                  {organization.qualiopi_certificate_url && (
                    <a
                      href={organization.qualiopi_certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <span>Attestation Qualiopi</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Liste des programmes */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {search ? `Résultats pour "${search}"` : 'Nos programmes de formation'}
              </h2>
              <div className="text-gray-600">
                {programsWithActiveContent.length} programme{programsWithActiveContent.length > 1 ? 's' : ''}
              </div>
            </div>

            {programsWithActiveContent.length > 0 ? (
              <PublicProgramsList programs={programsWithActiveContent} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  Aucun programme disponible pour le moment.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}

