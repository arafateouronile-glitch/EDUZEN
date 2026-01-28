'use client'

import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import type { OrganizationUsage } from '@/lib/services/quota.service'

interface PaywallModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usage: OrganizationUsage
  actionType: 'student' | 'session' | 'feature'
  featureName?: string
}

export function PaywallModal({
  open,
  onOpenChange,
  usage,
  actionType,
  featureName,
}: PaywallModalProps) {
  const router = useRouter()

  const getTitle = () => {
    switch (actionType) {
      case 'student':
        return 'Limite d\'étudiants atteinte'
      case 'session':
        return 'Limite de sessions mensuelles atteinte'
      case 'feature':
        return 'Fonctionnalité non disponible'
      default:
        return 'Limite atteinte'
    }
  }

  const getDescription = () => {
    switch (actionType) {
      case 'student':
        return `Vous avez atteint la limite de ${usage.max_students} étudiants de votre plan ${usage.plan_name}. Passez au plan supérieur pour inscrire plus de stagiaires.`
      case 'session':
        return `Vous avez atteint la limite de ${usage.max_sessions_per_month} sessions mensuelles de votre plan ${usage.plan_name}. Passez au plan supérieur pour créer plus de sessions.`
      case 'feature':
        return `Cette fonctionnalité n'est pas disponible dans votre plan actuel. Passez au plan Pro ou Enterprise pour y accéder.`
      default:
        return 'Limite atteinte'
    }
  }

  const getRecommendedPlan = () => {
    if (usage.plan_name === 'Starter') return 'Pro'
    if (usage.plan_name === 'Pro') return 'Enterprise'
    return null
  }

  const recommendedPlan = getRecommendedPlan()

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push('/pricing?upgrade=true')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-cyan" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avantages du plan supérieur */}
          {recommendedPlan && (
            <Card className="border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">
                  Passez au plan {recommendedPlan} et débloquez :
                </h3>
                <div className="space-y-3">
                  {recommendedPlan === 'Pro' && (
                    <>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Jusqu'à 100 stagiaires</p>
                          <p className="text-sm text-gray-600">Au lieu de 20 actuellement</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Dashboard Qualiopi inclus</p>
                          <p className="text-sm text-gray-600">Suivez votre conformité en temps réel</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Export BPF automatique</p>
                          <p className="text-sm text-gray-600">Générez vos bilans en un clic</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Portail E-learning</p>
                          <p className="text-sm text-gray-600">Créez vos cours en ligne</p>
                        </div>
                      </div>
                    </>
                  )}
                  {recommendedPlan === 'Enterprise' && (
                    <>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Stagiaires illimités</p>
                          <p className="text-sm text-gray-600">Aucune limite d'usage</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Marque blanche / URL personnalisée</p>
                          <p className="text-sm text-gray-600">Votre propre domaine</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Multi-établissements</p>
                          <p className="text-sm text-gray-600">Gérez plusieurs sites</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Support dédié & téléphone</p>
                          <p className="text-sm text-gray-600">Assistance prioritaire</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage actuel */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Votre usage actuel :</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Étudiants</span>
                <span className="font-medium">
                  {usage.current_student_count}
                  {usage.max_students !== null && ` / ${usage.max_students}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sessions (mois)</span>
                <span className="font-medium">
                  {usage.current_sessions_count}
                  {usage.max_sessions_per_month !== null && ` / ${usage.max_sessions_per_month}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Plus tard
          </Button>
          <Button onClick={handleUpgrade} className="bg-gradient-to-r from-brand-blue to-brand-cyan">
            Voir les plans
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
