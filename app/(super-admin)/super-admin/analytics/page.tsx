'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RevenueChart } from '@/components/super-admin/dashboard/revenue-chart'
import { SubscriptionsChart } from '@/components/super-admin/dashboard/subscriptions-chart'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function AnalyticsPage() {
  const { canViewRevenue, isSuperAdmin } = usePlatformAdmin()
  const supabase = createClient()

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-analytics'],
    queryFn: async () => {
      const [latestMetrics, monthlyRevenue] = await Promise.all([
        supabase
          .from('platform_metrics_daily')
          .select('mrr, arr, active_organizations, total_organizations, total_users, active_users_month, new_organizations, churn_rate, retention_rate')
          .order('date', { ascending: false })
          .limit(2),
        supabase
          .from('platform_revenue_monthly')
          .select('year, month, net_revenue, gross_revenue, recurring_revenue')
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(12),
      ])

      const current = latestMetrics.data?.[0]
      const previous = latestMetrics.data?.[1]

      const orgGrowth = previous && previous.total_organizations > 0
        ? ((current?.total_organizations ?? 0) - previous.total_organizations) / previous.total_organizations * 100
        : 0

      const revenueGrowth = previous && Number(previous.mrr) > 0
        ? (Number(current?.mrr ?? 0) - Number(previous.mrr)) / Number(previous.mrr) * 100
        : 0

      const churnRate = Number(current?.churn_rate ?? 0) * 100
      const prevChurnRate = Number(previous?.churn_rate ?? 0) * 100
      const retentionRate = Number(current?.retention_rate ?? 0) * 100
      const prevRetentionRate = Number(previous?.retention_rate ?? 0) * 100

      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

      return {
        revenue: {
          total: Number(current?.mrr ?? 0),
          growth: Math.round(revenueGrowth * 10) / 10,
          monthly: [...(monthlyRevenue.data ?? [])].reverse().map((r) => ({
            month: monthNames[(r.month ?? 1) - 1] ?? '',
            revenue: Number(r.net_revenue),
            mrr: Number(r.recurring_revenue),
          })),
        },
        subscriptions: {
          total: current?.total_organizations ?? 0,
          growth: Math.round(orgGrowth * 10) / 10,
        },
        users: {
          total: current?.total_users ?? 0,
          active: current?.active_users_month ?? 0,
          growth: 0,
        },
        churn: {
          rate: Math.round(churnRate * 100) / 100,
          trend: Math.round((churnRate - prevChurnRate) * 100) / 100,
        },
        retention: {
          rate: Math.round(retentionRate * 100) / 100,
          trend: Math.round((retentionRate - prevRetentionRate) * 100) / 100,
        },
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  if (!canViewRevenue && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès restreint</CardTitle>
            <CardDescription>
              Vous n&apos;avez pas les permissions nécessaires pour accéder aux analytiques.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight"
          >
            Analytiques
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Analyse détaillée de la performance de la plateforme
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2"
        >
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </motion.div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics?.revenue.total || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {analytics?.revenue.growth && analytics.revenue.growth > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">+{analytics.revenue.growth}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{analytics?.revenue.growth}%</span>
                </>
              )}
              <span className="ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.subscriptions.total || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {analytics?.subscriptions.growth && analytics.subscriptions.growth > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">+{analytics.subscriptions.growth}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{analytics?.subscriptions.growth}%</span>
                </>
              )}
              <span className="ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.users.active || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              sur {analytics?.users.total || 0} total
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {analytics?.users.growth && analytics.users.growth > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">+{analytics.users.growth}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{analytics?.users.growth}%</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Rétention</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.retention.rate || 0}%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {analytics?.retention.trend && analytics.retention.trend > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">+{analytics.retention.trend}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{analytics?.retention.trend}%</span>
                </>
              )}
              <span className="ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="churn">Rétention & Churn</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des Revenus</CardTitle>
              <CardDescription>MRR et revenus mensuels sur les 12 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution des Abonnements</CardTitle>
              <CardDescription>Répartition par plan d'abonnement</CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionsChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des Utilisateurs</CardTitle>
              <CardDescription>Croissance et activité des utilisateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Graphique des utilisateurs à venir
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Taux de Churn</CardTitle>
                <CardDescription>Pourcentage d'organisations qui annulent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics?.churn.rate || 0}%</div>
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  {analytics?.churn.trend && analytics.churn.trend < 0 ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-500">
                        Amélioration de {Math.abs(analytics.churn.trend)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-red-500">
                        Augmentation de {analytics?.churn.trend}%
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taux de Rétention</CardTitle>
                <CardDescription>Pourcentage d'organisations qui restent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics?.retention.rate || 0}%</div>
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  {analytics?.retention.trend && analytics.retention.trend > 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-500">
                        Amélioration de +{analytics.retention.trend}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-red-500">
                        Diminution de {analytics?.retention.trend}%
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
