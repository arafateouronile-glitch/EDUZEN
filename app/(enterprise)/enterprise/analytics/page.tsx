'use client'

import { useQuery } from '@tanstack/react-query'
import { useEnterpriseCompany } from '@/lib/contexts/enterprise-company-context'
import { enterprisePortalService } from '@/lib/services/enterprise-portal.service.client'
import { GlassCard } from '@/components/ui/glass-card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BarChart3, Users, Clock, GraduationCap, Wallet } from 'lucide-react'
import { SkillsEvolutionChart } from '@/components/enterprise/skills-evolution-chart'
import { formatCurrency } from '@/lib/utils'

export default function EnterpriseAnalyticsPage() {
  const { company, isLoading: isLoadingCompany } = useEnterpriseCompany()

  const { data: kpis, isLoading: isLoadingKPIs } = useQuery({
    queryKey: ['enterprise-kpis', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      return enterprisePortalService.getCompanyKPIs(company.id)
    },
    enabled: !!company?.id,
  })

  const { data: skillsEvolution, isLoading: isLoadingSkills } = useQuery({
    queryKey: ['enterprise-skills-evolution', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      return enterprisePortalService.getSkillsEvolution(company.id, 12)
    },
    enabled: !!company?.id,
  })

  const { data: diplomaStats } = useQuery({
    queryKey: ['enterprise-compliance-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return { total: 0, expired: 0, warning: 0, valid: 0 }
      const res = await fetch(`/api/enterprise/compliance?company_id=${company.id}`)
      if (!res.ok) return { total: 0, expired: 0, warning: 0, valid: 0 }
      const json = await res.json()
      return json.stats ?? { total: 0, expired: 0, warning: 0, valid: 0 }
    },
    enabled: !!company?.id,
  })

  const isLoading = isLoadingCompany || isLoadingKPIs

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80 mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aucune entreprise associée</h2>
        <p className="text-gray-600 max-w-md">
          Votre compte n&apos;est pas encore associé à une entreprise. Veuillez contacter l&apos;organisme de formation.
        </p>
      </div>
    )
  }

  const conformityPct = diplomaStats && diplomaStats.total > 0
    ? Math.round((diplomaStats.valid / diplomaStats.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-[#274472]" />
          Statistiques
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Vue détaillée des indicateurs formation et conformité pour {company.name}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard variant="default" className="p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-[#274472]/10">
              <Users className="w-6 h-6 text-[#274472]" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{kpis?.activeEmployees ?? 0}</h3>
            <p className="text-sm font-medium text-gray-900 mt-1">Collaborateurs actifs</p>
            <p className="text-xs text-gray-500">Formations en cours ou à venir</p>
          </div>
        </GlassCard>

        <GlassCard variant="default" className="p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-emerald-100">
              <GraduationCap className="w-6 h-6 text-emerald-700" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{kpis?.completedTrainings ?? 0}</h3>
            <p className="text-sm font-medium text-gray-900 mt-1">Formations terminées</p>
            <p className="text-xs text-gray-500">Sur la période</p>
          </div>
        </GlassCard>

        <GlassCard variant="default" className="p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-amber-100">
              <Clock className="w-6 h-6 text-amber-700" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{kpis?.totalHours ?? 0} h</h3>
            <p className="text-sm font-medium text-gray-900 mt-1">Heures de formation</p>
            <p className="text-xs text-gray-500">Total réalisé</p>
          </div>
        </GlassCard>

        <GlassCard variant="default" className="p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-blue-100">
              <Wallet className="w-6 h-6 text-blue-700" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">
              {formatCurrency(kpis?.totalBudget ?? 0, kpis?.currency ?? 'EUR')}
            </h3>
            <p className="text-sm font-medium text-gray-900 mt-1">Budget engagé</p>
            <p className="text-xs text-gray-500">
              {(kpis?.forecastBudget ?? 0) > 0
                ? `+ ${formatCurrency(kpis?.forecastBudget ?? 0, kpis?.currency ?? 'EUR')} prévisionnel (devis non signés)`
                : 'Factures + devis signés/validés'}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Conformité habilitations */}
      <GlassCard variant="default" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conformité habilitations</h2>
          <span className="text-2xl font-bold text-gray-900">{conformityPct}%</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xl font-bold text-red-700">{diplomaStats?.expired ?? 0}</p>
            <p className="text-xs font-medium text-red-600">Expirés</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xl font-bold text-amber-700">{diplomaStats?.warning ?? 0}</p>
            <p className="text-xs font-medium text-amber-600">À renouveler</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <p className="text-xl font-bold text-emerald-700">{diplomaStats?.valid ?? 0}</p>
            <p className="text-xs font-medium text-emerald-600">Valides</p>
          </div>
        </div>
      </GlassCard>

      {/* Evolution des compétences */}
      <GlassCard variant="premium" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Évolution des compétences</h2>
            <p className="text-sm text-gray-500">Progression moyenne des collaborateurs sur 12 mois</p>
          </div>
        </div>
        {isLoadingSkills ? (
          <Skeleton className="h-80 w-full rounded-lg" />
        ) : (
          <SkillsEvolutionChart data={skillsEvolution ?? []} />
        )}
      </GlassCard>
    </div>
  )
}
