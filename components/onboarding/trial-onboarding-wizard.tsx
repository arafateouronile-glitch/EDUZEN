'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import {
  Building2,
  User,
  CreditCard,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

// Import des composants d'étapes
import {
  OrganizationProfileStep,
  type OrganizationProfileData,
} from './steps/organization-profile-step'
import { PersonalInfoStep, type PersonalInfoData } from './steps/personal-info-step'
import {
  PlanSelectionStep,
  type PlanSelectionData,
} from './steps/plan-selection-step'

// Étape paiement chargée côté client uniquement (évite problèmes Stripe iframe avec SSR/hydratation)
const PaymentSetupStep = dynamic(
  () => import('./steps/payment-setup-step').then((m) => ({ default: m.PaymentSetupStep })),
  { ssr: false, loading: () => <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-brand-blue" /></div> }
)

type WizardStep = 1 | 2 | 3 | 4

const steps = [
  { number: 1, title: 'Votre organisme', subtitle: 'Identité & coordonnées', icon: Building2 },
  { number: 2, title: 'Vos informations', subtitle: 'Contact principal', icon: User },
  { number: 3, title: 'Votre formule', subtitle: 'Choisissez votre plan', icon: Sparkles },
  { number: 4, title: 'Activation', subtitle: 'Démarrez votre essai', icon: CreditCard },
]

interface TrialOnboardingWizardProps {
  initialStep?: number
  returnSessionId?: string | null
  returnPlanId?: string | null
  returnBillingPeriod?: 'monthly' | 'yearly' | null
}

export function TrialOnboardingWizard({
  initialStep = 1,
  returnSessionId,
  returnPlanId,
  returnBillingPeriod,
}: TrialOnboardingWizardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const [currentStep, setCurrentStep] = useState<WizardStep>(
    Math.min(Math.max(initialStep, 1), 4) as WizardStep
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completingReturn, setCompletingReturn] = useState(false)

  // Données du formulaire
  const [orgData, setOrgData] = useState<OrganizationProfileData>({
    name: '',
    siret: '',
    nda: '',
    address: '',
    postalCode: '',
    city: '',
    logoUrl: undefined,
  })

  const [personalData, setPersonalData] = useState<PersonalInfoData>({
    firstName: '',
    lastName: '',
    phone: '',
    jobTitle: '',
  })

  const [planData, setPlanData] = useState<PlanSelectionData>({
    planId: null,
    planName: '',
    billingPeriod: 'monthly',
    price: 0,
  })

  // Mutation pour sauvegarder les données d'organisation et utilisateur
  const saveDataMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id || !user?.id) {
        throw new Error('Utilisateur ou organisation non trouvés')
      }

      // Mettre à jour l'organisation
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          name: orgData.name,
          settings: {
            siret: orgData.siret,
            nda: orgData.nda,
            address: orgData.address,
            postalCode: orgData.postalCode,
            city: orgData.city,
            logoUrl: orgData.logoUrl,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.organization_id)

      if (orgError) {
        logger.error('Erreur mise à jour organisation', orgError)
        throw orgError
      }

      // Mettre à jour l'utilisateur
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: personalData.firstName,
          last_name: personalData.lastName,
          full_name: `${personalData.firstName} ${personalData.lastName}`.trim(),
          phone: personalData.phone,
          job_title: personalData.jobTitle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (userError) {
        logger.error('Erreur mise à jour utilisateur', userError)
        throw userError
      }
    },
    onError: (error) => {
      logger.error('Erreur sauvegarde données', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos informations',
      })
    },
  })

  // Validation des étapes
  const canProceedStep1 = orgData.name.trim().length > 0
  const canProceedStep2 =
    personalData.firstName.trim().length > 0 &&
    personalData.lastName.trim().length > 0 &&
    personalData.phone.trim().length >= 10
  const canProceedStep3 = planData.planId !== null

  const handleNext = async () => {
    if (currentStep === 2) {
      // Sauvegarder les données avant de passer à l'étape 3
      await saveDataMutation.mutateAsync()
    }

    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as WizardStep)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep)
    }
  }

  const handlePaymentSuccess = async (data: {
    paymentMethodId: string
    customerId: string
    subscriptionId: string
    trialEndAt: string
  }) => {
    // Invalider les queries pour recharger les données
    await queryClient.invalidateQueries({ queryKey: ['session'] })
    await queryClient.invalidateQueries({ queryKey: ['user'] })
    await queryClient.invalidateQueries({ queryKey: ['subscription'] })

    addToast({
      type: 'success',
      title: 'Bienvenue !',
      description: `Votre essai gratuit de 14 jours a commencé. Premier prélèvement le ${new Date(data.trialEndAt).toLocaleDateString('fr-FR')}.`,
    })

    // Rediriger vers le dashboard
    router.push('/dashboard')
  }

  const handlePaymentError = (error: string) => {
    addToast({
      type: 'error',
      title: 'Erreur de paiement',
      description: error,
    })
  }

  // Retour depuis Stripe Checkout (mode setup) : finaliser l'abonnement avec session_id
  const sessionIdFromUrl = returnSessionId ?? searchParams.get('session_id')
  const planIdFromUrl = returnPlanId ?? searchParams.get('planId')
  const billingFromUrl = returnBillingPeriod ?? (searchParams.get('billingPeriod') as 'monthly' | 'yearly' | null)

  useEffect(() => {
    if (!sessionIdFromUrl || !planIdFromUrl || completingReturn || isSubmitting) return

    const complete = async () => {
      setCompletingReturn(true)
      setIsSubmitting(true)
      try {
        const setupRes = await fetch('/api/subscriptions/complete-checkout-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionIdFromUrl }),
        })
        const setupData = await setupRes.json().catch(() => ({}))
        if (!setupRes.ok) {
          throw new Error(setupData.error || 'Impossible de récupérer la carte')
        }
        const { paymentMethodId, customerId } = setupData
        if (!paymentMethodId || !customerId) {
          throw new Error('Données de paiement manquantes')
        }

        const subRes = await fetch('/api/subscriptions/create-trial-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: planIdFromUrl,
            billingPeriod: billingFromUrl || 'monthly',
            paymentMethodId,
            customerId,
          }),
        })
        const subData = await subRes.json().catch(() => ({}))
        if (!subRes.ok) {
          throw new Error(subData.error || 'Impossible de créer l\'abonnement')
        }

        await queryClient.invalidateQueries({ queryKey: ['session'] })
        await queryClient.invalidateQueries({ queryKey: ['user'] })
        await queryClient.invalidateQueries({ queryKey: ['subscription'] })
        handlePaymentSuccess({
          paymentMethodId,
          customerId,
          subscriptionId: subData.subscriptionId ?? '',
          trialEndAt: subData.trialEndAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
      } catch (error) {
        logger.error('Erreur finalisation après Stripe', error)
        addToast({
          type: 'error',
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Impossible de finaliser.',
        })
      } finally {
        setCompletingReturn(false)
        setIsSubmitting(false)
      }
    }

    complete()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount with URL params, callbacks would cause loop
  }, [sessionIdFromUrl, planIdFromUrl, billingFromUrl])

  // Démarrer l'essai sans carte bancaire
  const handleSkipPayment = async () => {
    if (!user?.organization_id || !planData.planId) return

    setIsSubmitting(true)

    try {
      // Créer l'abonnement d'essai sans méthode de paiement
      const response = await fetch('/api/subscriptions/create-trial-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planData.planId,
          billingPeriod: planData.billingPeriod,
          skipPaymentMethod: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création de l\'essai')
      }

      // Invalider les queries pour recharger les données
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      await queryClient.invalidateQueries({ queryKey: ['user'] })
      await queryClient.invalidateQueries({ queryKey: ['subscription'] })

      addToast({
        type: 'success',
        title: 'Bienvenue !',
        description: 'Votre essai gratuit de 14 jours a commencé. Pensez à ajouter votre carte avant la fin de l\'essai.',
      })

      // Petit délai pour laisser la DB propager les changements avant la redirection
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Rediriger vers le dashboard avec un flag pour bypasser le middleware
      router.push('/dashboard?onboarding_completed=true')
    } catch (error) {
      logger.error('Erreur skip payment', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isNextDisabled = () => {
    if (isSubmitting || saveDataMutation.isPending) return true

    switch (currentStep) {
      case 1:
        return !canProceedStep1
      case 2:
        return !canProceedStep2
      case 3:
        return !canProceedStep3
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-brand-blue/[0.02] to-brand-cyan/[0.05] flex items-center justify-center p-4 py-8">
      <div className={cn(
        "w-full transition-all duration-300",
        currentStep === 3 ? "max-w-6xl" : "max-w-4xl"
      )}>
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-cyan/10 text-brand-blue px-5 py-2 rounded-full text-sm font-semibold mb-5 border border-brand-cyan/20">
            <Sparkles className="w-4 h-4 text-brand-cyan" />
            Essai gratuit · 14 jours · Sans engagement
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-brand-blue mb-4 tracking-tight">
            Bienvenue sur EDUZEN
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Configurez votre espace en <span className="text-brand-blue font-semibold">quelques minutes</span> et rejoignez les organismes qui simplifient leur gestion administrative
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-10 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ease-apple',
                        isActive
                          ? 'bg-gradient-brand text-white scale-110 shadow-lg shadow-brand-blue/30'
                          : isCompleted
                          ? 'bg-brand-cyan text-white shadow-md'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-3 text-sm font-semibold transition-colors tracking-tight',
                        isActive ? 'text-brand-blue' : isCompleted ? 'text-brand-cyan' : 'text-gray-400'
                      )}
                    >
                      {step.title}
                    </span>
                    <span
                      className={cn(
                        'text-xs transition-colors',
                        isActive ? 'text-gray-600' : 'text-gray-400'
                      )}
                    >
                      {step.subtitle}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-4 h-1 relative">
                      <div className="absolute inset-0 bg-gray-200 rounded-full" />
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full transition-all duration-500 ease-apple',
                          isCompleted ? 'w-full' : 'w-0'
                        )}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className={cn("shadow-xl border-0 rounded-2xl overflow-hidden", currentStep === 3 && "overflow-visible")}>
          <CardHeader className="border-b bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5 py-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-2xl font-bold text-brand-blue tracking-tight">
                  {steps.find((s) => s.number === currentStep)?.title}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {steps.find((s) => s.number === currentStep)?.subtitle}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full border border-gray-200">
                <span className="text-brand-blue font-bold">{currentStep}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-500">{steps.length}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className={cn("p-6", currentStep === 3 && "p-8 overflow-visible")}>
            {/* Étapes 1-3 avec animations */}
            {currentStep < 4 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStep === 1 && (
                    <OrganizationProfileStep
                      data={orgData}
                      onChange={setOrgData}
                      organizationId={user?.organization_id ?? undefined}
                    />
                  )}

                  {currentStep === 2 && (
                    <PersonalInfoStep data={personalData} onChange={setPersonalData} />
                  )}

                  {currentStep === 3 && (
                    <PlanSelectionStep data={planData} onChange={setPlanData} />
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Étape 4 - Paiement : rendu SANS AnimatePresence pour éviter les conflits avec l'iframe Stripe */}
            {currentStep === 4 && (
              planData.planId ? (
                <PaymentSetupStep
                  planId={planData.planId}
                  planName={planData.planName}
                  billingPeriod={planData.billingPeriod}
                  price={planData.price}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onSkip={handleSkipPayment}
                  isSubmitting={isSubmitting}
                  setIsSubmitting={setIsSubmitting}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Sélectionnez d'abord votre plan
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Vous devez choisir un plan avant de configurer le paiement.
                  </p>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    className="bg-gradient-brand text-white"
                  >
                    Choisir un plan
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )
            )}

            {/* Navigation (sauf pour l'étape 4 qui a son propre bouton) */}
            {currentStep < 4 && (
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || isSubmitting}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Précédent
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={isNextDisabled()}
                  className="bg-gradient-brand text-white"
                >
                  {saveDataMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      Suivant
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Bouton précédent pour l'étape 4 */}
            {currentStep === 4 && (
              <div className="mt-6 pt-6 border-t">
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                  className="text-gray-500"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Changer de plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-gray-500">
            Une question ?{' '}
            <a href="mailto:support@eduzen.fr" className="text-brand-blue font-medium hover:text-brand-blue-dark transition-colors">
              Notre équipe vous répond en moins de 24h
            </a>
          </p>
          <p className="text-xs text-gray-400">
            Vos données sont sécurisées et hébergées en France
          </p>
        </div>
      </div>
    </div>
  )
}
