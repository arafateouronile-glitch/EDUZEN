'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { qualiopiService } from '@/lib/services/qualiopi.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Award, TrendingUp, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function QualiopiComplianceScore() {
  const { user } = useAuth()
  const supabase = createClient()
  const [showDetails, setShowDetails] = useState(false)

  // Récupérer le score de conformité Qualiopi
  const { data: complianceRate, isLoading } = useQuery<number | null>({
    queryKey: ['qualiopi-compliance-rate', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null

      try {
        // Utiliser la fonction RPC si disponible
        const { data, error } = await supabase.rpc('calculate_qualiopi_compliance_rate', {
          org_id: user.organization_id,
        })

        if (error) {
          // Fallback : calculer manuellement
          return calculateComplianceRateFallback(user.organization_id)
        }

        return data as number
      } catch (error) {
        return calculateComplianceRateFallback(user.organization_id)
      }
    },
    enabled: !!user?.organization_id,
    refetchInterval: 60000, // Rafraîchir toutes les minutes
  })

  // Fallback : calculer le taux de conformité manuellement
  const calculateComplianceRateFallback = async (organizationId: string): Promise<number> => {
    try {
      const indicators = await qualiopiService.getIndicators(organizationId)
      if (!indicators || indicators.length === 0) return 0

      const compliantCount = indicators.filter(
        (ind) => ind.status === 'compliant' || ind.status === 'in_progress'
      ).length

      return Math.round((compliantCount / indicators.length) * 100)
    } catch (error) {
      return 0
    }
  }

  // Récupérer les indicateurs pour les détails
  const { data: indicators } = useQuery({
    queryKey: ['qualiopi-indicators', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return qualiopiService.getIndicators(user.organization_id)
    },
    enabled: !!user?.organization_id && showDetails,
  })

  if (isLoading) {
    return (
      <Card className="border-brand-blue/20">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const score = complianceRate || 0
  const scoreColor =
    score >= 90
      ? 'text-green-600'
      : score >= 70
      ? 'text-yellow-600'
      : score >= 50
      ? 'text-orange-600'
      : 'text-red-600'

  const progressColor =
    score >= 90
      ? 'bg-green-600'
      : score >= 70
      ? 'bg-yellow-600'
      : score >= 50
      ? 'bg-orange-600'
      : 'bg-red-600'

  const statusIcon =
    score >= 90 ? (
      <CheckCircle2 className="w-6 h-6 text-green-600" />
    ) : score >= 70 ? (
      <TrendingUp className="w-6 h-6 text-yellow-600" />
    ) : (
      <AlertCircle className="w-6 h-6 text-orange-600" />
    )

  const statusText =
    score >= 90
      ? 'Excellent'
      : score >= 70
      ? 'Bon'
      : score >= 50
      ? 'À améliorer'
      : 'Action requise'

  return (
    <Card className="border-brand-blue/20 bg-gradient-to-br from-white to-brand-blue/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-blue" />
            <CardTitle className="text-lg font-semibold">Score de Conformité Qualiopi</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Ce score reflète votre niveau de conformité aux exigences Qualiopi.
                    Un score élevé vous garantit une certification de qualité.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-brand-blue hover:underline"
          >
            {showDetails ? 'Masquer' : 'Détails'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score principal */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="flex items-center justify-center gap-4"
          >
            <div className={cn('text-5xl font-black', scoreColor)}>{score}%</div>
            <div className="flex flex-col items-start">
              {statusIcon}
              <span className="text-xs font-medium text-gray-600 mt-1">{statusText}</span>
            </div>
          </motion.div>

          {/* Barre de progression */}
          <div className="mt-4">
            <Progress value={score} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>0%</span>
              <span className="font-medium">100%</span>
            </div>
          </div>
        </div>

        {/* Message motivationnel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'p-3 rounded-lg text-sm',
            score >= 90
              ? 'bg-green-50 text-green-800 border border-green-200'
              : score >= 70
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : 'bg-orange-50 text-orange-800 border border-orange-200'
          )}
        >
          {score >= 90 ? (
            <p className="font-medium">
              🎉 Excellent ! Votre organisme est en parfaite conformité Qualiopi.
            </p>
          ) : score >= 70 ? (
            <p>
              💪 Vous êtes sur la bonne voie ! Quelques ajustements et vous atteindrez l'excellence.
            </p>
          ) : (
            <p>
              ⚠️ Des actions sont nécessaires pour améliorer votre conformité. Consultez votre
              dashboard Qualiopi pour les détails.
            </p>
          )}
        </motion.div>

        {/* Détails des indicateurs */}
        {showDetails && indicators && indicators.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t space-y-2"
          >
            <p className="text-xs font-semibold text-gray-700 mb-2">Répartition par indicateur :</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {indicators.slice(0, 10).map((indicator) => {
                const isCompliant = indicator.status === 'compliant'
                const isInProgress = indicator.status === 'in_progress'
                return (
                  <div
                    key={indicator.id}
                    className="flex items-center justify-between text-xs p-2 rounded bg-gray-50"
                  >
                    <span className="flex-1 truncate">{indicator.indicator_name}</span>
                    <div className="flex items-center gap-2">
                      {isCompliant ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : isInProgress ? (
                        <TrendingUp className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isCompliant ? 'text-green-600' : isInProgress ? 'text-yellow-600' : 'text-red-600'
                        )}
                      >
                        {indicator.compliance_rate || 0}%
                      </span>
                    </div>
                  </div>
                )
              })}
              {indicators.length > 10 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  ... et {indicators.length - 10} autres indicateurs
                </p>
              )}
            </div>
            <a
              href="/dashboard/qualiopi"
              className="block text-center text-xs text-brand-blue hover:underline mt-2"
            >
              Voir tous les indicateurs →
            </a>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
