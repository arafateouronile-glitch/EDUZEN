import type { Metadata } from 'next'
import Link from 'next/link'
import { unsubscribeLead } from '@/lib/outils/unsubscribe'

export const metadata: Metadata = {
  title: 'Désabonnement — EduZen',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function DesabonnementPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams
  const ok = t ? await unsubscribeLead(t) : false

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-3">
          {ok ? 'Vous êtes désabonné' : 'Lien invalide'}
        </h1>
        <p className="text-gray-600 mb-6">
          {ok
            ? "Vous ne recevrez plus nos emails de conseils. Nos outils gratuits restent à votre disposition."
            : "Ce lien de désabonnement n'est pas valide. Répondez simplement à l'un de nos emails pour ne plus les recevoir."}
        </p>
        <Link href="/outils" className="text-sm font-medium text-blue-600 hover:underline">
          Voir les outils gratuits
        </Link>
      </div>
    </main>
  )
}
