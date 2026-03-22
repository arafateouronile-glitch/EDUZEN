/**
 * Page publique — /jury/success
 * Affichée après qu'un membre du jury a cliqué sur le lien de confirmation.
 * Aucune authentification requise.
 */

import type { Metadata } from 'next'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Réponse enregistrée — EDUZEN',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ action?: string; session?: string }>
}

export default async function JurySuccessPage({ searchParams }: PageProps) {
  const params  = await searchParams
  const action  = params.action
  const session = params.session ? decodeURIComponent(params.session) : null

  type Config = {
    icon: React.FC<{ className?: string }>
    iconBg: string
    iconColor: string
    title: string
    message: string
    sub?: string
  }

  const config: Record<string, Config> = {
    confirm: {
      icon: CheckCircle2,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      title: 'Présence confirmée !',
      message: `Votre confirmation a bien été enregistrée${session ? ` pour la session "${session}"` : ''}.`,
      sub: 'L\'organisme de formation a été notifié. Vous recevrez les informations pratiques prochainement.',
    },
    decline: {
      icon: XCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      title: 'Indisponibilité enregistrée',
      message: `Votre réponse a bien été enregistrée${session ? ` pour la session "${session}"` : ''}.`,
      sub: 'L\'organisme de formation a été informé de votre indisponibilité.',
    },
    invalid: {
      icon: AlertCircle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: 'Lien invalide',
      message: 'Ce lien de confirmation n\'est pas valide ou a déjà été utilisé.',
      sub: 'Contactez directement l\'organisme de formation si vous souhaitez répondre.',
    },
    error: {
      icon: AlertCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      title: 'Une erreur est survenue',
      message: 'Votre réponse n\'a pas pu être enregistrée.',
      sub: 'Veuillez contacter l\'organisme de formation.',
    },
  }

  const cfg = config[action || 'invalid'] || config.invalid
  const Icon = cfg.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header coloré */}
          <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-400" />

          <div className="p-10 text-center">
            {/* Icône */}
            <div className={`w-20 h-20 ${cfg.iconBg} rounded-full flex items-center justify-center mx-auto mb-6`}>
              <Icon className={`h-10 w-10 ${cfg.iconColor}`} />
            </div>

            {/* Titre */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {cfg.title}
            </h1>

            {/* Message principal */}
            <p className="text-gray-600 text-base leading-relaxed mb-3">
              {cfg.message}
            </p>

            {/* Sous-message */}
            {cfg.sub && (
              <p className="text-gray-400 text-sm leading-relaxed">
                {cfg.sub}
              </p>
            )}
          </div>

          {/* Footer branding */}
          <div className="px-10 pb-8 text-center">
            <p className="text-xs text-gray-300">
              Propulsé par{' '}
              <span className="font-semibold text-blue-400">EDUZEN</span>
              {' '}— Gestion des organismes de formation
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
