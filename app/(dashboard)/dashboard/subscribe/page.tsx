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
} from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { formatCurrency, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { logger, sanitizeError } from '@/lib/utils/logger'

type Plan = {
  id: string
  name: string
  description: string | null
  price_monthly_ht: number | null
  price_yearly_ht: number | null
  max_students: number | null
  max_sessions_per_month: number | null
  features: Record<string, any>
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
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
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
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .maybeSingle()
      
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
        const error = await response.json()
        throw new Error(error.message || 'Erreur lors de la création du checkout')
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

  const getPlanFeatures = (plan: Plan) => {
    const features = plan.features || {}
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
      ...(features.support ? [{ label: 'Support', value: features.support, icon: Shield }] : []),
      ...(features.advanced_features ? [{ label: 'Fonctionnalités avancées', value: 'Inclus', icon: Zap }] : []),
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
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={cn('text-sm font-medium', billingPeriod === 'monthly' ? 'text-brand-blue' : 'text-gray-500')}>
              Mensuel
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                billingPeriod === 'yearly' ? 'bg-brand-blue' : 'bg-gray-300'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            <span className={cn('text-sm font-medium', billingPeriod === 'yearly' ? 'text-brand-blue' : 'text-gray-500')}>
              Annuel
              <Badge className="ml-2 bg-green-100 text-green-700 border-green-300">-20%</Badge>
            </span>
          </div>
        </motion.div>

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
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-brand-blue">
                            {formatCurrency(price)}
                          </span>
                          <span className="text-gray-500">
                            /{billingPeriod === 'monthly' ? 'mois' : 'an'}
                          </span>
                        </div>
                        {billingPeriod === 'yearly' && plan.price_monthly_ht && (
                          <p className="text-sm text-gray-500 mt-1">
                            Soit {formatCurrency(plan.price_monthly_ht * 0.8)}/mois
                          </p>
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
                                <p className="text-sm text-gray-600">{feature.value}</p>
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
