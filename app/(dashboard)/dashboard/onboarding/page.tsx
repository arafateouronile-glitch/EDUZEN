'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { TrialOnboardingWizard } from '@/components/onboarding/trial-onboarding-wizard'
import { Loader2 } from 'lucide-react'

function OnboardingContent() {
  const searchParams = useSearchParams()

  // Récupérer l'étape depuis les query params (pour reprendre où on en était)
  const stepParam = searchParams.get('step')
  const initialStep = stepParam ? parseInt(stepParam, 10) : 1

  // Vérifier la raison de la redirection
  const reason = searchParams.get('reason')
  const isPaymentRequired = reason === 'payment_required'
  const isTrialExpired = reason === 'trial_expired'

  return (
    <div className="min-h-screen overflow-auto">
      {isTrialExpired && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-center sticky top-0 z-10">
          <p className="text-red-800 text-sm font-medium">
            Votre période d&apos;essai de 14 jours est terminée. Ajoutez un moyen de paiement pour continuer à utiliser EDUZEN.
          </p>
        </div>
      )}
      {isPaymentRequired && !isTrialExpired && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center sticky top-0 z-10">
          <p className="text-amber-800 text-sm">
            Pour accéder à votre espace, veuillez finaliser votre inscription en ajoutant un moyen de paiement.
          </p>
        </div>
      )}
      <TrialOnboardingWizard
        initialStep={isPaymentRequired || isTrialExpired ? 4 : initialStep}
        returnSessionId={searchParams.get('session_id')}
        returnPlanId={searchParams.get('planId') ?? undefined}
        returnBillingPeriod={(searchParams.get('billingPeriod') as 'monthly' | 'yearly') ?? undefined}
      />
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-blue mx-auto mb-4" />
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}
