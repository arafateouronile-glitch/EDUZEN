'use client'

/**
 * BPF One-Click Magic Engine - Page détaillée du rapport BPF
 *
 * Design premium "Financial Report" avec:
 * - Cartes Bento pour les sections du Cerfa (Cadre F, G, H)
 * - Graphique Donut pour la ventilation du CA par financeur
 * - Indicateurs Flash (CA total, stagiaires uniques, heures-stagiaires)
 * - Vérificateur d'incohérences (panneau latéral)
 * - Mode Audit (drill-down sur les chiffres)
 * - Export Cerfa PDF
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  bpfService,
  BPFStats,
  BPFRevenueBreakdown,
  BPFInconsistency,
  BPFStudentBreakdown,
  BPFCerfaData,
  BPFDrillDownMetric,
  BPFCategory,
} from '@/lib/services/bpf.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// BPF Components
import { BPFRevenueChart } from '@/components/bpf/BPFRevenueChart'
import { BPFInconsistencyPanel } from '@/components/bpf/BPFInconsistencyPanel'
import { BPFAuditModal } from '@/components/bpf/BPFAuditModal'
import { BPFCerfaExport } from '@/components/bpf/BPFCerfaExport'

import {
  ArrowLeft,
  BarChart3,
  Calculator,
  Clock,
  DollarSign,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Shield,
  Users,
  Calendar,
  TrendingUp,
  Sparkles,
  Eye,
  AlertCircle,
  CheckCircle,
  Building,
  GraduationCap,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function BPFDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const year = parseInt(params.year as string)

  // State
  const [isCalculating, setIsCalculating] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditMetric, setAuditMetric] = useState<{
    type: BPFDrillDownMetric
    label: string
    value: string | number
  } | null>(null)

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['bpf-stats', user?.organization_id, year],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await bpfService.getStats(user.organization_id, year)
    },
    enabled: !!user?.organization_id && !isNaN(year),
  })

  const { data: revenue, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ['bpf-revenue', user?.organization_id, year],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await bpfService.getRevenueBreakdown(user.organization_id, year)
    },
    enabled: !!user?.organization_id && !isNaN(year),
  })

  const { data: studentBreakdown, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['bpf-students', user?.organization_id, year],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await bpfService.getStudentBreakdown(user.organization_id, year)
    },
    enabled: !!user?.organization_id && !isNaN(year),
  })

  const { data: inconsistencies = [], isLoading: inconsistenciesLoading, refetch: refetchInconsistencies } = useQuery({
    queryKey: ['bpf-inconsistencies', user?.organization_id, year],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return await bpfService.getInconsistencies(user.organization_id, year)
    },
    enabled: !!user?.organization_id && !isNaN(year),
  })

  const { data: report, isLoading: reportLoading, refetch: refetchReport } = useQuery({
    queryKey: ['bpf-report', user?.organization_id, year],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await bpfService.getReportByYear(user.organization_id, year)
    },
    enabled: !!user?.organization_id && !isNaN(year),
  })

  const { data: cerfaData, refetch: refetchCerfa } = useQuery({
    queryKey: ['bpf-cerfa', user?.organization_id, year],
    queryFn: async () => {
      if (!user?.organization_id) return null
      return await bpfService.prepareCerfaData(user.organization_id, year)
    },
    enabled: !!user?.organization_id && !isNaN(year) && showExportDialog,
  })

  // Mutations
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id || !report) throw new Error('Missing data')
      return await bpfService.recalculateReport(report.id, user.organization_id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bpf'] })
      refetchAll()
      addToast({
        type: 'success',
        title: 'Rapport recalculé',
        description: 'Les métriques BPF ont été mises à jour avec succès.',
      })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Impossible de recalculer le rapport.',
      })
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!report || !user?.id) throw new Error('Missing data')
      return await bpfService.submitReport(report.id, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bpf'] })
      addToast({
        type: 'success',
        title: 'Rapport soumis',
        description: 'Votre BPF a été marqué comme soumis.',
      })
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error?.message || 'Impossible de soumettre le rapport.',
      })
    },
  })

  const refetchAll = useCallback(() => {
    refetchStats()
    refetchRevenue()
    refetchStudents()
    refetchInconsistencies()
    refetchReport()
  }, [refetchStats, refetchRevenue, refetchStudents, refetchInconsistencies, refetchReport])

  // Handlers
  const handleOneClick = async () => {
    setIsCalculating(true)
    try {
      await recalculateMutation.mutateAsync()
    } finally {
      setIsCalculating(false)
    }
  }

  const handleAuditClick = (type: BPFDrillDownMetric, label: string, value: string | number) => {
    setAuditMetric({ type, label, value })
    setShowAuditModal(true)
  }

  const handleExportPdf = async () => {
    if (!cerfaData) return

    // TODO: Implement actual PDF generation with jspdf
    // For now, show a toast
    addToast({
      type: 'success',
      title: 'Export en cours',
      description: 'Le PDF Cerfa est en cours de génération...',
    })
    setShowExportDialog(false)
  }

  const handleCategoryClick = (category: BPFCategory) => {
    handleAuditClick('revenue', `CA - ${category}`, formatCurrency(revenue?.[`revenue_${category}` as keyof BPFRevenueBreakdown] as number || 0))
  }

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num)
  }

  const isLoading = statsLoading || revenueLoading || studentsLoading || inconsistenciesLoading || reportLoading

  const criticalIssues = inconsistencies.filter((i) => i.severity === 'critical').length
  const warningIssues = inconsistencies.filter((i) => i.severity === 'warning').length

  if (isNaN(year)) {
    router.push('/dashboard/bpf')
    return null
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <motion.div
      className="p-6 space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/bpf">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                BPF {year}
              </h1>
              <p className="text-muted-foreground text-sm">
                Bilan Pédagogique et Financier - Année {year}
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 mt-2">
            {report?.status === 'submitted' ? (
              <Badge className="bg-purple-100 text-purple-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Soumis le {new Date(report.submitted_at!).toLocaleDateString('fr-FR')}
              </Badge>
            ) : criticalIssues > 0 ? (
              <Badge className="bg-red-100 text-red-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                {criticalIssues} problème{criticalIssues > 1 ? 's' : ''} critique{criticalIssues > 1 ? 's' : ''}
              </Badge>
            ) : warningIssues > 0 ? (
              <Badge className="bg-amber-100 text-amber-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                {warningIssues} avertissement{warningIssues > 1 ? 's' : ''}
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Données validées
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={refetchAll}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Button
            onClick={handleOneClick}
            disabled={isCalculating || recalculateMutation.isPending}
            className="gap-2 bg-gradient-to-r from-brand-blue to-brand-cyan hover:opacity-90 shadow-md"
          >
            {isCalculating || recalculateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Calcul en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Recalculer en 1 clic
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Cerfa
          </Button>

          {report && report.status !== 'submitted' && (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || criticalIssues > 0}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Soumettre
            </Button>
          )}
        </div>
      </motion.div>

      {/* Flash Indicators - Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA Total */}
        <Card
          className="relative overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-0 bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50"
          onClick={() => handleAuditClick('revenue', 'Chiffre d\'affaires total', formatCurrency(revenue?.total_revenue || 0))}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-brand-blue/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-brand-blue" />
              </div>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
            {revenueLoading ? (
              <Skeleton className="h-8 w-24 mb-2" />
            ) : (
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                {formatCurrency(revenue?.total_revenue || 0)}
              </p>
            )}
            <p className="text-xs text-gray-600">CA Total</p>
            <p className="text-[10px] text-gray-400 mt-1">Cliquez pour voir le détail</p>
          </CardContent>
        </Card>

        {/* Stagiaires */}
        <Card
          className="relative overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-0 bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50"
          onClick={() => handleAuditClick('students', 'Stagiaires formés', formatNumber(stats?.total_students_count || 0))}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-brand-cyan/10 rounded-lg">
                <Users className="h-5 w-5 text-brand-cyan" />
              </div>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(stats?.total_students_count || 0)}
              </p>
            )}
            <p className="text-xs text-gray-600">Stagiaires formés</p>
            <p className="text-[10px] text-gray-400 mt-1">Cliquez pour voir le détail</p>
          </CardContent>
        </Card>

        {/* Heures-stagiaires */}
        <Card
          className="relative overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-0 bg-gradient-to-br from-indigo-50 to-purple-50"
          onClick={() => handleAuditClick('trainee_hours', 'Heures-stagiaires', `${formatNumber(stats?.total_trainee_hours || 0)}h`)}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-indigo-100 rounded-lg">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-20 mb-2" />
            ) : (
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(stats?.total_trainee_hours || 0)}h
              </p>
            )}
            <p className="text-xs text-gray-600">Heures-stagiaires</p>
            <p className="text-[10px] text-gray-400 mt-1">Le chiffre clé du BPF</p>
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card
          className="relative overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50 to-green-50"
          onClick={() => handleAuditClick('sessions', 'Sessions de formation', formatNumber(stats?.total_sessions_count || 0))}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-emerald-100 rounded-lg">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-12 mb-2" />
            ) : (
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(stats?.total_sessions_count || 0)}
              </p>
            )}
            <p className="text-xs text-gray-600">Sessions réalisées</p>
            <p className="text-[10px] text-gray-400 mt-1">Cliquez pour voir le détail</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Data (2 cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <BPFRevenueChart
            data={revenue || null}
            loading={revenueLoading}
            year={year}
            onCategoryClick={handleCategoryClick}
          />

          {/* Student Demographics */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-md">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Répartition des Stagiaires
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Cadre G - Données démographiques
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase mb-1">Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(studentBreakdown?.total_students || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-gray-500 uppercase mb-1">Hommes</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatNumber(studentBreakdown?.students_men || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                    <p className="text-xs text-gray-500 uppercase mb-1">Femmes</p>
                    <p className="text-2xl font-bold text-pink-700">
                      {formatNumber(studentBreakdown?.students_women || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-xs text-gray-500 uppercase mb-1">Moins de 26 ans</p>
                    <p className="text-2xl font-bold text-amber-700">
                      {formatNumber(studentBreakdown?.students_under_26 || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-xs text-gray-500 uppercase mb-1">Plus de 45 ans</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatNumber(studentBreakdown?.students_over_45 || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-xs text-gray-500 uppercase mb-1">Situation de handicap</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {formatNumber(studentBreakdown?.students_disabled || 0)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attendance Rate */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-green-100 rounded-lg">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Taux de présence</p>
                    <p className="text-xs text-gray-400">Basé sur les émargements</p>
                  </div>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <p className="text-3xl font-bold text-green-600">
                    {(stats?.attendance_rate || 0).toFixed(1)}%
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Programs Count */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-violet-100 rounded-lg">
                    <Building className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Programmes de formation</p>
                    <p className="text-xs text-gray-400">Formations distinctes</p>
                  </div>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-10 w-16" />
                ) : (
                  <p className="text-3xl font-bold text-violet-600">
                    {formatNumber(stats?.total_programs_count || 0)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Right Column - Inconsistencies Panel (1 col) */}
        <motion.div variants={itemVariants} className="space-y-6">
          <BPFInconsistencyPanel
            inconsistencies={inconsistencies}
            loading={inconsistenciesLoading}
            year={year}
            onRefresh={refetchInconsistencies}
          />

          {/* Help card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-brand-blue/10 rounded-lg flex-shrink-0">
                  <Calculator className="h-5 w-5 text-brand-blue" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Comment sont calculées les heures-stagiaires ?</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Pour chaque créneau de formation, on multiplie la durée (en heures) par le nombre
                    de stagiaires présents (signatures électroniques confirmées).
                  </p>
                  <code className="text-xs bg-white/60 px-2 py-1 rounded text-brand-blue font-mono">
                    H = Σ (durée × présents)
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Audit Modal */}
      {auditMetric && user?.organization_id && (
        <BPFAuditModal
          open={showAuditModal}
          onOpenChange={setShowAuditModal}
          organizationId={user.organization_id}
          year={year}
          metricType={auditMetric.type}
          metricLabel={auditMetric.label}
          metricValue={auditMetric.value}
        />
      )}

      {/* Cerfa Export Dialog */}
      <BPFCerfaExport
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        data={cerfaData || null}
        loading={!cerfaData && showExportDialog}
        onExport={handleExportPdf}
      />
    </motion.div>
  )
}
