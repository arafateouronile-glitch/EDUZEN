'use client'

import { useTrial } from '@/lib/hooks/use-trial'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface TrialGateProps {
  children: React.ReactNode
  featureName: string
  featureDescription?: string
}

export function TrialGate({ children, featureName, featureDescription }: TrialGateProps) {
  const { isTrial } = useTrial()

  if (!isTrial) return <>{children}</>

  return (
    <div className="relative min-h-[400px]">
      {/* Contenu flou en arrière-plan */}
      <div className="pointer-events-none select-none blur-sm opacity-40 overflow-hidden max-h-[400px]">
        {children}
      </div>

      {/* Overlay paywall */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/60 to-white/95 backdrop-blur-[2px]">
        <div className="text-center max-w-md px-6 py-10">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gray-100 rounded-2xl">
              <Lock className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{featureName}</h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            {featureDescription ?? 'Cette fonctionnalité est disponible avec un abonnement payant. Souscrivez pour y accéder sans limite.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard/subscribe">
              <Button className="bg-brand-blue hover:bg-brand-blue/90 text-white gap-2">
                <Sparkles className="h-4 w-4" />
                Voir les formules
              </Button>
            </Link>
            <Link href="/dashboard/subscribe">
              <Button variant="outline" className="text-gray-600">
                En savoir plus
              </Button>
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Essai gratuit — abonnez-vous pour débloquer l'accès complet
          </p>
        </div>
      </div>
    </div>
  )
}
