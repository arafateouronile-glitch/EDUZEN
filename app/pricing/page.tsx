'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2, X, Sparkles, Gift, ArrowRight } from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Starter',
    subtitle: 'L\'essentiel pour débuter',
    monthlyPrice: 79,
    yearlyPrice: 790,
    founderPrice: { monthly: 39, yearly: 390 },
    features: {
      usage: '20 stagiaires / mois',
      'Gestion Pédagogique': true,
      'Émargement QR & Signature': true,
      'Génération de Documents': 'Standard',
      'Facturation & Paiements': true,
      'Dashboard Qualiopi': false,
      'Automate BPF': false,
      'Portail E-learning': false,
      'Relances Automatiques': false,
      'Marque Blanche / URL': false,
      'Multi-établissements': false,
      support: 'Email (48h)',
    },
    popular: false,
  },
  {
    name: 'Pro',
    subtitle: 'La sérénité administrative',
    monthlyPrice: 169,
    yearlyPrice: 1690,
    founderPrice: { monthly: 84, yearly: 840 },
    features: {
      usage: '100 stagiaires / mois',
      'Gestion Pédagogique': true,
      'Émargement QR & Signature': true,
      'Génération de Documents': 'Illimitée',
      'Facturation & Paiements': true,
      'Dashboard Qualiopi': true,
      'Automate BPF': true,
      'Portail E-learning': true,
      'Relances Automatiques': true,
      'Marque Blanche / URL': false,
      'Multi-établissements': false,
      support: 'Prioritaire (24h)',
    },
    popular: true,
  },
  {
    name: 'Enterprise',
    subtitle: 'Pour changer d\'échelle',
    monthlyPrice: 349,
    yearlyPrice: 3490,
    founderPrice: null,
    features: {
      usage: 'Illimité',
      'Gestion Pédagogique': true,
      'Émargement QR & Signature': true,
      'Génération de Documents': 'Custom',
      'Facturation & Paiements': true,
      'Dashboard Qualiopi': true,
      'Automate BPF': true,
      'Portail E-learning': true,
      'Relances Automatiques': true,
      'Marque Blanche / URL': true,
      'Multi-établissements': true,
      support: 'Dédié & Téléphone',
    },
    popular: false,
  },
]

const featureLabels: Record<string, string> = {
  usage: 'Usage',
  'Gestion Pédagogique': 'Gestion Pédagogique',
  'Émargement QR & Signature': 'Émargement QR & Signature',
  'Génération de Documents': 'Génération de Documents',
  'Facturation & Paiements': 'Facturation & Paiements',
  'Dashboard Qualiopi': 'Dashboard Qualiopi',
  'Automate BPF': 'Automate BPF',
  'Portail E-learning': 'Portail E-learning',
  'Relances Automatiques': 'Relances Automatiques',
  'Marque Blanche / URL': 'Marque Blanche / URL',
  'Multi-établissements': 'Multi-établissements',
  support: 'Support',
}

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [isFounder, setIsFounder] = useState(true) // À déterminer selon l'utilisateur

  const getPrice = (plan: typeof plans[0]) => {
    if (isFounder && plan.founderPrice) {
      return billingPeriod === 'monthly' ? plan.founderPrice.monthly : plan.founderPrice.yearly
    }
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
  }

  const getOriginalPrice = (plan: typeof plans[0]) => {
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-blue/10 to-brand-cyan/10 rounded-full mb-6">
            <Sparkles className="w-5 h-5 text-brand-cyan" />
            <span className="text-sm font-semibold text-brand-blue">
              Offre Spéciale : Bénéficiez de -50% en devenant "Membre Fondateur"
            </span>
            <span className="text-xs text-gray-500">(Limité aux 100 premiers inscrits)</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tightest mb-4 bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
            Choisissez le plan qui propulsera votre organisme
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Des tarifs transparents, sans engagement. Passez d'un plan à l'autre à tout moment.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center justify-center gap-4 mt-8"
        >
          <span className={cn('text-sm font-medium', billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500')}>
            Mensuel
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className={cn(
              'relative w-14 h-8 rounded-full transition-colors',
              billingPeriod === 'yearly' ? 'bg-brand-blue' : 'bg-gray-300'
            )}
          >
            <motion.div
              className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
              animate={{ x: billingPeriod === 'yearly' ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={cn('text-sm font-medium', billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-500')}>
            Annuel <span className="text-xs text-green-600">(-17%)</span>
          </span>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const price = getPrice(plan)
            const originalPrice = getOriginalPrice(plan)
            const discount = isFounder && plan.founderPrice ? 50 : 0

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={cn('relative', plan.popular && 'md:-mt-4 md:mb-4')}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-4 py-1 bg-gradient-to-r from-brand-blue to-brand-cyan text-white text-sm font-bold rounded-full shadow-lg">
                      ⭐ Le plus populaire
                    </div>
                  </div>
                )}

                <GlassCard
                  variant={plan.popular ? 'premium' : 'default'}
                  className={cn(
                    'h-full flex flex-col',
                    plan.popular && 'border-2 border-brand-cyan shadow-2xl'
                  )}
                >
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl font-black mb-2">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.subtitle}</CardDescription>

                    <div className="mt-6">
                      <div className="flex items-baseline justify-center gap-2">
                        {discount > 0 && (
                          <span className="text-2xl text-gray-400 line-through">
                            {originalPrice}€
                          </span>
                        )}
                        <span className="text-5xl font-black text-brand-blue">
                          {price}€
                        </span>
                        <span className="text-gray-600">HT</span>
                      </div>
                      {discount > 0 && (
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <Gift className="w-4 h-4 text-brand-cyan" />
                          <span className="text-sm font-semibold text-brand-cyan">
                            -{discount}% Offre Fondateur
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        {billingPeriod === 'monthly' ? 'par mois' : 'par an'}
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-4 flex-1">
                      {Object.entries(plan.features).map(([key, value]) => {
                        if (key === 'usage') {
                          return (
                            <div key={key} className="pb-2 border-b">
                              <p className="text-sm font-semibold text-brand-blue">{value}</p>
                            </div>
                          )
                        }

                        if (key === 'support') {
                          return (
                            <div key={key} className="pt-2 border-t">
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Support:</span> {value}
                              </p>
                            </div>
                          )
                        }

                        const label = featureLabels[key] || key
                        const hasFeature = value === true
                        const featureText = typeof value === 'string' ? value : null

                        return (
                          <div key={key} className="flex items-start gap-3">
                            {hasFeature ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className={cn('text-sm', hasFeature ? 'text-gray-900' : 'text-gray-400')}>
                                {label}
                              </p>
                              {featureText && (
                                <p className="text-xs text-gray-500 mt-0.5">({featureText})</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <Button
                      className={cn(
                        'w-full mt-8',
                        plan.popular
                          ? 'bg-gradient-to-r from-brand-blue to-brand-cyan text-white hover:shadow-xl'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      )}
                      size="lg"
                    >
                      {plan.name === 'Enterprise' ? 'Nous contacter' : 'Choisir ce plan'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>

        {/* FAQ ou informations supplémentaires */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-16 text-center max-w-3xl mx-auto"
        >
          <p className="text-sm text-gray-600">
            Tous les plans incluent une période d'essai de 14 jours. Aucune carte bancaire requise.
            <br />
            Annulez à tout moment, sans frais.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
