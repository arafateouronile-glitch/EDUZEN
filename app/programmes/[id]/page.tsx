/**
 * Page publique - Détail d'un programme
 * Route: /programmes/[id]
 * Affiche les détails d'un programme avec ses formations et sessions
 * Personnalisée pour l'organisme de formation
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicProgramDetail } from '@/components/public/program-detail'
import { createClient } from '@/lib/supabase/server'
import { CatalogNavbar } from '@/components/public/catalog-navbar'
import { CatalogFooter } from '@/components/public/catalog-footer'
import { CatalogStyles } from '@/components/public/catalog-styles'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: program } = await supabase
    .from('programs')
    .select(`
      *,
      organizations(name, code)
    `)
    .eq('id', id)
    .eq('is_public', true)
    .eq('is_active', true)
    .maybeSingle()

  if (!program) {
    return {
      title: 'Programme non trouvé',
    }
  }

  const organizationName = (program.organizations as any)?.name || 'Organisme de Formation'

  return {
    title: `${program.name} | ${organizationName}`,
    description: program.public_description || program.description || '',
    openGraph: {
      title: program.name,
      description: program.public_description || program.description || '',
      images: program.public_image_url ? [program.public_image_url] : [],
      type: 'website',
    },
  }
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Récupérer le programme avec ses formations et sessions
  const { data: program } = await supabase
    .from('programs')
    .select(`
      *,
      formations(
        *,
        sessions(*)
      ),
      organizations(*)
    `)
    .eq('id', id)
    .eq('is_public', true)
    .eq('is_active', true)
    .maybeSingle()

  if (!program) {
    notFound()
  }

  const organization = (program.organizations as any) || null

  if (!organization) {
    notFound()
  }

  // Récupérer les paramètres du catalogue public
  const { data: catalogSettings } = await supabase
    .from('public_catalog_settings')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('is_enabled', true)
    .maybeSingle()

  // Filtrer les formations et sessions actives
  const programWithActiveContent = {
    ...program,
    formations: (program.formations || [])
      .filter((f: any) => f.is_active)
      .map((formation: any) => ({
        ...formation,
        sessions: (formation.sessions || []).filter(
          (s: any) => s.status === 'scheduled' || s.status === 'ongoing'
        ),
      })),
  }

  // Utiliser les valeurs des settings ou celles par défaut
  const logoUrl = catalogSettings?.logo_url || organization.logo_url
  const primaryColor = catalogSettings?.primary_color || '#274472'

  return (
    <>
      <CatalogStyles primaryColor={primaryColor} />
      <CatalogNavbar 
        organizationName={organization.name}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
      />
      <div className="min-h-screen bg-white">
        <PublicProgramDetail 
          program={programWithActiveContent} 
          primaryColor={primaryColor}
          organizationCode={organization.code || undefined}
        />
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
