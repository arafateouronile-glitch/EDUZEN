'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'
import { qualiopiService } from '@/lib/services/qualiopi.service'
import {
  QUALIOPI_REFERENTIAL,
} from '@/lib/services/auditor-portal.service'
import { createClient } from '@/lib/supabase/client'

// Composants Premium
import { GlassCardPremium } from './glass-card-premium'
import { AuditScoreRing } from './audit-score-ring'
import { CriteriaNavigation } from './criterion-card'
import { EvidenceVault } from './evidence-vault'
import { CriticalAlerts } from './critical-alerts'
import { ActivityHeatmap } from './activity-heatmap'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Icons
import {
  Play,
  Eye,
  FileText,
  Download,
  Shield,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Clock,
  Link2,
  Zap,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { format, subDays, eachDayOfInterval } from 'date-fns'

// Progress Tracker pour les 32 indicateurs
function IndicatorProgressTracker({
  indicators,
}: {
  indicators: { status: string }[]
}) {
  const total = 32
  const compliant = indicators.filter((i) => i.status === 'compliant').length
  const inProgress = indicators.filter((i) => i.status === 'in_progress').length
  const notStarted = total - compliant - inProgress

  return (
    <GlassCardPremium variant="deep-blue" className="p-4" delay={0.1}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-space-grotesk font-semibold text-[#274472] text-sm">
          Progression des 32 Indicateurs
        </h3>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>
            {compliant}/{total}
          </span>
        </div>
      </div>

      {/* Barre segmentée */}
      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
        <motion.div
          className="bg-gradient-to-r from-green-400 to-green-600"
          initial={{ width: 0 }}
          animate={{ width: `${(compliant / total) * 100}%` }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.div
          className="bg-gradient-to-r from-[#34B9EE] to-[#0EA5E9]"
          initial={{ width: 0 }}
          animate={{ width: `${(inProgress / total) * 100}%` }}
          transition={{ duration: 1, delay: 0.7 }}
        />
        <motion.div
          className="bg-slate-200 dark:bg-slate-700"
          initial={{ width: 0 }}
          animate={{ width: `${(notStarted / total) * 100}%` }}
          transition={{ duration: 1, delay: 0.9 }}
        />
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-green-400 to-green-600" />
          <span className="text-xs text-slate-600">{compliant} Conformes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#34B9EE] to-[#0EA5E9]" />
          <span className="text-xs text-slate-600">{inProgress} En cours</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          <span className="text-xs text-slate-600">{notStarted} À faire</span>
        </div>
      </div>
    </GlassCardPremium>
  )
}

// Header Premium avec Score et Actions
function PremiumHeader({
  score,
  onSimulateAudit,
  onEnterAuditMode,
}: {
  score: number
  onSimulateAudit: () => void
  onEnterAuditMode: () => void
}) {
  return (
    <GlassCardPremium variant="default" glow className="p-6" delay={0}>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Titre et description */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            className="flex items-center justify-center lg:justify-start gap-3 mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#274472] to-[#1a2f4a] shadow-lg">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="font-space-grotesk text-2xl font-black text-[#274472]">
                Dashboard Qualiopi
              </h1>
              <p className="text-sm text-slate-500">
                Votre tableau de bord de conformité
              </p>
            </div>
          </motion.div>

          {/* Badges rapides */}
          <motion.div
            className="flex items-center justify-center lg:justify-start gap-2 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Badge
              variant="outline"
              className="bg-[#34B9EE]/10 text-[#34B9EE] border-[#34B9EE]/20"
            >
              <Zap className="h-3 w-3 mr-1" />
              Compliance Engine Actif
            </Badge>
            <Badge
              variant="outline"
              className="bg-green-100 text-green-700 border-green-200"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Auto-Mapping
            </Badge>
          </motion.div>
        </div>

        {/* Score Ring */}
        <AuditScoreRing score={score} size={160} />

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onSimulateAudit}
            className="bg-gradient-to-r from-[#274472] to-[#1a2f4a] hover:from-[#1a2f4a] hover:to-[#0f1a2a] text-white shadow-lg shadow-[#274472]/25"
          >
            <Play className="h-4 w-4 mr-2" />
            Lancer une Simulation
          </Button>

          <Button
            onClick={onEnterAuditMode}
            variant="outline"
            className="border-[#34B9EE] text-[#34B9EE] hover:bg-[#34B9EE]/10"
          >
            <Eye className="h-4 w-4 mr-2" />
            Mode Auditeur
          </Button>

          <Button variant="ghost" size="sm" className="text-slate-500" asChild>
            <Link href="/dashboard/qualiopi/auditor-links">
              <Link2 className="h-4 w-4 mr-2" />
              Créer un lien auditeur
            </Link>
          </Button>
        </div>
      </div>
    </GlassCardPremium>
  )
}

// Panneau central des indicateurs
function IndicatorPanel({
  criterionNumber,
  indicators,
}: {
  criterionNumber: number | null
  indicators: any[]
}) {
  const criterion = QUALIOPI_REFERENTIAL.find((c) => c.number === criterionNumber)
  const criterionIndicators = criterion?.indicators || []

  if (!criterionNumber) {
    return (
      <GlassCardPremium variant="default" className="p-6 h-full" delay={0.2}>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <motion.div
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronRight className="h-8 w-8 text-slate-400" />
          </motion.div>
          <h3 className="font-space-grotesk font-semibold text-slate-600">
            Sélectionnez un critère
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Cliquez sur un des 7 critères à gauche pour voir les indicateurs associés
          </p>
        </div>
      </GlassCardPremium>
    )
  }

  return (
    <GlassCardPremium variant="cyan-accent" className="p-6 h-full" delay={0.2}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Badge className="bg-[#34B9EE] text-white mb-2">
            Critère {criterionNumber}
          </Badge>
          <h3 className="font-space-grotesk font-bold text-[#274472]">
            {criterion?.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{criterion?.description}</p>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence>
          {criterionIndicators.map((indicator, index) => {
            const dbIndicator = indicators.find(
              (i) => i.indicator_code === String(indicator.number)
            )
            const status = dbIndicator?.status || 'not_started'
            const isCompliant = status === 'compliant'
            const isInProgress = status === 'in_progress'

            return (
              <motion.div
                key={indicator.number}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer',
                  'bg-white/60 hover:bg-white/90',
                  isCompliant && 'border-green-200 bg-green-50/50',
                  isInProgress && 'border-[#34B9EE]/30 bg-[#34B9EE]/5',
                  !isCompliant && !isInProgress && 'border-slate-200'
                )}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                      isCompliant && 'bg-green-500 text-white',
                      isInProgress && 'bg-[#34B9EE] text-white',
                      !isCompliant && !isInProgress && 'bg-slate-200 text-slate-600'
                    )}
                  >
                    {indicator.number}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-slate-800">
                      {indicator.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {indicator.description}
                    </p>

                    {/* Conseil d'expert */}
                    {indicator.methodology && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-[#274472]/5">
                        <Sparkles className="h-3 w-3 text-[#274472] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#274472]">
                          {indicator.methodology}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isCompliant && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {isInProgress && <Clock className="h-5 w-5 text-[#34B9EE]" />}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </GlassCardPremium>
  )
}

// Composant principal du Dashboard
export function QualiopiDashboardPremium() {
  const { user } = useAuth()
  const supabase = createClient()
  const [selectedCriterion, setSelectedCriterion] = useState<number | null>(null)
  const [isAuditMode, setIsAuditMode] = useState(false)

  // Récupérer les indicateurs
  const { data: indicators = [], isLoading: loadingIndicators } = useQuery({
    queryKey: ['qualiopi-indicators-premium', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return qualiopiService.getIndicators(user.organization_id)
    },
    enabled: !!user?.organization_id,
    staleTime: 5 * 60 * 1000,
  })

  // Récupérer le score de conformité
  const { data: complianceRate = 0 } = useQuery({
    queryKey: ['qualiopi-compliance-rate-premium', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 0
      try {
        return await qualiopiService.calculateComplianceRate(user.organization_id)
      } catch {
        return 0
      }
    },
    enabled: !!user?.organization_id,
    staleTime: 5 * 60 * 1000,
  })

  // Récupérer les preuves automatisées
  const { data: evidence = [] } = useQuery({
    queryKey: ['compliance-evidence-premium', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('compliance_evidence_automated' as any)
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('status', 'valid')
        .order('event_date', { ascending: false })
        .limit(50)

      if (error) return []
      return data || []
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  // Calculer les données pour les critères
  const criteriaData = useMemo(() => {
    return QUALIOPI_REFERENTIAL.map((criterion) => {
      const criterionIndicators = indicators.filter((ind) => {
        const indNumber = parseInt(ind.indicator_code, 10)
        return criterion.indicators.some((ci) => ci.number === indNumber)
      })

      const compliantCount = criterionIndicators.filter(
        (i) => i.status === 'compliant'
      ).length

      return {
        number: criterion.number,
        name: criterion.name,
        indicatorCount: criterion.indicators.length,
        compliantCount,
        completionRate:
          criterion.indicators.length > 0
            ? Math.round((compliantCount / criterion.indicators.length) * 100)
            : 0,
      }
    })
  }, [indicators])

  // Indicateurs à risque
  const riskIndicators = useMemo(() => {
    return indicators
      .filter(
        (i) =>
          i.status === 'not_started' ||
          i.status === 'non_compliant' ||
          i.status === 'needs_improvement'
      )
      .map((i) => {
        const criterionNumber =
          QUALIOPI_REFERENTIAL.find((c) =>
            c.indicators.some((ci) => ci.number === parseInt(i.indicator_code, 10))
          )?.number || 1

        return {
          ...i,
          criterionNumber,
          riskLevel:
            i.status === 'non_compliant'
              ? 'critical'
              : i.status === 'not_started'
              ? 'high'
              : 'medium',
          recommendation: undefined,
        }
      })
      .slice(0, 5) as any[]
  }, [indicators])

  // Données pour le heatmap (simulées pour la démo)
  const heatmapActivities = useMemo(() => {
    // Utiliser les vraies données d'evidence si disponibles
    const activityByDate = new Map<string, number>()

    evidence.forEach((e: any) => {
      const dateKey = format(new Date(e.event_date), 'yyyy-MM-dd')
      activityByDate.set(dateKey, (activityByDate.get(dateKey) || 0) + 1)
    })

    // Convertir en format attendu
    const activities: { date: Date; count: number }[] = []
    const today = new Date()
    const startDate = subDays(today, 180) // 6 mois

    eachDayOfInterval({ start: startDate, end: today }).forEach((date) => {
      const dateKey = format(date, 'yyyy-MM-dd')
      activities.push({
        date,
        count: activityByDate.get(dateKey) || 0,
      })
    })

    return activities
  }, [evidence])

  // Handlers
  const handleSimulateAudit = useCallback(() => {
    // Rediriger vers la page de prévisualisation audit
    window.location.href = '/dashboard/qualiopi/audit-preview'
  }, [])

  const handleEnterAuditMode = useCallback(() => {
    // Rediriger vers la vue auditeur (Mode Prévisualisation)
    window.location.href = '/dashboard/qualiopi/audit-preview'
  }, [])

  if (loadingIndicators) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-[#34B9EE]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#34B9EE]/5 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header avec Score */}
        <PremiumHeader
          score={complianceRate}
          onSimulateAudit={handleSimulateAudit}
          onEnterAuditMode={handleEnterAuditMode}
        />

        {/* Progress Tracker */}
        <IndicatorProgressTracker indicators={indicators} />

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne gauche - Navigation des critères */}
          <div className="lg:col-span-3">
            <CriteriaNavigation
              criteria={criteriaData}
              selectedCriterion={selectedCriterion}
              onSelectCriterion={setSelectedCriterion}
            />
          </div>

          {/* Colonne centrale - Panneau des indicateurs */}
          <div className="lg:col-span-5">
            <IndicatorPanel
              criterionNumber={selectedCriterion}
              indicators={indicators}
            />
          </div>

          {/* Colonne droite - Alertes et Preuves */}
          <div className="lg:col-span-4 space-y-6">
            <CriticalAlerts indicators={riskIndicators} />
            <EvidenceVault evidence={evidence as any} />
          </div>
        </div>

        {/* Heatmap d'activité */}
        <ActivityHeatmap activities={heatmapActivities} weeks={26} />

        {/* Footer avec liens rapides */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/qualiopi/audits">
              <FileText className="h-4 w-4 mr-2" />
              Historique des audits
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/qualiopi/actions">
              <Sparkles className="h-4 w-4 mr-2" />
              Actions correctives
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/qualiopi/reports">
              <Download className="h-4 w-4 mr-2" />
              Exporter un rapport
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
