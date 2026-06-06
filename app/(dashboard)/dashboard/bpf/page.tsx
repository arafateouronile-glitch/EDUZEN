'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { bpfService } from '@/lib/services/bpf.client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  BarChart3,
  Plus,
  FileText,
  Download,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  DollarSign,
  BookOpen,
  Receipt,
  RefreshCw,
  Briefcase,
  Home,
  Package,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { TrialGate } from '@/components/trial/trial-gate'

export default function BPFPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1)

  // Query rapports BPF (liste depuis la table)
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['bpf-reports', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return await bpfService.getReports(user.organization_id)
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Données live (mêmes calculs que la page /dashboard/bpf/[year]) pour chaque année, incl. charges
  const { data: liveDataByYear = {}, isLoading: liveLoading, refetch: refetchLive } = useQuery({
    queryKey: ['bpf-reports-live', user?.organization_id, reports.map((r) => r.year).sort().join(',')],
    queryFn: async () => {
      if (!user?.organization_id || reports.length === 0) return {}
      const entries = await Promise.all(
        reports.map(async (r) => {
          const [stats, revenue, charges] = await Promise.all([
            bpfService.getStats(user.organization_id!, r.year),
            bpfService.getRevenueBreakdown(user.organization_id!, r.year),
            bpfService.getChargesBreakdown(user.organization_id!, r.year),
          ])
          return [r.year, { stats, revenue, charges }] as const
        })
      )
      return Object.fromEntries(entries)
    },
    enabled: !!user?.organization_id && reports.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  // Mutation pour créer un rapport
  const createReportMutation = useMutation({
    mutationFn: async (year: number) => {
      if (!user?.organization_id) throw new Error('Organization ID required')
      return await bpfService.createReport(user.organization_id, year)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bpf-reports'] })
      queryClient.invalidateQueries({ queryKey: ['bpf-reports-live'] })
      addToast({
        type: 'success',
        title: 'Rapport BPF créé',
        description: `Le rapport pour l'année ${selectedYear} a été créé avec succès.`,
      })
    },
    onError: (error: unknown) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de créer le rapport BPF.',
      })
    },
  })

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    submitted: 'bg-purple-100 text-purple-800',
  }

  const statusIcons = {
    draft: Clock,
    in_progress: AlertCircle,
    completed: CheckCircle,
    submitted: Send,
  }

  const statusLabels = {
    draft: 'Brouillon',
    in_progress: 'En cours',
    completed: 'Complété',
    submitted: 'Soumis',
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num)
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <TrialGate
      featureName="Bilan Pédagogique et Financier"
      featureDescription="Le BPF est le rapport annuel obligatoire pour les organismes de formation certifiés Qualiopi. Disponible avec un abonnement payant."
    >
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header amélioré */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
              Bilan Pédagogique et Financier
            </h1>
          </div>
          <p className="text-muted-foreground text-sm lg:text-base max-w-2xl">
            Gérez vos rapports annuels obligatoires pour les Organismes de Formation de manière simple et efficace
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchLive()}
            disabled={liveLoading || reports.length === 0}
            className="gap-2"
            title="Actualiser CA, charges et indicateurs"
          >
            <RefreshCw className={`h-4 w-4 ${liveLoading ? 'animate-spin' : ''}`} />
            Actualiser les données
          </Button>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2.5 border-2 border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background hover:bg-accent/5 text-sm font-medium"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>
                Année {year}
              </option>
            ))}
          </select>
          <Button
            onClick={() => createReportMutation.mutate(selectedYear)}
            disabled={createReportMutation.isPending}
            className="shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer rapport {selectedYear}
          </Button>
        </div>
      </div>

      {/* Info BPF améliorée */}
      <Card className="border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-blue/10 rounded-xl border border-brand-blue/20">
              <AlertCircle className="h-6 w-6 text-brand-blue" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 text-lg">Obligation réglementaire</h3>
                <Badge className="bg-brand-blue-ghost text-brand-blue text-xs">Important</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Le Bilan Pédagogique et Financier est un document obligatoire que tout organisme de formation doit
                  transmettre chaque année à l'administration.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-brand-blue" />
                  <span className="font-medium text-gray-900">Date limite : 30 avril de l'année N+1</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Ce rapport présente les données financières (chiffre d'affaires par source de financement) et
                  pédagogiques (nombre de stagiaires, heures de formation) de l'année écoulée.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des rapports */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-6 w-32 bg-muted rounded"></div>
                    <div className="h-4 w-48 bg-muted rounded"></div>
                  </div>
                  <div className="h-6 w-24 bg-muted rounded-full"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="p-5 bg-muted/50 rounded-xl">
                      <div className="h-5 w-5 bg-muted rounded mb-3"></div>
                      <div className="h-7 w-24 bg-muted rounded mb-2"></div>
                      <div className="h-3 w-16 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="h-5 w-32 bg-muted rounded"></div>
                  <div className="flex gap-2">
                    <div className="h-9 w-28 bg-muted rounded"></div>
                    <div className="h-9 w-28 bg-muted rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card className="border-dashed border-2 hover:border-primary/50 transition-all duration-300">
          <CardContent className="p-16 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-full opacity-50 blur-2xl"></div>
                </div>
                <div className="relative p-6 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-2xl inline-block">
                  <FileText className="h-16 w-16 mx-auto text-brand-blue" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Aucun rapport BPF</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Créez votre premier Bilan Pédagogique et Financier pour commencer à suivre vos indicateurs de formation
                </p>
              </div>
              <Button
                onClick={() => createReportMutation.mutate(selectedYear)}
                size="lg"
                className="shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Créer le rapport {selectedYear}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const StatusIcon = statusIcons[report.status]
            const live = liveDataByYear[report.year as keyof typeof liveDataByYear]
            const totalRevenue = live?.revenue?.total_revenue ?? report.total_revenue
            const totalStudents = live?.stats?.total_students_count ?? report.total_students
            const totalHours = live?.stats?.total_trainee_hours ?? report.total_training_hours ?? report.total_trainee_hours
            const totalPrograms = live?.stats?.total_programs_count ?? report.total_programs
            const totalCharges = live?.charges?.total_charges ?? report.subcontracting_amount ?? 0
            const hasData = totalRevenue > 0 || totalStudents > 0 || totalCharges > 0

            return (
              <Card key={report.id} className="hover:shadow-lg hover:scale-[1.01] transition-all duration-300 border-l-4 border-l-brand-blue/30">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="flex items-center gap-2.5 text-xl">
                        <div className="p-2 bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-brand-blue" />
                        </div>
                        BPF {report.year}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {report.submitted_at
                          ? `Soumis le ${new Date(report.submitted_at).toLocaleDateString('fr-FR')}`
                          : `Créé le ${new Date(report.created_at).toLocaleDateString('fr-FR')}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusColors[report.status]} px-3 py-1.5 text-xs font-medium`}>
                        <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                        {statusLabels[report.status]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Indicateurs clés améliorés */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <div className="group p-5 bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50 rounded-xl border border-brand-blue/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 bg-brand-blue/10 rounded-lg group-hover:bg-brand-blue/20 transition-colors">
                          <DollarSign className="h-5 w-5 text-brand-blue" />
                        </div>
                        <p className="text-xs font-medium text-gray-600">CA Total</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCurrency(totalRevenue)}
                      </p>
                      <p className="text-xs text-gray-600">Chiffre d'affaires</p>
                    </div>

                    <div className="group p-5 bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50 rounded-xl border border-brand-cyan/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 bg-brand-cyan/10 rounded-lg group-hover:bg-brand-cyan/20 transition-colors">
                          <Users className="h-5 w-5 text-brand-cyan" />
                        </div>
                        <p className="text-xs font-medium text-gray-600">Stagiaires</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {formatNumber(totalStudents)}
                      </p>
                      <p className="text-xs text-gray-600">Apprenants formés</p>
                    </div>

                    <div className="group p-5 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost/50 rounded-xl border border-brand-blue/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 bg-brand-blue/10 rounded-lg group-hover:bg-brand-blue/20 transition-colors">
                          <Clock className="h-5 w-5 text-brand-blue" />
                        </div>
                        <p className="text-xs font-medium text-gray-600">Heures</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {formatNumber(totalHours)}h
                      </p>
                      <p className="text-xs text-gray-600">Heures de formation</p>
                    </div>

                    <div className="group p-5 bg-gradient-to-br from-brand-cyan-ghost to-brand-blue-ghost/50 rounded-xl border border-brand-cyan/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 bg-brand-cyan/10 rounded-lg group-hover:bg-brand-cyan/20 transition-colors">
                          <BookOpen className="h-5 w-5 text-brand-cyan" />
                        </div>
                        <p className="text-xs font-medium text-gray-600">Programmes</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {formatNumber(totalPrograms)}
                      </p>
                      <p className="text-xs text-gray-600">Formations actives</p>
                    </div>

                    <div className="group p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/50 hover:shadow-lg hover:scale-105 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 bg-amber-100 rounded-lg group-hover:bg-amber-200/50 transition-colors">
                          <Receipt className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="text-xs font-medium text-gray-600">Charges</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCurrency(totalCharges)}
                      </p>
                      <p className="text-xs text-gray-600">Date de charge dans l&apos;année {report.year}</p>
                    </div>
                  </div>

                  {/* Ventilation des charges (année) */}
                  {(live?.charges && (live.charges.subcontracting > 0 || live.charges.location > 0 || live.charges.equipment > 0 || live.charges.supplies > 0 || live.charges.other > 0)) && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                      <p className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-2">
                        <Receipt className="h-3.5 w-3.5" />
                        Ventilation des charges {report.year}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Briefcase className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="text-gray-600 shrink-0">Sous-traitance</span>
                          <span className="font-medium text-gray-900">{formatCurrency(live.charges.subcontracting)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Home className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="text-gray-600 shrink-0">Location</span>
                          <span className="font-medium text-gray-900">{formatCurrency(live.charges.location)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Package className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="text-gray-600 shrink-0">Équipements</span>
                          <span className="font-medium text-gray-900">{formatCurrency(live.charges.equipment)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Wrench className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="text-gray-600 shrink-0">Fournitures</span>
                          <span className="font-medium text-gray-900">{formatCurrency(live.charges.supplies)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-gray-600 shrink-0">Autres</span>
                          <span className="font-medium text-gray-900">{formatCurrency(live.charges.other)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t">
                    <div className="text-sm">
                      {hasData ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200/50">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Données renseignées</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200/50">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Données à compléter</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dashboard/bpf/${report.year}`}>
                        <Button variant="outline" size="sm" className="hover:bg-brand-blue-ghost hover:border-brand-blue/30 hover:text-brand-blue transition-all">
                          <FileText className="h-4 w-4 mr-2" />
                          Voir le détail
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" className="hover:bg-brand-cyan-ghost hover:border-brand-cyan/30 hover:text-brand-cyan transition-all">
                        <Download className="h-4 w-4 mr-2" />
                        Exporter PDF
                      </Button>
                      {report.status === 'completed' && (
                        <Button size="sm" className="bg-brand-blue hover:bg-brand-blue-dark shadow-md hover:shadow-lg transition-all">
                          <Send className="h-4 w-4 mr-2" />
                          Soumettre
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
    </TrialGate>
  )
}
