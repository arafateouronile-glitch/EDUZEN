'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Lock,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ArrowRight,
  CreditCard,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import type { BillingPeriod } from './plan-selection-step'

interface PaymentSetupStepProps {
  planId: string
  planName: string
  billingPeriod: BillingPeriod
  price: number
  onSuccess: (data: {
    paymentMethodId: string
    customerId: string
    subscriptionId: string
    trialEndAt: string
  }) => void
  onError: (error: string) => void
  onSkip: () => void
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
}

function SecurityBadges() {
  return (
    <div className="flex items-center justify-center gap-5 py-4 px-5 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <div className="bg-[#635BFF] text-white rounded-md px-2 py-1 font-bold text-[10px] tracking-wide">
          stripe
        </div>
        <span className="font-medium">Sécurisé</span>
      </div>
      <div className="w-px h-5 bg-gray-300" />
      <div className="flex items-center gap-1.5 text-xs text-gray-600">
        <Lock className="h-4 w-4 text-green-600" />
        <span className="font-medium">SSL 256-bit</span>
      </div>
      <div className="w-px h-5 bg-gray-300" />
      <div className="flex items-center gap-1.5 text-xs text-gray-600">
        <ShieldCheck className="h-4 w-4 text-brand-blue" />
        <span className="font-medium">PCI-DSS</span>
      </div>
    </div>
  )
}

/**
 * Étape 4 : redirection vers Stripe Checkout (mode setup) pour saisir la carte
 * sur la page hébergée par Stripe. Pas d’iframe / CardElement dans l’app.
 */
export function PaymentSetupStep({
  planName,
  billingPeriod,
  price,
  onSuccess,
  onError,
  onSkip,
  isSubmitting,
  setIsSubmitting,
  planId,
}: PaymentSetupStepProps) {
  const [redirecting, setRedirecting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const handleRedirectToStripe = async () => {
    setPaymentError(null)
    setRedirecting(true)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/subscriptions/create-checkout-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingPeriod }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de préparer la page de paiement')
      }

      if (data.url) {
        logger.info('Redirection vers Stripe Checkout', { sessionId: data.sessionId })
        window.location.href = data.url
        return
      }

      throw new Error('URL de paiement non reçue')
    } catch (error) {
      logger.error('Erreur redirection Stripe', error)
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      setPaymentError(message)
      onError(message)
    } finally {
      setRedirecting(false)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="text-center pb-2">
        <h3 className="font-display text-xl font-bold text-brand-blue mb-2 tracking-tight">
          Dernière étape avant de commencer
        </h3>
        <p className="text-gray-600 text-sm">
          Ajoutez un moyen de paiement pour activer votre essai gratuit de 14 jours
        </p>
      </div>

      {/* Plan récapitulatif */}
      <div className="bg-gradient-to-br from-brand-blue/[0.03] to-brand-cyan/[0.05] rounded-2xl p-5 border border-brand-blue/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-brand-blue">Plan {planName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Facturation {billingPeriod === 'monthly' ? 'mensuelle' : 'annuelle'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-blue tracking-tight">
              {formatCurrency(price)}
              <span className="text-sm font-normal text-gray-500">
                /{billingPeriod === 'monthly' ? 'mois' : 'an'}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-brand-blue/10">
          <div className="flex items-center gap-2 text-brand-cyan">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold">Aujourd'hui : 0€ · Premier prélèvement dans 14 jours</span>
          </div>
        </div>
      </div>

      {/* Bouton principal */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5 px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Paiement 100% sécurisé</h4>
              <p className="text-xs text-gray-500">
                Redirection vers Stripe · Vos données ne transitent pas par nos serveurs
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <Button
            type="button"
            onClick={handleRedirectToStripe}
            disabled={redirecting || isSubmitting}
            className="w-full bg-gradient-brand hover:shadow-lg hover:shadow-brand-blue/25 text-white py-6 text-lg font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
          >
            {redirecting || isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Préparation de la page sécurisée...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Activer mon essai gratuit
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>

          {paymentError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {paymentError}
            </div>
          )}

          <SecurityBadges />
        </div>
      </div>

      {/* Réassurance */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-700">0€ aujourd'hui</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Aucun frais</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-700">14 jours gratuits</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Accès complet</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-700">Annulation libre</p>
          <p className="text-[10px] text-gray-500 mt-0.5">En 1 clic</p>
        </div>
      </div>

      {/* Option sans carte */}
      <div className="text-center pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onSkip}
          disabled={isSubmitting || redirecting}
          className="text-sm text-gray-500 hover:text-brand-blue font-medium transition-colors"
        >
          Commencer sans carte bancaire →
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Vous aurez accès à toutes les fonctionnalités pendant 14 jours
        </p>
      </div>
    </div>
  )
}
