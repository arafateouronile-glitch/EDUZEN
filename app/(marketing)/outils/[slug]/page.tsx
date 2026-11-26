import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OutilPageShell } from '@/components/outils/outil-page-shell'
import { LeadMagnetForm } from '@/components/outils/lead-magnet-form'
import { OUTILS, outilBySlug, type OutilKey } from '@/lib/outils/tools'

/** Texte d'explication affiché sous le formulaire (référencement) */
const GUIDES: Record<OutilKey, { heading: string; points: string[] }> = {
  convention: {
    heading: 'Que doit contenir une convention de formation ?',
    points: [
      "L'intitulé, les objectifs, le contenu, la durée et les dates de l'action de formation (article L.6353-1 du Code du travail).",
      'Le prix et les modalités de règlement, ainsi que les conditions d’annulation et de dédommagement.',
      'Les coordonnées complètes de l’organisme : SIRET et numéro de déclaration d’activité.',
    ],
  },
  reglement: {
    heading: 'Le règlement intérieur, une obligation pour tout organisme',
    points: [
      'Tout organisme de formation doit établir un règlement intérieur applicable aux stagiaires (articles R.6352-1 et suivants du Code du travail).',
      'Il fixe les règles d’hygiène et de sécurité, la discipline, les sanctions et la représentation des stagiaires.',
      'Il doit être remis à chaque stagiaire avant son entrée en formation.',
    ],
  },
  certificat: {
    heading: 'Le certificat de réalisation, au modèle officiel',
    points: [
      'Il atteste que l’action de formation a bien été suivie, et conditionne le paiement par les financeurs (OPCO, CPF, France Travail).',
      'Notre générateur reprend le modèle publié par le Ministère du Travail, à établir sur votre papier en-tête.',
      'Vous devez conserver les pièces justificatives pendant 3 ans à compter de la fin de l’année du dernier paiement.',
    ],
  },
  emargement: {
    heading: "Des feuilles d'émargement conformes, par demi-journée",
    points: [
      "La feuille d'émargement prouve l'assiduité des stagiaires, demi-journée par demi-journée, et sert de preuve Qualiopi et auprès des financeurs.",
      'Chaque créneau doit être signé par le stagiaire et par le formateur.',
      "Avec EduZen, l'émargement se fait aussi en ligne par QR code, sans papier.",
    ],
  },
  qualiopi: {
    heading: 'Comment fonctionne l’auto-évaluation ?',
    points: [
      'Pour chacun des 32 indicateurs du Référentiel national qualité, indiquez si votre organisme est conforme.',
      'Vous obtenez un score global et par critère, puis un plan d’action détaillé par email.',
      'Cette auto-évaluation est indicative : elle vous aide à préparer l’audit, sans remplacer l’organisme certificateur.',
    ],
  },
}

export function generateStaticParams() {
  return Object.values(OUTILS).map((o) => ({ slug: o.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const outil = outilBySlug(slug)
  if (!outil) return {}
  return {
    title: `${outil.title} gratuit | EduZen`,
    description: outil.shortDescription,
    alternates: { canonical: `/outils/${outil.slug}` },
    openGraph: { title: `${outil.title} gratuit`, description: outil.shortDescription },
  }
}

export default async function OutilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const outil = outilBySlug(slug)
  if (!outil) notFound()
  const guide = GUIDES[outil.key]

  return (
    <OutilPageShell badge="Outil gratuit · PDF par email" title={outil.title} subtitle={outil.shortDescription}>
      <LeadMagnetForm tool={outil.key} />
      <section className="mt-12 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{guide.heading}</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-600">
          {guide.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
    </OutilPageShell>
  )
}
