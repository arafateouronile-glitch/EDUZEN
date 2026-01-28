'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { enterprisePortalService, type CompanyKPIs, type EmployeeProgress } from '@/lib/services/enterprise-portal.service'
import { GlassCard } from '@/components/ui/glass-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Wallet,
  Clock,
  UserCheck,
  Users,
  GraduationCap,
  FileText,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Plus,
  Download,
  Share2,
} from 'lucide-react'
import Link from 'next/link'
import { SkillsEvolutionChart } from '@/components/enterprise/skills-evolution-chart'
import { EmployeeTrackingTable } from '@/components/enterprise/employee-tracking-table'

export default function EnterprisePortalPage() {
  const { user } = useAuth()
  const supabase = createClient()

  // Get company for current user
  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['enterprise-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      return enterprisePortalService.getCompanyForManager(user.id)
    },
    enabled: !!user?.id,
  })

  // Get KPIs
  const { data: kpis, isLoading: isLoadingKPIs } = useQuery({
    queryKey: ['enterprise-kpis', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      return enterprisePortalService.getCompanyKPIs(company.id)
    },
    enabled: !!company?.id,
  })

  // Get employee progress
  const { data: employeeProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['enterprise-employee-progress', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      return enterprisePortalService.getEmployeeProgress(company.id)
    },
    enabled: !!company?.id,
  })

  // Get skills evolution data
  const { data: skillsEvolution } = useQuery({
    queryKey: ['enterprise-skills-evolution', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      return enterprisePortalService.getSkillsEvolution(company.id, 12)
    },
    enabled: !!company?.id,
  })

  // Get recent invoices
  const { data: invoicesData } = useQuery({
    queryKey: ['enterprise-invoices', company?.id],
    queryFn: async () => {
      if (!company?.id) return { invoices: [], total: 0 }
      return enterprisePortalService.getCompanyInvoices(company.id, { limit: 5 })
    },
    enabled: !!company?.id,
  })

  const isLoading = isLoadingCompany || isLoadingKPIs

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aucune entreprise associée</h2>
        <p className="text-gray-600 max-w-md">
          Votre compte n'est pas encore associé à une entreprise. Veuillez contacter l'organisme de formation pour obtenir l'accès à votre espace entreprise.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Vue d'ensemble de l'activité formation de {company.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/enterprise/trainings/request">
            <Button className="bg-[#274472] hover:bg-[#1e3a5f]">
              <Plus className="w-4 h-4 mr-2" />
              Demander une formation
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Budget engagé"
          value={formatCurrency(kpis?.totalBudget || 0, kpis?.currency || 'EUR')}
          subtitle="Année en cours"
          icon={Wallet}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
        <KPICard
          title="Heures de formation"
          value={`${kpis?.totalHours || 0}h`}
          subtitle="Cumul annuel"
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <KPICard
          title="Taux de présence"
          value={`${kpis?.averageAttendanceRate || 0}%`}
          subtitle="Moyenne collaborateurs"
          icon={UserCheck}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
          trend={kpis?.averageAttendanceRate && kpis.averageAttendanceRate >= 80 ? 'up' : 'down'}
        />
        <KPICard
          title="Collaborateurs"
          value={kpis?.activeEmployees || 0}
          subtitle={`${kpis?.ongoingTrainings || 0} en formation`}
          icon={Users}
          iconColor="text-orange-600"
          iconBg="bg-orange-100"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Tracking - Takes 2 columns */}
        <div className="lg:col-span-2">
          <GlassCard variant="premium" className="p-0 overflow-hidden">
            <div className="p-6 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Suivi des collaborateurs
                  </h2>
                  <p className="text-sm text-gray-500">
                    Progression et présence en temps réel
                  </p>
                </div>
                <Link href="/enterprise/employees">
                  <Button variant="outline" size="sm">
                    Voir tout
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-6">
              <EmployeeTrackingTable
                employees={employeeProgress || []}
                isLoading={isLoadingProgress}
                limit={5}
              />
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions & Stats - 1 column */}
        <div className="space-y-6">
          {/* Training Stats */}
          <GlassCard variant="default" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Formations</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Terminées</p>
                    <p className="text-sm text-gray-500">Cette année</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {kpis?.completedTrainings || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">En cours</p>
                    <p className="text-sm text-gray-500">Actuellement</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {kpis?.ongoingTrainings || 0}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard variant="default" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
            <div className="space-y-2">
              <Link href="/enterprise/employees/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Inscrire un collaborateur
                </Button>
              </Link>
              <Link href="/enterprise/documents" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger les documents
                </Button>
              </Link>
              <Link href="/enterprise/opco-share" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager avec mon OPCO
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Skills Evolution Chart */}
      <GlassCard variant="premium" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Evolution des compétences
            </h2>
            <p className="text-sm text-gray-500">
              Progression moyenne des collaborateurs sur 12 mois
            </p>
          </div>
          <Link href="/enterprise/analytics">
            <Button variant="outline" size="sm">
              Statistiques détaillées
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <SkillsEvolutionChart data={skillsEvolution || []} />
      </GlassCard>

      {/* Billing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <GlassCard variant="default" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Facturation récente
            </h3>
            <Link href="/enterprise/billing">
              <Button variant="ghost" size="sm">
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {invoicesData?.invoices && invoicesData.invoices.length > 0 ? (
              invoicesData.invoices.slice(0, 5).map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <FileText className="w-5 h-5 text-[#274472]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {invoice.invoice_number}
                      </p>
                      <p className="text-sm text-gray-500">
                        {invoice.student?.first_name} {invoice.student?.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(invoice.total_amount, invoice.currency)}
                    </p>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                Aucune facture récente
              </p>
            )}
          </div>
          {(kpis?.pendingInvoices || 0) > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">
                  {kpis?.pendingInvoices} facture(s) en attente de paiement
                </span>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Document Downloads */}
        <GlassCard variant="default" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Documents à télécharger
            </h3>
            <Link href="/enterprise/documents">
              <Button variant="ghost" size="sm">
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Certificats de réalisation et attestations d'assiduité pour vos remboursements OPCO.
          </p>
          <div className="space-y-2">
            <Link href="/enterprise/documents?type=certificate">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Certificats de réalisation
                </span>
                <Download className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/enterprise/documents?type=attestation">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Attestations d'assiduité
                </span>
                <Download className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/enterprise/documents?type=convention">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Conventions de formation
                </span>
                <Download className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link href="/enterprise/opco-share">
              <Button className="w-full bg-[#274472] hover:bg-[#1e3a5f]">
                <Share2 className="w-4 h-4 mr-2" />
                Partager avec mon OPCO
              </Button>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// KPI Card Component
interface KPICardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  trend?: 'up' | 'down'
}

function KPICard({ title, value, subtitle, icon: Icon, iconColor, iconBg, trend }: KPICardProps) {
  return (
    <GlassCard variant="default" className="p-5">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-sm font-medium text-gray-900 mt-1">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </GlassCard>
  )
}

// Invoice Status Badge
function InvoiceStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    paid: { label: 'Payée', className: 'bg-green-100 text-green-700' },
    sent: { label: 'Envoyée', className: 'bg-blue-100 text-blue-700' },
    partial: { label: 'Partielle', className: 'bg-amber-100 text-amber-700' },
    overdue: { label: 'En retard', className: 'bg-red-100 text-red-700' },
    draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
  }

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
