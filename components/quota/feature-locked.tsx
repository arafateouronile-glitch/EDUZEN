import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FeatureLockedProps {
  featureName: string
  featureDescription?: string
}

/**
 * Écran de blocage plein écran pour une fonctionnalité non incluse dans le
 * forfait de l'organisation. Contrairement à `TrialGate`, ne floute pas de
 * contenu (utilisé dans des layouts serveur qui bloquent avant même de
 * rendre la page protégée).
 */
export function FeatureLocked({ featureName, featureDescription }: FeatureLockedProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-2xl bg-gray-100 p-4">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <h3 className="mb-2 text-xl font-bold text-gray-900">{featureName}</h3>
        <p className="mb-6 text-sm leading-relaxed text-gray-500">
          {featureDescription ??
            "Cette fonctionnalité n'est pas incluse dans votre forfait actuel. Passez à une formule supérieure pour y accéder."}
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/pricing?upgrade=true">
            <Button className="gap-2 bg-brand-blue text-white hover:bg-brand-blue/90">
              <Sparkles className="h-4 w-4" />
              Voir les forfaits
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
