import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ClipboardCheck, FileSignature, FileText, ScrollText, Users } from 'lucide-react'
import { OutilPageShell } from '@/components/outils/outil-page-shell'
import { OUTILS, OUTIL_KEYS, type OutilKey } from '@/lib/outils/tools'

export const metadata: Metadata = {
  title: 'Outils gratuits pour organismes de formation | EduZen',
  description:
    "Générez gratuitement votre convention de formation, règlement intérieur, certificat de réalisation, feuilles d'émargement et évaluez votre conformité Qualiopi.",
  alternates: { canonical: '/outils' },
}

const ICONS: Record<OutilKey, React.ComponentType<{ className?: string }>> = {
  convention: FileSignature,
  reglement: ScrollText,
  certificat: FileText,
  emargement: Users,
  qualiopi: ClipboardCheck,
}

export default function OutilsPage() {
  return (
    <OutilPageShell
      badge="100 % gratuit · sans inscription"
      title="Les outils gratuits des organismes de formation"
      subtitle="Vos documents obligatoires, personnalisés à votre organisme et envoyés en PDF par email en 2 minutes."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {OUTIL_KEYS.map((key) => {
          const outil = OUTILS[key]
          const Icon = ICONS[key]
          return (
            <Link
              key={key}
              href={`/outils/${outil.slug}`}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-brand-blue/30 hover:shadow-md"
            >
              <Icon className="h-8 w-8 text-brand-blue" />
              <h2 className="mt-4 text-lg font-semibold leading-snug text-gray-900">{outil.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{outil.shortDescription}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-blue">
                Utiliser l&apos;outil <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          )
        })}
      </div>
    </OutilPageShell>
  )
}
