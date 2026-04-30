'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  TrendingUp,
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
import { RevenueChart, MONTH_LABELS } from '@/components/super-admin/dashboard/revenue-chart'
import { SubscriptionsChart, getPlanColor } from '@/components/super-admin/dashboard/subscriptions-chart'
import { RecentActivity } from '@/components/super-admin/dashboard/recent-activity'
import { QuickActions } from '@/components/super-admin/dashboard/quick-actions'
import type { DashboardKPIs } from '@/types/super-admin.types'
import type { RevenueDataPoint } from '@/components/super-admin/dashboard/revenue-chart'
import type { SubscriptionDataPoint } from '@/components/super-admin/dashboard/subscriptions-chart'
import type { ActivityItem } from '@/components/super-admin/dashboard/recent-activity'

export default function SuperAdminDashboardPage() {
  const { canViewRevenue, platformAdmin } = usePlatformAdmin()
  const supabase = createClient()

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const { data: kpis, isLoading: kpisLoading, refetch } = useQuery({
    queryKey: ['super-admin-kpis'],
    queryFn: async (): Promise<DashboardKPIs> => {
      const { data } = await supabase
        .from('platform_metrics_daily')
        .select('mrr, arr, active_organizations, new_organizations, churn_rate, retention_rate, conversion_rate')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!data) return {
        mrr: 0, arr: 0, activeOrganizations: 0, newSubscribersThisMonth: 0,
        churnRate: 0, retentionRate: 0,
      }

      return {
        mrr: Number(data.mrr),
        arr: Number(data.arr),
        activeOrganizations: data.active_organizations,
        newSubscribersThisMonth: data.new_organizations,
        churnRate: Number(data.churn_rate ?? 0) * 100,
        retentionRate: Number(data.retention_rate ?? 0) * 100,
        conversionRate: Number(data.conversion_rate ?? 0) * 100,
        averageRevenuePerUser:
          data.active_organizations > 0
            ? Math.round(Number(data.mrr) / data.active_organizations)
            : 0,
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // ── Graphique MRR ─────────────────────────────────────────────────────────
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['super-admin-revenue-chart'],
    queryFn: async (): Promise<RevenueDataPoint[]> => {
      const { data } = await supabase
        .from('platform_revenue_monthly')
        .select('year, month, gross_revenue, new_business_revenue, net_revenue')
        .order('year', { ascending: true })
        .order('month', { ascending: true })
        .limit(12)

      if (!data || data.length === 0) {
        // Fallback : agréger depuis platform_metrics_daily (30 derniers jours → par mois)
        const { data: daily } = await supabase
          .from('platform_metrics_daily')
          .select('date, mrr, new_revenue, churned_revenue')
          .order('date', { ascending: true })
          .limit(365)

        if (!daily || daily.length === 0) return []

        const byMonth: Record<string, { mrr: number; newRevenue: number; churnedRevenue: number }> = {}
        for (const row of daily) {
          const d = new Date(row.date)
          const key = `${d.getFullYear()}-${d.getMonth()}`
          if (!byMonth[key]) byMonth[key] = { mrr: 0, newRevenue: 0, churnedRevenue: 0 }
          byMonth[key].mrr = Math.max(byMonth[key].mrr, Number(row.mrr))
          byMonth[key].newRevenue += Number(row.new_revenue ?? 0)
          byMonth[key].churnedRevenue += Number(row.churned_revenue ?? 0)
        }

        return Object.entries(byMonth).slice(-12).map(([key, val]) => {
          const [year, month] = key.split('-').map(Number)
          return { name: `${MONTH_LABELS[month]} ${year}`, ...val }
        })
      }

      return data.map((row) => ({
        name: MONTH_LABELS[row.month - 1],
        mrr: Number(row.gross_revenue),
        newRevenue: Number(row.new_business_revenue),
        churnedRevenue: Number(row.gross_revenue) - Number(row.net_revenue),
      }))
    },
    staleTime: 1000 * 60 * 10,
  })

  // ── Répartition abonnements ───────────────────────────────────────────────
  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['super-admin-subs-chart'],
    queryFn: async (): Promise<SubscriptionDataPoint[]> => {
      const { data } = await supabase
        .from('organization_subscriptions')
        .select('plan_id, status, subscription_plans(name, code)')
        .in('status', ['active', 'trial'])

      if (!data || data.length === 0) return []

      const counts: Record<string, { name: string; code: string; count: number }> = {}
      for (const row of data) {
        const plan = (row as any).subscription_plans
        if (!plan) continue
        const key = plan.code ?? plan.name
        if (!counts[key]) counts[key] = { name: plan.name, code: plan.code ?? '', count: 0 }
        counts[key].count++
      }

      return Object.values(counts).map(({ name, code, count }) => ({
        name,
        value: count,
        color: getPlanColor(code),
      }))
    },
    staleTime: 1000 * 60 * 5,
  })

  // ── Activité récente ──────────────────────────────────────────────────────
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['super-admin-activity'],
    queryFn: async (): Promise<ActivityItem[]> => {
      const items: ActivityItem[] = []

      // Derniers abonnements (actifs ou trial)
      const { data: recentSubs } = await supabase
        .from('organization_subscriptions')
        .select('id, status, created_at, canceled_at, organization_id, subscription_plans(name, code)')
        .order('created_at', { ascending: false })
        .limit(5)

      for (const sub of recentSubs ?? []) {
        const plan = (sub as any).subscription_plans
        const isCanceled = sub.status === 'canceled'
        items.push({
          id: sub.id,
          type: isCanceled ? 'churn' : 'subscription',
          title: isCanceled ? 'Annulation d\'abonnement' : `Nouvel abonnement ${plan?.name ?? ''}`,
          description: `Organisation ${sub.organization_id.slice(0, 8)}… — plan ${plan?.name ?? 'inconnu'}`,
          timestamp: formatRelative(isCanceled ? sub.canceled_at : sub.created_at),
          metadata: {
            plan: plan?.name,
            status: isCanceled ? 'warning' : 'success',
          },
        })
      }

      // Derniers articles publiés
      const { data: recentPosts } = await supabase
        .from('blog_posts')
        .select('id, title, published_at, status')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3)

      for (const post of recentPosts ?? []) {
        items.push({
          id: `blog-${post.id}`,
          type: 'blog',
          title: 'Article publié',
          description: `"${post.title}"`,
          timestamp: formatRelative(post.published_at),
          metadata: { status: 'success' },
        })
      }

      // Trier par timestamp (approximatif)
      return items.slice(0, 10)
    },
    staleTime: 1000 * 60 * 2,
  })

  const isLoading = kpisLoading || revenueLoading || subsLoading || activityLoading

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

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
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
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
          icon={<Building2 className="h-6 w-6 text-purple-600" />}
          iconBgColor="bg-purple-500/10"
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
          value={`${(kpis?.retentionRate || 0).toFixed(1)}%`}
          icon={<Activity className="h-6 w-6 text-emerald-600" />}
          iconBgColor="bg-emerald-500/10"
          loading={kpisLoading}
        />
        <StatsCard
          title="Taux de churn"
          value={`${(kpis?.churnRate || 0).toFixed(1)}%`}
          changeLabel="Objectif < 5%"
          icon={<UserMinus className="h-6 w-6 text-red-500" />}
          iconBgColor="bg-red-500/10"
          trend={(kpis?.churnRate || 0) < 5 ? 'up' : 'down'}
          loading={kpisLoading}
        />
        <StatsCard
          title="Taux de conversion"
          value={`${(kpis?.conversionRate || 0).toFixed(1)}%`}
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

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-3">
        {canViewRevenue && (
          <RevenueChart
            className="lg:col-span-2"
            data={revenueData ?? []}
            loading={revenueLoading}
          />
        )}
        <SubscriptionsChart
          data={subsData ?? []}
          loading={subsLoading}
        />
      </div>

      {/* Activité & Actions rapides */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RecentActivity
          className="lg:col-span-2"
          activities={activityData ?? []}
          loading={activityLoading}
        />
        <QuickActions />
      </div>
    </div>
  )
}

// ── Utilitaire ────────────────────────────────────────────────────────────────
function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}
