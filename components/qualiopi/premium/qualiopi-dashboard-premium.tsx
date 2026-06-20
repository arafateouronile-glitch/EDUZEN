'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'
import { qualiopiService, type QualiopiIndicator } from '@/lib/services/qualiopi.service.client'
import {
  QUALIOPI_REFERENTIAL,
} from '@/lib/services/auditor-portal.service'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Plus, AlertCircle } from 'lucide-react'

// Composants Premium
import { GlassCardPremium } from './glass-card-premium'
import { AuditScoreRing } from './audit-score-ring'
import { CriteriaNavigation } from './criterion-card'
import { EvidenceVault, type Evidence } from './evidence-vault'
import { CriticalAlerts, type RiskIndicator } from './critical-alerts'
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

// Map indicator_code (ex: "1.1") vers numéro référentiel 1-32
function indicatorCodeToReferentialNumber(code: string): number | null {
  const parts = code.split('.')
  const c = parseInt(parts[0], 10)
  const i = parseInt(parts[1], 10)
  if (Number.isNaN(c) || Number.isNaN(i)) return null
  const criterion = QUALIOPI_REFERENTIAL.find((cr) => cr.number === c)
  if (!criterion) return null
  const indicator = criterion.indicators[i - 1]
  return indicator?.number ?? null
}

