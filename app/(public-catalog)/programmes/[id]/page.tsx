/**
 * Page publique - Détail d'un programme
 * Route: /programmes/[id]
 * Affiche les détails d'un programme avec ses formations et sessions
 * Personnalisée pour l'organisme de formation
 */
// Revalider régulièrement pour afficher les mises à jour (image, description, durée, etc.)
export const revalidate = 60

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicProgramDetail } from '@/components/public/program-detail'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CatalogNavbar } from '@/components/public/catalog-navbar'
import { CatalogFooter } from '@/components/public/catalog-footer'
import { CatalogStyles } from '@/components/public/catalog-styles'
import { CatalogTestimonials, type CatalogTestimonial } from '@/components/public/catalog-testimonials'
import { CatalogSubNav } from '@/components/public/catalog-sub-nav'

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
  const activeSessions = (program.formations || [])
    .filter((f) => (f as { is_active?: boolean }).is_active)
    .flatMap((f) => {
      const formation = f as { sessions?: Array<{ id: string; status?: string }>; [key: string]: unknown }
      return (formation.sessions || []).filter(
        (s) => s.status === 'planned' || s.status === 'ongoing'
      )
    })

  const programWithActiveContent = {
    ...program,
    formations: (program.formations || [])
      .filter((f) => (f as { is_active?: boolean }).is_active)
      .map((formation) => {
        const f = formation as { sessions?: Array<{ status?: string }>; [key: string]: unknown }
        return {
          ...f,
          sessions: (f.sessions || []).filter(
            (s) => (s as { status?: string }).status === 'planned' || (s as { status?: string }).status === 'ongoing'
          ),
        }
      }),
  }

  // Utiliser createAdminClient pour bypasser RLS sur la table enrollment_form_links
  // (table nouvelle, pas de grant anon configuré)
  const adminDb = createAdminClient() as any

  // Liens par session + lien général (fallback) en parallèle
  const sessionIds = activeSessions.map((s) => s.id)

  const [sessionLinksResult, generalLinkResult] = await Promise.all([
    sessionIds.length > 0
      ? adminDb
          .from('enrollment_form_links')
          .select('session_id, token')
          .in('session_id', sessionIds)
          .eq('is_active', true)
      : Promise.resolve({ data: [] }),
    adminDb
      .from('enrollment_form_links')
      .select('token')
      .eq('org_id', organization.id)
      .is('session_id', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const enrollmentLinks: Record<string, string> = Object.fromEntries(
    ((sessionLinksResult.data ?? []) as Array<{ session_id: string; token: string }>)
      .filter((l) => l.session_id && l.token)
      .map((l) => [l.session_id, l.token])
  )
  const generalEnrollmentToken: string | undefined = generalLinkResult.data?.token ?? undefined

  // Témoignages réels issus des évaluations de fin de formation, restreints à CE
  // programme (voir get_catalog_testimonials, migration 20260710000002) — jamais
  // de contenu saisi/hardcodé.
  const { data: testimonialRows } = await supabase.rpc(
    'get_catalog_testimonials' as any,
    { p_organization_id: organization.id, p_limit: 6, p_program_id: id } as any
  )
  const testimonials = (testimonialRows ?? []) as CatalogTestimonial[]

  // Utiliser les valeurs des settings ou celles par défaut
  const logoUrl = catalogSettings?.logo_url || organization.logo_url
  const primaryColor = catalogSettings?.primary_color || '#274472'

  // Données structurées SEO (schema.org Course) — prix, sessions, organisme.
  // Échappement de "<" pour empêcher toute évasion du <script> via un champ
  // saisi par l'organisme (nom de programme, description, etc.).
  const programPrice = (program as { price?: number; price_enterprise?: number; price_individual?: number }).price
    ?? (program as { price_enterprise?: number }).price_enterprise
    ?? (program as { price_individual?: number }).price_individual
  const currency = (program as { currency?: string }).currency || 'EUR'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: program.name,
    description: program.public_description || program.description || undefined,
    provider: {
      '@type': 'Organization',
      name: organization.name,
    },
    ...(programPrice != null && Number(programPrice) > 0 ? {
      offers: {
        '@type': 'Offer',
        price: Number(programPrice),
        priceCurrency: currency,
        availability: 'https://schema.org/InStock',
      },
    } : {}),
    ...(activeSessions.length > 0 ? {
      hasCourseInstance: activeSessions.map((s) => ({
        '@type': 'CourseInstance',
        courseMode: (program as { modalities?: string }).modalities || 'Blended',
        startDate: (s as { start_date?: string }).start_date,
        endDate: (s as { end_date?: string }).end_date || undefined,
        ...((s as { location?: string }).location ? { location: { '@type': 'Place', name: (s as { location?: string }).location } } : {}),
      })),
    } : {}),
  }
  const jsonLdScript = JSON.stringify(jsonLd).replace(/</g, '\\u003c')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript }}
      />
      <CatalogStyles primaryColor={primaryColor} />
      <CatalogNavbar
        organizationName={organization.name ?? ''}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
      />
      <CatalogSubNav
        primaryColor={primaryColor}
        hasNavbar
        hasTestimonials={testimonials.length > 0}
        links={[
          { href: '#description', label: 'Présentation', iconKey: 'book' },
          ...(activeSessions.length > 0 ? [{ href: '#sessions', label: 'Sessions', iconKey: 'calendar' as const }] : []),
          ...((program.access_delay_days != null || program.accessibility_info) ? [{ href: '#accessibilite', label: 'Accessibilité', iconKey: 'accessibility' as const }] : []),
          ...(testimonials.length > 0 ? [{ href: '#avis', label: 'Avis', iconKey: 'message' as const }] : []),
        ]}
      />
      <div className="min-h-screen bg-white">
        <PublicProgramDetail
          program={programWithActiveContent as Parameters<typeof PublicProgramDetail>[0]['program']}
          primaryColor={primaryColor}
          organizationCode={organization.code ?? undefined}
          enrollmentLinks={enrollmentLinks}
          generalEnrollmentToken={generalEnrollmentToken}
          contactEmail={catalogSettings?.contact_email ?? organization.email ?? undefined}
        />
        <CatalogTestimonials testimonials={testimonials} primaryColor={primaryColor} />
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
