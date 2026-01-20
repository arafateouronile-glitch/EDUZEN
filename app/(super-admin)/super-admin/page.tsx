'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  TrendingUp,
  Users,
  Building2,
  CreditCard,
  Activity,
  Percent,
  RefreshCw,
  DollarSign,
  UserCheck,
  UserMinus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/super-admin/dashboard/stats-card'
import { RevenueChart } from '@/components/super-admin/dashboard/revenue-chart'
import { SubscriptionsChart } from '@/components/super-admin/dashboard/subscriptions-chart'
import { RecentActivity } from '@/components/super-admin/dashboard/recent-activity'
import { QuickActions } from '@/components/super-admin/dashboard/quick-actions'
import type { DashboardKPIs } from '@/types/super-admin.types'

export default function SuperAdminDashboardPage() {
  const { canViewRevenue, roleLabel, platformAdmin } = usePlatformAdmin()
  const supabase = createClient()

  // Fetch dashboard KPIs
  const { data: kpis, isLoading: kpisLoading, refetch } = useQuery({
    queryKey: ['super-admin-kpis'],
    queryFn: async (): Promise<DashboardKPIs> => {
      // For now, return sample data - in production, this would fetch from platform_metrics_daily
      // const { data, error } = await supabase
      //   .from('platform_metrics_daily')
      //   .select('*')
      //   .order('date', { ascending: false })
      //   .limit(1)
      //   .single()

      // Sample data for demonstration
      return {
        mrr: 14850,
        mrrGrowth: 12.5,
        arr: 178200,
        activeOrganizations: 193,
        newSubscribersThisMonth: 24,
        churnRate: 2.1,
        retentionRate: 97.9,
        conversionRate: 8.5,
        totalRevenue: 156780,
        averageRevenuePerUser: 77,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight"
          >
            {greeting()}, {platformAdmin?.user?.full_name?.split(' ')[0] || 'Admin'} 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Voici un aperçu de votre plateforme EDUZEN
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </motion.div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canViewRevenue && (
          <>
            <StatsCard
              title="MRR (Revenu Mensuel Récurrent)"
              value={formatCurrency(kpis?.mrr || 0)}
              change={kpis?.mrrGrowth}
              changeLabel="vs mois dernier"
              icon={<DollarSign className="h-6 w-6 text-brand-blue" />}
              iconBgColor="bg-brand-blue/10"
              trend={(kpis?.mrrGrowth || 0) > 0 ? 'up' : 'down'}
              loading={kpisLoading}
            />
            <StatsCard
              title="ARR (Revenu Annuel)"
              value={formatCurrency(kpis?.arr || 0)}
              icon={<TrendingUp className="h-6 w-6 text-emerald-600" />}
              iconBgColor="bg-emerald-500/10"
              loading={kpisLoading}
            />
          </>
        )}
        <StatsCard
          title="Organisations actives"
          value={kpis?.activeOrganizations || 0}
          change={8.2}
          changeLabel="vs mois dernier"
          icon={<Building2 className="h-6 w-6 text-purple-600" />}
          iconBgColor="bg-purple-500/10"
          trend="up"
          loading={kpisLoading}
        />
        <StatsCard
          title="Nouveaux abonnés (mois)"
          value={kpis?.newSubscribersThisMonth || 0}
          icon={<UserCheck className="h-6 w-6 text-brand-cyan" />}
          iconBgColor="bg-brand-cyan/10"
          loading={kpisLoading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Taux de rétention"
          value={`${kpis?.retentionRate || 0}%`}
          icon={<Activity className="h-6 w-6 text-emerald-600" />}
          iconBgColor="bg-emerald-500/10"
          loading={kpisLoading}
        />
        <StatsCard
          title="Taux de churn"
          value={`${kpis?.churnRate || 0}%`}
          changeLabel="Objectif < 5%"
          icon={<UserMinus className="h-6 w-6 text-red-500" />}
          iconBgColor="bg-red-500/10"
          trend={(kpis?.churnRate || 0) < 5 ? 'up' : 'down'}
          loading={kpisLoading}
        />
        <StatsCard
          title="Taux de conversion"
          value={`${kpis?.conversionRate || 0}%`}
          changeLabel="Essai → Payant"
          icon={<Percent className="h-6 w-6 text-amber-600" />}
          iconBgColor="bg-amber-500/10"
          loading={kpisLoading}
        />
        {canViewRevenue && (
          <StatsCard
            title="ARPU (Revenu par utilisateur)"
            value={formatCurrency(kpis?.averageRevenuePerUser || 0)}
            icon={<CreditCard className="h-6 w-6 text-indigo-600" />}
            iconBgColor="bg-indigo-500/10"
            loading={kpisLoading}
          />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {canViewRevenue && (
          <RevenueChart className="lg:col-span-2" loading={kpisLoading} />
        )}
        <SubscriptionsChart loading={kpisLoading} />
      </div>

      {/* Activity & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RecentActivity className="lg:col-span-2" loading={kpisLoading} />
        <QuickActions />
      </div>
    </div>
  )
}
