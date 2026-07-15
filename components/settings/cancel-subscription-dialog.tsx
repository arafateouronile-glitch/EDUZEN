'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, MessageSquare, Lightbulb, ShieldAlert, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4

const STEPS: { number: Step; title: string }[] = [
  { number: 1, title: 'Confirmation' },
  { number: 2, title: 'Motif' },
  { number: 3, title: 'Suggestions' },
  { number: 4, title: 'Résiliation' },
]

const REASON_OPTIONS: { code: string; label: string }[] = [
  { code: 'too_expensive', label: 'Trop cher' },
  { code: 'missing_features', label: 'Fonctionnalités manquantes' },
  { code: 'not_using', label: "Je n'utilise plus le produit" },
  { code: 'technical_issues', label: 'Problèmes techniques' },
  { code: 'switching_solution', label: 'Je change de solution' },
  { code: 'other', label: 'Autre' },
]

interface CancelSubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planName: string
  currentPeriodEnd: string | null
  onCancelled: () => void
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  planName,
  currentPeriodEnd,
  onCancelled,
}: CancelSubscriptionDialogProps) {
  const { addToast } = useToast()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [reasonCode, setReasonCode] = useState('')
  const [reasonDetail, setReasonDetail] = useState('')
  const [improvementSuggestions, setImprovementSuggestions] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCurrentStep(1)
      setReasonCode('')
      setReasonDetail('')
      setImprovementSuggestions('')
      setIsSubmitting(false)
    }
  }, [open])

  const formattedDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const handleNext = () => {
    if (currentStep === 2 && !reasonCode) {
      addToast({ type: 'error', title: 'Motif requis', description: 'Merci de sélectionner un motif pour continuer.' })
      return
    }
    setCurrentStep((s) => (s + 1) as Step)
  }

  const handleBack = () => setCurrentStep((s) => (s - 1) as Step)

  const handleConfirmCancel = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reasonCode, reasonDetail, improvementSuggestions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Une erreur est survenue')

      addToast({
        type: 'success',
        title: 'Résiliation programmée',
        description: formattedDate
          ? `Votre abonnement restera actif jusqu'au ${formattedDate}.`
          : 'Votre abonnement sera résilié à la fin de la période en cours.',
      })
      onCancelled()
      onOpenChange(false)
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Résilier mon abonnement</DialogTitle>
        </DialogHeader>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 py-2">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                  currentStep > step.number
                    ? 'bg-brand-blue text-white'
                    : currentStep === step.number
                      ? 'bg-brand-blue/10 text-brand-blue border-2 border-brand-blue'
                      : 'bg-gray-100 text-gray-400'
                )}
              >
                {currentStep > step.number ? <Check className="h-3.5 w-3.5" /> : step.number}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-0.5 flex-1', currentStep > step.number ? 'bg-brand-blue' : 'bg-gray-100')} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4 py-2 min-h-[220px]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 rounded-lg shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Êtes-vous sûr(e) de vouloir résilier ?</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Nos tarifs évoluent régulièrement à la hausse. En résiliant aujourd&apos;hui, vous perdez votre
                    tarif actuel : si vous revenez plus tard, le tarif en vigueur à ce moment s&apos;appliquera,
                    potentiellement plus élevé.
                  </p>
                </div>
              </div>
              {formattedDate && (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                  Vous conservez l&apos;accès à votre plan <strong>{planName}</strong> jusqu&apos;au {formattedDate}.
                </p>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Pourquoi souhaitez-vous résilier ?</h3>
                <div className="grid grid-cols-2 gap-2">
                  {REASON_OPTIONS.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => setReasonCode(option.code)}
                      className={cn(
                        'text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                        reasonCode === option.code
                          ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {reasonCode === 'other' && (
                  <Textarea
                    className="mt-3"
                    placeholder="Précisez votre motif..."
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                  />
                )}
              </div>
              <div className="flex items-start gap-3 bg-blue-50/50 rounded-lg p-3">
                <MessageSquare className="h-4 w-4 text-brand-blue shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">
                  De nouvelles fonctionnalités sont ajoutées régulièrement à EduZen (exports, automatisations,
                  tableaux de bord). En partant maintenant, vous ne pourrez pas en profiter.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="suggestions" className="font-semibold text-gray-900">
                  Qu&apos;aurait-il fallu améliorer pour vous garder ?
                </Label>
                <Textarea
                  id="suggestions"
                  className="mt-2"
                  rows={4}
                  placeholder="Vos suggestions nous aident à améliorer EduZen (facultatif)..."
                  value={improvementSuggestions}
                  onChange={(e) => setImprovementSuggestions(e.target.value)}
                />
              </div>
              <div className="flex items-start gap-3 bg-blue-50/50 rounded-lg p-3">
                <Lightbulb className="h-4 w-4 text-brand-blue shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">
                  Vos données (sessions, apprenants, documents générés, historique Qualiopi) restent liées à votre
                  abonnement. Une résiliation prolongée peut entraîner la perte de cet historique accumulé.
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-lg shrink-0">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Dernière étape avant confirmation</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {formattedDate
                      ? `Vous conserverez l'accès à toutes les fonctionnalités jusqu'au ${formattedDate}. Après cette date, votre organisation basculera en accès restreint.`
                      : "Votre abonnement sera résilié à la fin de la période en cours. Après cette date, votre organisation basculera en accès restreint."}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                <p><span className="font-medium text-gray-800">Plan actuel :</span> {planName}</p>
                {formattedDate && <p><span className="font-medium text-gray-800">Accès jusqu&apos;au :</span> {formattedDate}</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {currentStep === 1 ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Garder mon abonnement
            </Button>
          ) : (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              Retour
            </Button>
          )}

          {currentStep < 4 ? (
            <Button onClick={handleNext}>Continuer</Button>
          ) : (
            <Button variant="destructive" onClick={handleConfirmCancel} isLoading={isSubmitting}>
              Résilier mon abonnement
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
