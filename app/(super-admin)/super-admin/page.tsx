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
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [{ data: activeSubs }, { count: churnedThisMonth }] = await Promise.all([
        supabase
          .from('organization_subscriptions')
          .select('organization_id, status, billing_cycle, created_at, subscription_plans(price_monthly, price_yearly)')
          .in('status', ['active', 'trial']),
        supabase
          .from('organization_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'canceled')
          .gte('canceled_at', startOfMonth),
      ])

      const subs = activeSubs ?? []
      const activeOrgs = new Set(subs.map(s => s.organization_id)).size
      const newThisMonth = new Set(
        subs.filter(s => s.created_at >= startOfMonth).map(s => s.organization_id)
      ).size

      const mrr = subs
        .filter(s => s.status === 'active')
        .reduce((sum, s) => {
          const plan = (s as any).subscription_plans
          if (!plan) return sum
          const monthly = s.billing_cycle === 'yearly'
            ? (Number(plan.price_yearly) || 0) / 12
            : (Number(plan.price_monthly) || 0)
          return sum + monthly
        }, 0)

      const churned = churnedThisMonth ?? 0
      const total = subs.length + churned
      const churnRate = total > 0 ? (churned / total) * 100 : 0
      const activeCount = subs.filter(s => s.status === 'active').length
      const trialCount = subs.filter(s => s.status === 'trial').length
      const conversionRate = (activeCount + trialCount) > 0
        ? (activeCount / (activeCount + trialCount)) * 100
        : 0

      return {
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        activeOrganizations: activeOrgs,
        newSubscribersThisMonth: newThisMonth,
        churnRate,
        retentionRate: 100 - churnRate,
        conversionRate,
        averageRevenuePerUser: activeOrgs > 0 ? Math.round(mrr / activeOrgs) : 0,
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // ── Graphique MRR ─────────────────────────────────────────────────────────
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['super-admin-revenue-chart'],
    queryFn: async (): Promise<RevenueDataPoint[]> => {
      // Primary : invoices payées groupées par mois
      const { data: invoices } = await supabase
        .from('subscription_invoices')
        .select('paid_at, total_amount')
        .eq('status', 'paid')
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: true })

      if (invoices && invoices.length > 0) {
        const byMonth: Record<string, number> = {}
        for (const inv of invoices) {
          const d = new Date(inv.paid_at!)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          byMonth[key] = (byMonth[key] ?? 0) + Number(inv.total_amount)
        }
        return Object.entries(byMonth).slice(-12).map(([key, gross]) => {
          const [year, month] = key.split('-')
          return {
            name: `${MONTH_LABELS[parseInt(month) - 1]} ${year}`,
            mrr: Math.round(gross),
            newRevenue: Math.round(gross),
            churnedRevenue: 0,
          }
        })
      }

      // Fallback : reconstituer le MRR mensuel à partir des abonnements actifs/résiliés
      const { data: subs } = await supabase
        .from('organization_subscriptions')
        .select('status, billing_cycle, created_at, canceled_at, subscription_plans(price_monthly, price_yearly)')
        .in('status', ['active', 'trial', 'canceled', 'expired'])
        .order('created_at', { ascending: true })

      if (!subs || subs.length === 0) return []

      const now = new Date()
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 0, 23, 59, 59)

        const monthMrr = subs
          .filter(s => {
            const created = new Date(s.created_at)
            const canceled = s.canceled_at ? new Date(s.canceled_at) : null
            return created <= monthEnd && (!canceled || canceled >= d) && s.status !== 'trial'
          })
          .reduce((sum, s) => {
            const plan = (s as any).subscription_plans
            if (!plan) return sum
            return sum + (s.billing_cycle === 'yearly'
              ? (Number(plan.price_yearly) || 0) / 12
              : (Number(plan.price_monthly) || 0))
          }, 0)

        return {
          name: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
          mrr: Math.round(monthMrr),
          newRevenue: 0,
          churnedRevenue: 0,
        }
      })
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
        .select('id, status, created_at, canceled_at, organization_id, subscription_plans(name, code), organizations(name)')
        .order('created_at', { ascending: false })
        .limit(5)

      for (const sub of recentSubs ?? []) {
        const plan = (sub as any).subscription_plans
        const org = (sub as any).organizations
        const orgName = org?.name ?? `Org ${sub.organization_id.slice(0, 8)}…`
        const isCanceled = sub.status === 'canceled'
        items.push({
          id: sub.id,
          type: isCanceled ? 'churn' : 'subscription',
          title: isCanceled ? 'Annulation d\'abonnement' : `Nouvel abonnement ${plan?.name ?? ''}`,
          description: `${orgName} — plan ${plan?.name ?? 'inconnu'}`,
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
