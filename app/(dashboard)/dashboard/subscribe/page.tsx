'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Sparkles,
  Zap,
  Users,
  Calendar,
  Shield,
  Award,
  ArrowRight,
  CreditCard,
  Loader2,
  FileCheck,
  GraduationCap,
  Bell,
  Building2,
} from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { formatCurrency, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { TrialSummaryBanner } from '@/components/subscribe/trial-summary-banner'

type Plan = {
  id: string
  name: string
  description: string | null
  price_monthly_ht: number | null
  price_yearly_ht: number | null
  max_students: number | null
  max_sessions_per_month: number | null
  features: Record<string, unknown>
  stripe_price_id: string | null
  is_active: boolean
}

type BillingPeriod = 'monthly' | 'yearly'

export default function SubscribePage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly')
  const [isProcessing, setIsProcessing] = useState(false)

  // Récupérer les plans disponibles
  const { data: plans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly_ht', { ascending: true })
      
      if (error) {
        logger.error('Erreur récupération plans', error)
        throw error
      }
      
      return (data || []) as Plan[]
    },
  })

  // Récupérer l'abonnement actuel de l'organisation
  const { data: currentSubscription } = useQuery({
    queryKey: ['subscription', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      
      const q = supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .maybeSingle()
      const { data, error } = await q
      
      if (error) {
        logger.error('Erreur récupération subscription', error)
        return null
      }
      
      return data
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour créer un checkout Stripe
  const createCheckoutMutation = useMutation({
    mutationFn: async ({ planId, billingPeriod }: { planId: string; billingPeriod: BillingPeriod }) => {
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingPeriod,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json()
        throw new Error(errorBody.error || errorBody.message || 'Erreur lors de la création du checkout')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Rediriger vers Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    },
    onError: (error: Error) => {
      logger.error('Erreur création checkout', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible de créer la session de paiement',
      })
      setIsProcessing(false)
    },
  })

  const handleSubscribe = async (planId: string) => {
    if (!user?.organization_id) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Vous devez être connecté pour vous abonner',
      })
      return
    }

    setIsProcessing(true)
    createCheckoutMutation.mutate({ planId, billingPeriod })
  }

  const getPlanPrice = (plan: Plan) => {
    if (billingPeriod === 'yearly' && plan.price_yearly_ht) {
      return plan.price_yearly_ht
    }
    return plan.price_monthly_ht || 0
  }

  const getYearlySavings = (plan: Plan): number => {
    if (!plan.price_monthly_ht || !plan.price_yearly_ht) return 0
    return Math.round(plan.price_monthly_ht * 12 - plan.price_yearly_ht)
  }

  // Économies max parmi tous les plans (pour l'encart d'incitation)
  const maxSavings = plans ? Math.max(...plans.map(getYearlySavings)) : 0

  const getPlanFeatures = (plan: Plan) => {
    const features = (plan.features || {}) as Record<string, unknown>
    return [
      {
        label: 'Apprenants',
        value: plan.max_students ? `${plan.max_students} apprenants` : 'Illimité',
        icon: Users,
      },
      {
        label: 'Sessions par mois',
        value: plan.max_sessions_per_month ? `${plan.max_sessions_per_month} sessions` : 'Illimité',
        icon: Calendar,
      },
      ...(features.bpf_export === true ? [{ label: 'Export BPF automatisé', value: 'Inclus', icon: FileCheck }] : []),
      ...(features.e_learning === true ? [{ label: 'Portail e-learning', value: 'Inclus', icon: GraduationCap }] : []),
      ...(features.qualiopi_dashboard === true ? [{ label: 'Dashboard Qualiopi', value: 'Inclus', icon: Shield }] : []),
      ...(features.automated_reminders === true ? [{ label: 'Relances automatiques', value: 'Inclus', icon: Bell }] : []),
      ...(features.white_label === true ? [{ label: 'Marque blanche / URL personnalisée', value: 'Inclus', icon: Zap }] : []),
      ...(features.multi_establishments === true ? [{ label: 'Multi-établissements', value: 'Inclus', icon: Building2 }] : []),
    ]
  }

  // Si l'utilisateur a déjà un abonnement actif, rediriger vers le dashboard
  useEffect(() => {
    if (currentSubscription && currentSubscription.status === 'active') {
      addToast({
        type: 'info',
        title: 'Abonnement actif',
        description: 'Vous avez déjà un abonnement actif',
      })
      router.push('/dashboard')
    }
  }, [currentSubscription, router, addToast])

  if (isLoadingPlans) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue mx-auto mb-4" />
          <p className="text-gray-600">Chargement des plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header Premium */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-1 bg-gradient-brand-subtle rounded-lg blur opacity-75"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-lg px-8 py-6 border border-brand-blue/10 shadow-lg">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-3 mb-4"
              >
                <div className="p-3 bg-gradient-brand rounded-xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                  Choisissez votre plan
                </h1>
              </motion.div>
              <p className="text-lg text-gray-600 font-medium">
                Sélectionnez l'abonnement qui correspond le mieux à vos besoins
              </p>
            </div>
          </div>

          {/* Toggle Billing Period */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn('text-sm font-medium transition-colors', billingPeriod === 'monthly' ? 'text-brand-blue' : 'text-gray-400 hover:text-gray-600')}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  billingPeriod === 'yearly' ? 'bg-brand-blue' : 'bg-gray-300'
                )}
              >
                <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1')} />
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn('text-sm font-medium transition-colors', billingPeriod === 'yearly' ? 'text-brand-blue' : 'text-gray-400 hover:text-gray-600')}
              >
                Annuel
                {maxSavings > 0 && (
                  <Badge className="ml-2 bg-green-100 text-green-700 border-green-300 font-bold">
                    jusqu'à {formatCurrency(maxSavings)} économisés
                  </Badge>
                )}
              </button>
            </div>

            {/* Encart d'incitation — visible seulement en mensuel */}
            {billingPeriod === 'monthly' && maxSavings > 0 && (
              <motion.button
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setBillingPeriod('yearly')}
                className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 font-medium hover:bg-green-100 transition-colors"
              >
                💡 Passez à l'annuel et économisez jusqu'à {formatCurrency(maxSavings)}/an →
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Résumé de l'essai — ancre émotionnelle */}
        <TrialSummaryBanner />

        {/* Plans Grid */}
        {plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan, index) => {
              const isPopular = plan.name.toLowerCase().includes('pro')
              const price = getPlanPrice(plan)
              const features = getPlanFeatures(plan)
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-brand text-white shadow-lg px-4 py-1">
                        Le plus populaire
                      </Badge>
                    </div>
                  )}
                  
                  <GlassCard
                    variant="premium"
                    hoverable
                    className={cn(
                      'p-8 h-full relative overflow-hidden group',
                      isPopular && 'ring-2 ring-brand-blue shadow-xl'
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-brand-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative z-10">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-gray-600 text-sm">{plan.description}</p>
                        )}
                      </div>

                      <div className="mb-6">
                        {billingPeriod === 'yearly' && plan.price_monthly_ht ? (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-bold text-brand-blue">
                                {formatCurrency(plan.price_monthly_ht * 0.8)}
                              </span>
                              <span className="text-gray-500">/mois</span>
                            </div>
                            <div className="mt-1 space-y-0.5">
                              <p className="text-sm text-gray-400">
                                Facturé {formatCurrency(price)}/an
                              </p>
                              {getYearlySavings(plan) > 0 && (
                                <p className="text-sm font-semibold text-green-600">
                                  🎉 {formatCurrency(getYearlySavings(plan))} économisés vs mensuel
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-brand-blue">
                              {formatCurrency(price)}
                            </span>
                            <span className="text-gray-500">/mois</span>
                          </div>
                        )}
                        {billingPeriod === 'monthly' && plan.price_yearly_ht && getYearlySavings(plan) > 0 && (
                          <button
                            onClick={() => setBillingPeriod('yearly')}
                            className="mt-1.5 text-xs text-green-700 underline underline-offset-2 hover:text-green-800"
                          >
                            Annuel → économisez {formatCurrency(getYearlySavings(plan))}/an
                          </button>
                        )}
                      </div>

                      <ul className="space-y-4 mb-8">
                        {features.map((feature, idx) => {
                          const Icon = feature.icon
                          return (
                            <li key={idx} className="flex items-start gap-3">
                              <div className="p-1 bg-brand-blue/10 rounded-lg mt-0.5">
                                <Icon className="h-4 w-4 text-brand-blue" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{feature.label}</p>
                                <p className="text-sm text-gray-600">{typeof feature.value === 'string' || typeof feature.value === 'number' ? feature.value : ''}</p>
                              </div>
                            </li>
                          )
                        })}
                      </ul>

                      <Button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isProcessing}
                        className={cn(
                          'w-full',
                          isPopular
                            ? 'bg-gradient-brand text-white shadow-lg hover:shadow-xl'
                            : 'bg-brand-blue text-white hover:bg-brand-blue-dark'
                        )}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Traitement...
                          </>
                        ) : (
                          <>
                            S'abonner
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun plan disponible</h3>
              <p className="text-gray-600">
                Les plans d'abonnement ne sont pas encore configurés.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <p className="text-sm text-gray-500 mb-2">
            Tous les plans incluent un essai gratuit de 14 jours
          </p>
          <p className="text-xs text-gray-400">
            Annulation possible à tout moment • Support 24/7 • Sans engagement
          </p>
        </motion.div>
      </div>
    </div>
  )
}
