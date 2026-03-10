/**
 * Page publique - Détail d'un programme
 * Route: /programmes/[id]
 * Affiche les détails d'un programme avec ses formations et sessions
 * Personnalisée pour l'organisme de formation
 */
// Revalider régulièrement pour afficher les mises à jour (image, description, durée, etc.)
export const revalidate = 60

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

  const organizationName = (program.organizations as { name?: string } | null)?.name || 'Organisme de Formation'

  const programImages = program as { public_image_url?: string; photo_url?: string }
  const imageUrl = programImages.public_image_url || programImages.photo_url
  return {
    title: `${program.name} | ${organizationName}`,
    description: program.public_description || program.description || '',
    openGraph: {
      title: program.name,
      description: program.public_description || program.description || '',
      images: imageUrl ? [imageUrl] : [],
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

  const organization = (program.organizations as { id: string; name?: string; logo_url?: string; code?: string; email?: string; phone?: string; address?: string } | null) || null

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
      .filter((f) => (f as { is_active?: boolean }).is_active)
      .map((formation) => {
        const f = formation as { sessions?: Array<{ status?: string }>; [key: string]: unknown }
        return {
          ...f,
          sessions: (f.sessions || []).filter(
            (s) => (s as { status?: string }).status === 'scheduled' || (s as { status?: string }).status === 'ongoing'
          ),
        }
      }),
  }

  // Utiliser les valeurs des settings ou celles par défaut
  const logoUrl = catalogSettings?.logo_url || organization.logo_url
  const primaryColor = catalogSettings?.primary_color || '#274472'

  return (
    <>
      <CatalogStyles primaryColor={primaryColor} />
      <CatalogNavbar 
        organizationName={organization.name ?? ''}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
      />
      <div className="min-h-screen bg-white">
        <PublicProgramDetail 
          program={programWithActiveContent as Parameters<typeof PublicProgramDetail>[0]['program']} 
          primaryColor={primaryColor}
          organizationCode={organization.code ?? undefined}
        />
      </div>
      <CatalogFooter
        organizationName={organization.name ?? ''}
        footerContent={catalogSettings?.footer_text}
        contactEmail={catalogSettings?.contact_email ?? organization.email ?? undefined}
        contactPhone={catalogSettings?.contact_phone ?? organization.phone ?? undefined}
        contactAddress={catalogSettings?.contact_address ?? organization.address ?? undefined}
        primaryColor={primaryColor}
      />
    </>
  )
}