// Progress Tracker pour les 32 indicateurs (utilise le statut effectif : preuves = en cours)
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
  indicators: QualiopiIndicator[]
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
              (i) => indicatorCodeToReferentialNumber(i.indicator_code) === indicator.number
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
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const supabase = createClient()
  const [selectedCriterion, setSelectedCriterion] = useState<number | null>(null)
  const [isAuditMode, setIsAuditMode] = useState(false)
  const [hasTriedInit, setHasTriedInit] = useState(false)

  // Récupérer les indicateurs
  const { data: indicators = [], isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery({
    queryKey: ['qualiopi-indicators-premium', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return qualiopiService.getIndicators(user.organization_id)
    },
    enabled: !!user?.organization_id,
    staleTime: 5 * 60 * 1000,
  })

  // Initialisation automatique des indicateurs quand aucun n'existe
  const initMutation = useMutation({
    mutationFn: () => qualiopiService.initializeIndicators(user!.organization_id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualiopi-indicators-premium'] })
      queryClient.invalidateQueries({ queryKey: ['qualiopi-compliance-rate-premium'] })
      refetchIndicators()
      addToast({
        type: 'success',
        title: 'Indicateurs Qualiopi initialisés',
        description: 'Les 32 indicateurs du référentiel ont été créés pour votre organisation.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur d\'initialisation',
        description: error?.message || 'Impossible d\'initialiser les indicateurs Qualiopi.',
      })
    },
  })

  // Initialisation automatique des indicateurs à la première visite si aucun n'existe
  useEffect(() => {
    if (!loadingIndicators || hasTriedInit) return
    if (indicators.length > 0) return
    if (!user?.organization_id) return
    setHasTriedInit(true)
    initMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init une seule fois quand indicateurs vides
  }, [loadingIndicators, indicators.length, user?.organization_id])

  // Score unique (API) : même source que le dashboard pour cohérence 13% / 19%
  const { data: apiComplianceScore } = useQuery({
    queryKey: ['qualiopi-compliance-rate', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const res = await fetch('/api/qualiopi/compliance-rate')
      if (!res.ok) return 0
      const json = await res.json()
      return typeof json.score === 'number' ? json.score : 0
    },
    enabled: !!user?.organization_id,
    refetchOnMount: true,
    staleTime: 1000,
  })
  const headerScore = apiComplianceScore ?? 0

  // Sync des preuves auto (catalogue, accessibilité, conventions, convocations) au chargement
  const { refetch: refetchEvidence } = useQuery({
    queryKey: ['qualiopi-sync-evidence', user?.organization_id],
    queryFn: async () => {
      const res = await fetch('/api/qualiopi/sync-evidence', { method: 'POST' })
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!user?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Récupérer les preuves automatisées + manuelles (qualiopi_evidence)
  type AutoEvidenceRow = {
    id: string
    title?: string
    indicator_number?: number
    evidence_type?: string
    source?: string
    entity_name?: string
    event_date?: string
    created_at?: string
    confidence_score?: number
    file_url?: string
  }
  type ManualEvidenceRow = {
    id: string
    title?: string
    qualiopi_indicators?: { indicator_code?: string; indicator_name?: string } | null
    evidence_type?: string
    upload_date?: string
    created_at?: string
    file_url?: string
  }

  const { data: evidenceRaw = [], refetch: refetchEvidenceList } = useQuery({
    queryKey: ['compliance-evidence-premium', user?.organization_id],
    queryFn: async (): Promise<Evidence[]> => {
      if (!user?.organization_id) return []
      const [autoRes, manualRes] = await Promise.all([
        (supabase as { from: (t: string) => ReturnType<typeof supabase.from> })
          .from('compliance_evidence_automated')
          .select('*')
          .eq('organization_id', user.organization_id)
          .eq('status', 'valid')
          .order('event_date', { ascending: false })
          .limit(100),
        (supabase as { from: (t: string) => ReturnType<typeof supabase.from> })
          .from('qualiopi_evidence')
          .select('*, qualiopi_indicators(indicator_code, indicator_name)')
          .eq('organization_id', user.organization_id)
          .in('status', ['pending', 'approved'])
          .order('upload_date', { ascending: false })
          .limit(100),
      ])
      const manualData = (manualRes.error ? [] : (manualRes.data || [])) as unknown as ManualEvidenceRow[]
      const autoRows = (autoRes.data || []) as unknown as AutoEvidenceRow[]
      const auto: Evidence[] = autoRows.map((e: AutoEvidenceRow) => ({
        id: e.id,
        title: e.title ?? '',
        indicator_number: e.indicator_number ?? 1,
        evidence_type: (e.evidence_type === 'certificate' ? 'certificate' : 'document') as Evidence['evidence_type'],
        source: (e.source === 'automated_detection' ? 'automated_detection' : 'system') as Evidence['source'],
        entity_name: e.entity_name,
        event_date: e.event_date ?? new Date().toISOString(),
        created_at: e.created_at ?? new Date().toISOString(),
        confidence_score: e.confidence_score ?? 100,
        file_url: e.file_url,
      }))
      const manual: Evidence[] = manualData.map((e: ManualEvidenceRow) => {
        const ind = e.qualiopi_indicators
        const code = String(ind?.indicator_code ?? '1.1').trim()
        let refNum = indicatorCodeToReferentialNumber(code)
        if (refNum == null && /^[1-9]$|^[1-2][0-9]$|^3[0-2]$/.test(code)) {
          refNum = parseInt(code, 10)
        }
        return {
          id: e.id,
          title: e.title ?? '',
          indicator_number: refNum ?? 1,
          evidence_type: (e.evidence_type === 'certificate' ? 'certificate' : 'document') as Evidence['evidence_type'],
          source: 'manual_upload' as const,
          entity_name: ind?.indicator_name ?? e.title,
          event_date: e.upload_date ?? e.created_at ?? new Date().toISOString(),
          created_at: e.created_at ?? new Date().toISOString(),
          confidence_score: 80,
          file_url: e.file_url,
        }
      })
      const merged = [...auto, ...manual].sort(
        (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      )
      return merged.slice(0, 50)
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  const evidence = evidenceRaw

  const handleRefreshEvidence = useCallback(async () => {
    await fetch('/api/qualiopi/sync-evidence', { method: 'POST' })
    queryClient.invalidateQueries({ queryKey: ['compliance-evidence-premium'] })
    queryClient.invalidateQueries({ queryKey: ['qualiopi-compliance-rate'] })
    await refetchEvidenceList()
  }, [queryClient, refetchEvidenceList])

  // Au premier chargement : lancer les deux syncs en parallèle puis rafraîchir
  useEffect(() => {
    if (!user?.organization_id) return
    let cancelled = false
    Promise.all([
      fetch('/api/qualiopi/sync-evidence', { method: 'POST' }),
      fetch('/api/qualiopi/sync-questionnaire-analysis', { method: 'POST' }),
    ])
      .then(async () => {
        if (cancelled) return
        queryClient.invalidateQueries({ queryKey: ['compliance-evidence-premium'] })
        queryClient.invalidateQueries({ queryKey: ['qualiopi-compliance-rate'] })
        queryClient.invalidateQueries({ queryKey: ['questionnaire-analysis'] })
        await refetchEvidenceList()
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when org is set
  }, [user?.organization_id])

  // Indicateurs du référentiel ayant au moins une preuve (auto ou manuelle)
  const evidenceIndicatorNumbers = useMemo(
    () => new Set(evidence.map((e) => e.indicator_number)),
    [evidence]
  )

  // Statut effectif : si un indicateur a des preuves et est encore "not_started", on l'affiche "in_progress"
  const effectiveIndicators = useMemo(() => {
    return indicators.map((ind) => {
      const refNum = indicatorCodeToReferentialNumber(ind.indicator_code)
      const hasEvidence = refNum != null && evidenceIndicatorNumbers.has(refNum)
      const status =
        ind.status === 'not_started' && hasEvidence ? 'in_progress' : ind.status
      return { ...ind, status }
    })
  }, [indicators, evidenceIndicatorNumbers])

  // Calculer les données pour les critères (indicateurs effectifs + preuves si pas d'indicateurs DB)
  const criteriaData = useMemo(() => {
    const refNumbersByCriterion = new Map(
      QUALIOPI_REFERENTIAL.map((c) => [c.number, new Set(c.indicators.map((i) => i.number))])
    )
    return QUALIOPI_REFERENTIAL.map((criterion) => {
      const criterionIndicators = effectiveIndicators.filter((ind) => {
        const refNum = indicatorCodeToReferentialNumber(ind.indicator_code)
        return refNum != null && criterion.indicators.some((ci) => ci.number === refNum)
      })
      const refNumbers = refNumbersByCriterion.get(criterion.number)!

      const compliantCount = criterionIndicators.filter(
        (i) => i.status === 'compliant'
      ).length
      let inProgressCount = criterionIndicators.filter(
        (i) => i.status === 'in_progress'
      ).length
      if (criterionIndicators.length === 0) {
        inProgressCount = [...evidenceIndicatorNumbers].filter((num) => refNumbers.has(num)).length
      }
      const coveredCount = compliantCount + inProgressCount
      const total = criterion.indicators.length

      return {
        number: criterion.number,
        name: criterion.name,
        indicatorCount: total,
        compliantCount,
        inProgressCount,
        coveredCount,
        completionRate:
          total > 0 ? Math.round((coveredCount / total) * 100) : 0,
      }
    })
  }, [effectiveIndicators, evidenceIndicatorNumbers])

  const riskIndicators = useMemo((): RiskIndicator[] => {
    return effectiveIndicators
      .filter(
        (i) =>
          i.status === 'not_started' ||
          i.status === 'non_compliant' ||
          i.status === 'needs_improvement'
      )
      .map((i): RiskIndicator => {
        const criterionNumber =
          QUALIOPI_REFERENTIAL.find((c) =>
            c.indicators.some((ci) => ci.number === parseInt(i.indicator_code, 10))
          )?.number ?? 1
        return {
          id: i.id,
          indicator_code: i.indicator_code,
          indicator_name: i.indicator_name,
          criterionNumber,
          status: i.status as RiskIndicator['status'],
          compliance_rate: i.compliance_rate,
          evidence_count: 0,
          riskLevel:
            i.status === 'non_compliant'
              ? 'critical'
              : i.status === 'not_started'
              ? 'high'
              : 'medium',
          recommendation: undefined,
        }
      })
      .slice(0, 5)
  }, [effectiveIndicators])

  // Données pour le heatmap (simulées pour la démo)
  const heatmapActivities = useMemo(() => {
    // Utiliser les vraies données d'evidence si disponibles
    const activityByDate = new Map<string, number>()

    evidence.forEach((e: Evidence) => {
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

  // Aucun indicateur : initialisation en cours ou échec avec retry
  if (indicators.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#34B9EE]/5 p-6 flex items-center justify-center">
        <GlassCardPremium variant="default" className="p-8 max-w-md text-center">
          <Shield className="h-14 w-14 text-[#274472] mx-auto mb-4" />
          <h2 className="font-space-grotesk text-xl font-bold text-[#274472] mb-2">
            Module Qualiopi
          </h2>
          <p className="text-slate-600 text-sm mb-6">
            {initMutation.isPending ? (
              <>Création automatique des 32 indicateurs du référentiel Qualiopi…</>
            ) : initMutation.isError ? (
              <>Les indicateurs n&apos;ont pas pu être créés automatiquement. Vous pouvez réessayer.</>
            ) : (
              <>Aucun indicateur configuré. Initialisation en cours…</>
            )}
          </p>
          {initMutation.isPending && (
            <RefreshCw className="h-10 w-10 animate-spin text-[#34B9EE] mx-auto" />
          )}
          {initMutation.isError && (
            <Button
              onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Initialiser les indicateurs Qualiopi
            </Button>
          )}
        </GlassCardPremium>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#34B9EE]/5 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header avec Score (API partagée avec le dashboard pour affichage identique) */}
        <PremiumHeader
          score={headerScore}
          onSimulateAudit={handleSimulateAudit}
          onEnterAuditMode={handleEnterAuditMode}
        />

        {/* Progress Tracker (mis à jour par les preuves auto + manuelles) */}
        <IndicatorProgressTracker indicators={effectiveIndicators} />

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

          {/* Colonne centrale - Panneau des indicateurs (statut effectif selon preuves) */}
          <div className="lg:col-span-5">
            <IndicatorPanel
              criterionNumber={selectedCriterion}
              indicators={effectiveIndicators}
            />
          </div>

          {/* Colonne droite - Alertes et Preuves */}
          <div className="lg:col-span-4 space-y-6">
            <CriticalAlerts indicators={riskIndicators} />
            <EvidenceVault
              evidence={evidence}
              onRefreshEvidence={handleRefreshEvidence}
            />
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
            <Link href="/dashboard/qualiopi/auditor-links">
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
            <Link href="/dashboard/qualiopi/questionnaire-analysis">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analyse questionnaires
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/qualiopi/evidence">
              <Download className="h-4 w-4 mr-2" />
              Exporter un rapport
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
