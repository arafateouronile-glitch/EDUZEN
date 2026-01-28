'use client'

import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  FileX,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { GlassCardPremium } from './glass-card-premium'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface RiskIndicator {
  id: string
  indicator_code: string
  indicator_name: string
  criterionNumber: number
  status: 'not_started' | 'non_compliant' | 'needs_improvement'
  compliance_rate: number
  evidence_count: number
  daysWithoutUpdate?: number
  riskLevel: 'critical' | 'high' | 'medium'
  recommendation?: string
}

interface CriticalAlertsProps {
  indicators: RiskIndicator[]
  onViewIndicator?: (indicator: RiskIndicator) => void
  className?: string
}

// Configuration des niveaux de risque
const RISK_CONFIG = {
  critical: {
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: AlertTriangle,
    label: 'Critique',
  },
  high: {
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: AlertCircle,
    label: 'Élevé',
  },
  medium: {
    color: 'from-amber-400 to-yellow-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    icon: Clock,
    label: 'Moyen',
  },
}

// Recommandations par défaut selon le statut
const DEFAULT_RECOMMENDATIONS = {
  not_started: 'Commencez à documenter cet indicateur pour préparer votre audit.',
  non_compliant: 'Ajoutez des preuves et corrigez les non-conformités identifiées.',
  needs_improvement: 'Quelques ajustements sont nécessaires pour atteindre la conformité.',
}

// Ligne d'alerte individuelle
function AlertRow({
  indicator,
  onView,
  delay = 0,
}: {
  indicator: RiskIndicator
  onView?: () => void
  delay?: number
}) {
  const riskConfig = RISK_CONFIG[indicator.riskLevel]
  const Icon = riskConfig.icon

  return (
    <motion.div
      className={cn(
        'group relative flex items-start gap-3 rounded-xl p-3',
        'bg-gradient-to-r from-white/80 to-white/40',
        'dark:from-slate-800/80 dark:to-slate-800/40',
        'border border-slate-200/50 dark:border-slate-700/50',
        'hover:shadow-lg hover:border-slate-200',
        'transition-all duration-300 cursor-pointer'
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onView}
    >
      {/* Barre de couleur latérale */}
      <div
        className={cn(
          'absolute left-0 top-2 bottom-2 w-1 rounded-r-full',
          'bg-gradient-to-b',
          riskConfig.color
        )}
      />

      {/* Icône avec badge de risque */}
      <div className="relative ml-2">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            riskConfig.bgColor
          )}
        >
          <Icon className={cn('h-5 w-5', riskConfig.textColor)} />
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 text-xs font-semibold',
              riskConfig.bgColor,
              riskConfig.textColor,
              riskConfig.borderColor
            )}
          >
            {riskConfig.label}
          </Badge>
          <span className="text-xs text-slate-400">
            Critère {indicator.criterionNumber}
          </span>
        </div>

        <h4 className="font-medium text-sm text-slate-800 dark:text-white mt-1 line-clamp-1">
          Indicateur {indicator.indicator_code}: {indicator.indicator_name}
        </h4>

        {/* Raison / Recommandation */}
        <div className="flex items-start gap-1.5 mt-2">
          <Sparkles className="h-3 w-3 text-[#34B9EE] shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 line-clamp-2">
            {indicator.recommendation ||
              DEFAULT_RECOMMENDATIONS[indicator.status]}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <FileX className="h-3 w-3" />
            <span>{indicator.evidence_count} preuves</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>{indicator.compliance_rate}% conforme</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0 self-center">
        <div
          className={cn(
            'flex items-center justify-center h-8 w-8 rounded-lg',
            'bg-transparent group-hover:bg-[#274472]/5',
            'transition-all duration-200'
          )}
        >
          <ArrowRight className="h-4 w-4 text-[#274472] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.div>
  )
}

// Composant d'alerte vide
function EmptyAlerts() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-8 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 mb-4">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles className="h-8 w-8 text-green-600" />
        </motion.div>
      </div>
      <h4 className="font-space-grotesk font-semibold text-green-700">
        Aucune alerte critique
      </h4>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">
        Tous vos indicateurs sont en bonne voie. Continuez votre excellent travail !
      </p>
    </motion.div>
  )
}

export function CriticalAlerts({
  indicators,
  onViewIndicator,
  className,
}: CriticalAlertsProps) {
  // Trier par niveau de risque
  const sortedIndicators = [...indicators].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 }
    return order[a.riskLevel] - order[b.riskLevel]
  })

  // Stats
  const criticalCount = indicators.filter((i) => i.riskLevel === 'critical').length
  const highCount = indicators.filter((i) => i.riskLevel === 'high').length

  const hasAlerts = indicators.length > 0

  return (
    <GlassCardPremium
      variant={hasAlerts ? 'danger' : 'success'}
      className={cn('p-5 overflow-hidden', className)}
      delay={0.3}
      glow={criticalCount > 0}
      glowColor="rgba(239, 68, 68, 0.15)"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              hasAlerts
                ? 'bg-gradient-to-br from-red-500 to-orange-500'
                : 'bg-gradient-to-br from-green-500 to-emerald-500'
            )}
          >
            {hasAlerts ? (
              <AlertTriangle className="h-5 w-5 text-white" />
            ) : (
              <Sparkles className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-space-grotesk font-bold text-slate-800">
              {hasAlerts ? 'Indicateurs à Risque' : 'Tout va bien !'}
            </h3>
            <p className="text-xs text-slate-500">
              {hasAlerts
                ? `${indicators.length} indicateur${indicators.length > 1 ? 's' : ''} nécessite${
                    indicators.length > 1 ? 'nt' : ''
                  } votre attention`
                : 'Aucun indicateur critique détecté'}
            </p>
          </div>
        </div>

        {hasAlerts && (
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {criticalCount} critique{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="bg-orange-500 text-white">
                {highCount} élevé{highCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Liste des alertes */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto">
        <AnimatePresence>
          {!hasAlerts ? (
            <EmptyAlerts />
          ) : (
            sortedIndicators.slice(0, 5).map((indicator, index) => (
              <AlertRow
                key={indicator.id}
                indicator={indicator}
                onView={() => onViewIndicator?.(indicator)}
                delay={index * 0.1}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {indicators.length > 5 && (
        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-red-200 text-red-600 hover:bg-red-50"
            asChild
          >
            <Link href="/dashboard/qualiopi/actions">
              Voir {indicators.length - 5} autres alertes
              <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </motion.div>
      )}
    </GlassCardPremium>
  )
}
