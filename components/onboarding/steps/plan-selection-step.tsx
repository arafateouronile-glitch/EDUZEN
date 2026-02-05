'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass-card'
import {
  CheckCircle2,
  Users,
  Calendar,
  Shield,
  Zap,
  Loader2,
  Award,
  FileText,
  HeadphonesIcon,
  Clock,
  Mail,
  CalendarCheck,
  Upload,
  Bell,
} from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { formatCurrency, cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

// Timeline de confiance - affichée quand un plan est sélectionné
function TrustTimeline() {
  const steps = [
    {
      day: "Aujourd'hui",
      label: '0€',
      description: 'Accès total immédiat',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      active: true,
    },
    {
      day: 'Jour 7',
      label: 'Email de rappel',
      description: 'On ne vous surprend pas',
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      active: false,
    },
    {
      day: 'Jour 14',
      label: 'Début abonnement',
      description: 'Seulement si vous adorez',
      icon: CalendarCheck,
      color: 'text-brand-blue',
      bgColor: 'bg-brand-blue/10',
      active: false,
    },
  ]

  return (
    <div className="relative">
      <div className="absolute top-6 left-8 right-8 h-0.5 bg-gray-200" />
      <div className="absolute top-6 left-8 w-1/6 h-0.5 bg-green-500" />

      <div className="relative flex justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center text-center">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center z-10',
                step.active ? step.bgColor : 'bg-gray-100',
                step.active ? step.color : 'text-gray-400'
              )}
            >
              <step.icon className="h-5 w-5" />
            </div>
            <p className={cn(
              'mt-2 text-sm font-semibold',
              step.active ? 'text-gray-900' : 'text-gray-500'
            )}>
              {step.day}
            </p>
            <p className={cn(
              'text-xs font-medium',
              step.active ? step.color : 'text-gray-400'
            )}>
              {step.label}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-[100px]">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Bloc récapitulatif du plan sélectionné avec bénéfices
function SelectedPlanSummary({ plan, billingPeriod, price }: { plan: Plan; billingPeriod: BillingPeriod; price: number }) {
  return (
    <div className="space-y-5">
      {/* En-tête avec prix */}
      <div className="bg-gradient-to-br from-brand-blue/5 to-brand-orange/5 rounded-xl p-5 border border-brand-blue/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-lg font-bold text-gray-900">Plan {plan.name}</p>
            <p className="text-xs text-gray-500">
              Facturation {billingPeriod === 'monthly' ? 'mensuelle' : 'annuelle'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-blue">
              {formatCurrency(price)}
              <span className="text-sm font-normal text-gray-500">
                /{billingPeriod === 'monthly' ? 'mois' : 'an'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            Aujourd&apos;hui : 0€ - Essai gratuit 14 jours
          </span>
        </div>
      </div>

      {/* Liste des bénéfices */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Inclus dans votre essai
        </h4>

        <div className="space-y-2.5">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <div className="bg-brand-blue/10 rounded-full p-1.5">
              <FileText className="h-4 w-4 text-brand-blue" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Génération BPF illimitée</p>
              <p className="text-xs text-gray-500">Bilans Pédagogiques et Financiers conformes</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <div className="bg-green-100 rounded-full p-1.5">
              <Shield className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Signatures sécurisées eIDAS</p>
              <p className="text-xs text-gray-500">Valeur juridique équivalente à un acte notarié</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <div className="bg-brand-orange/10 rounded-full p-1.5">
              <HeadphonesIcon className="h-4 w-4 text-brand-orange" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Support expert Qualiopi</p>
              <p className="text-xs text-gray-500">Accompagnement dédié pour votre certification</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline de confiance */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-blue" />
          Votre parcours essai gratuit
        </h4>
        <TrustTimeline />
      </div>

      {/* Blocs de réassurance */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <Award className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Conformité garantie</p>
              <p className="text-xs text-blue-700 mt-1">
                EDUZEN est audité en permanence. Avec 992 tests de sécurité quotidiens
                et une conformité totale au règlement eIDAS.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-start gap-3">
            <Upload className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Migration sans douleur</p>
              <p className="text-xs text-green-700 mt-1">
                Déjà engagé ailleurs ? Nous importons vos modèles de documents
                et vos bases stagiaires gratuitement.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Transparence totale</p>
              <p className="text-xs text-amber-700 mt-1">
                Nous vous envoyons un email 3 jours avant la fin de votre essai.
                Vous restez maître de votre budget.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export type Plan = {
  id: string
  name: string
  description: string | null
  price_monthly_ht: number | null
  price_yearly_ht: number | null
  max_students: number | null
  max_sessions_per_month: number | null
  features: Record<string, unknown>
  stripe_price_id: string | null
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  is_active: boolean
}

export type BillingPeriod = 'monthly' | 'yearly'

export interface PlanSelectionData {
  planId: string | null
  planName: string
  billingPeriod: BillingPeriod
  price: number
}

interface PlanSelectionStepProps {
  data: PlanSelectionData
  onChange: (data: PlanSelectionData) => void
}

export function PlanSelectionStep({ data, onChange }: PlanSelectionStepProps) {
  const supabase = createClient()

  // Récupérer les plans disponibles
  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data: plansData, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly_ht', { ascending: true })

      if (error) {
        logger.error('Erreur récupération plans', error)
        throw error
      }

      return (plansData || []) as Plan[]
    },
  })

  const getPlanPrice = (plan: Plan) => {
    if (data.billingPeriod === 'yearly' && plan.price_yearly_ht) {
      return plan.price_yearly_ht
    }
    return plan.price_monthly_ht || 0
  }

  const getPlanFeatures = (plan: Plan) => {
    const features = plan.features || {}
    const featuresList = [
      {
        label: 'Apprenants',
        value: plan.max_students ? `Jusqu'à ${plan.max_students}` : 'Illimité',
        icon: Users,
      },
      {
        label: 'Sessions/mois',
        value: plan.max_sessions_per_month ? `${plan.max_sessions_per_month} sessions` : 'Illimité',
        icon: Calendar,
      },
    ]

    if ((features as Record<string, unknown>).qualiopi_dashboard) {
      featuresList.push({ label: 'Dashboard Qualiopi', value: 'Inclus', icon: Shield })
    }
    if ((features as Record<string, unknown>).e_learning) {
      featuresList.push({ label: 'E-learning', value: 'Inclus', icon: Zap })
    }

    return featuresList
  }

  const handleSelectPlan = (plan: Plan) => {
    onChange({
      planId: plan.id,
      planName: plan.name,
      billingPeriod: data.billingPeriod,
      price: getPlanPrice(plan),
    })
  }

  const handleBillingPeriodChange = (period: BillingPeriod) => {
    if (data.planId && plans) {
      const selectedPlan = plans.find((p) => p.id === data.planId)
      if (selectedPlan) {
        const newPrice = period === 'yearly'
          ? (selectedPlan.price_yearly_ht || 0)
          : (selectedPlan.price_monthly_ht || 0)
        onChange({
          ...data,
          billingPeriod: period,
          price: newPrice,
        })
        return
      }
    }
    onChange({ ...data, billingPeriod: period })
  }

  // Plan sélectionné pour afficher le récapitulatif
  const selectedPlan = plans?.find((p) => p.id === data.planId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue mx-auto mb-4" />
          <p className="text-gray-600">Chargement des plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "grid gap-6 transition-all duration-300",
      selectedPlan ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
    )}>
      {/* Colonne principale : sélection du plan */}
      <div className="space-y-6">
        <div className="text-center lg:text-left">
          <h3 className="font-display text-xl font-bold text-brand-blue mb-2 tracking-tight">
            Choisissez la formule adaptée à vos besoins
          </h3>
          <p className="text-gray-600 text-sm">
            Testez toutes les fonctionnalités pendant <span className="font-semibold text-brand-cyan">14 jours gratuits</span> · Sans engagement · Annulation en 1 clic
          </p>
        </div>

        {/* Toggle Billing Period */}
        <div className="flex items-center justify-center gap-4 py-4 bg-gradient-to-r from-brand-blue/[0.03] to-brand-cyan/[0.03] rounded-xl border border-brand-blue/10">
          <span
            className={cn(
              'text-sm font-semibold cursor-pointer transition-all px-3 py-1 rounded-lg',
              data.billingPeriod === 'monthly' ? 'text-brand-blue bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => handleBillingPeriodChange('monthly')}
          >
            Mensuel
          </span>
          <button
            onClick={() =>
              handleBillingPeriodChange(data.billingPeriod === 'monthly' ? 'yearly' : 'monthly')
            }
            className={cn(
              'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300',
              data.billingPeriod === 'yearly' ? 'bg-gradient-brand shadow-md' : 'bg-gray-300'
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300',
                data.billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          <span
            className={cn(
              'text-sm font-semibold cursor-pointer transition-all flex items-center gap-2 px-3 py-1 rounded-lg',
              data.billingPeriod === 'yearly' ? 'text-brand-blue bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => handleBillingPeriodChange('yearly')}
          >
            Annuel
            <Badge className="bg-gradient-brand text-white border-0 text-xs font-bold px-2">
              -20%
            </Badge>
          </span>
        </div>

        {/* Plans Grid */}
        {plans && plans.length > 0 ? (
          <div className={cn(
            "grid gap-4",
            selectedPlan ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
          )}>
            {plans.map((plan, index) => {
              const isPopular = plan.name.toLowerCase().includes('pro')
              const isSelected = data.planId === plan.id
              const price = getPlanPrice(plan)
              const features = getPlanFeatures(plan)

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  {isPopular && !selectedPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-brand text-white shadow-md px-3 py-0.5 text-xs">
                        Populaire
                      </Badge>
                    </div>
                  )}

                  <GlassCard
                    variant={isSelected ? 'premium' : 'default'}
                    hoverable
                    onClick={() => handleSelectPlan(plan)}
                    className={cn(
                      'p-5 h-full cursor-pointer transition-all duration-200',
                      isSelected && 'ring-2 ring-brand-blue shadow-lg',
                      isPopular && !isSelected && 'border-brand-blue/30'
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                        {plan.description && (
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-brand-blue flex-shrink-0" />
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-brand-blue">
                          {formatCurrency(price)}
                        </span>
                        <span className="text-gray-500 text-sm">
                          /{data.billingPeriod === 'monthly' ? 'mois' : 'an'}
                        </span>
                      </div>
                      {data.billingPeriod === 'yearly' && plan.price_monthly_ht && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          soit {formatCurrency(plan.price_monthly_ht * 0.8)}/mois
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {features.map((feature, idx) => {
                        const Icon = feature.icon
                        return (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <Icon className="h-4 w-4 text-brand-blue flex-shrink-0" />
                            <span className="text-gray-600">
                              <span className="font-medium">{feature.label}:</span> {feature.value}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Award className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Aucun plan disponible pour le moment</p>
          </div>
        )}

        {/* Info essai gratuit - affiché seulement si pas de plan sélectionné */}
        {!selectedPlan && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  14 jours d&apos;essai gratuit inclus
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Vous ne serez pas facturé pendant les 14 premiers jours. Annulez à tout moment.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Colonne secondaire : récapitulatif quand un plan est sélectionné */}
      {selectedPlan && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SelectedPlanSummary
            plan={selectedPlan}
            billingPeriod={data.billingPeriod}
            price={data.price}
          />
        </motion.div>
      )}
    </div>
  )
}
