'use client'

import { useQuery } from '@tanstack/react-query'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  MousePointerClick,
  TrendingUp,
  Euro,
  Percent,
  RefreshCw,
  Link2,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/super-admin/dashboard/stats-card'
import {
  RechartsBarChart,
  RechartsBar,
  RechartsXAxis,
  RechartsYAxis,
  RechartsCartesianGrid,
  RechartsTooltip,
  RechartsResponsiveContainer,
} from '@/components/charts/recharts-wrapper'
import { formatCurrency } from '@/lib/utils/format'
import type { AffiliateOverviewStats } from '@/types/super-admin.types'

export default function AffiliationDashboardPage() {
  const { canManageAffiliates, isSuperAdmin } = usePlatformAdmin()

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['affiliation-overview'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/affiliation/overview')
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<AffiliateOverviewStats>
    },
    staleTime: 1000 * 60 * 2,
  })

  if (!canManageAffiliates && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès restreint</CardTitle>
            <CardDescription>
              Vous n&apos;avez pas les permissions pour gérer l&apos;affiliation.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight flex items-center gap-2"
          >
            <Link2 className="h-7 w-7 text-brand-blue" />
            Affiliate Engine
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Vue d&apos;ensemble des partenaires et du MRR généré par l&apos;affiliation
          </motion.p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total clics"
          value={stats?.totalClicks ?? 0}
          icon={<MousePointerClick className="h-5 w-5 text-brand-blue" />}
          loading={isLoading}
        />
        <StatsCard
          title="Conversions"
          value={stats?.totalConversions ?? 0}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          loading={isLoading}
        />
        <StatsCard
          title="Taux de conversion"
          value={stats?.conversionRate ?? 0}
          suffix="%"
          icon={<Percent className="h-5 w-5 text-amber-600" />}
          loading={isLoading}
        />
        <StatsCard
          title="MRR affiliation"
          value={stats?.mrrFromAffiliates ?? 0}
          prefix="€"
          icon={<Euro className="h-5 w-5 text-brand-cyan" />}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance (MRR par affilié)</CardTitle>
            <CardDescription>Top 10 des partenaires par MRR apporté</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : stats?.topAffiliates?.length ? (
              <div className="space-y-2">
                {stats.topAffiliates.map((a, i) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono text-sm">#{i + 1}</span>
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {a.full_name || a.company_name || a.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-brand-blue">
                        {formatCurrency(a.mrr)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.conversions} conversion{a.conversions !== 1 ? 's' : ''} · Commission {formatCurrency(a.commissionDue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Aucune donnée pour le moment. Les performances apparaîtront après des clics et conversions.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MRR par partenaire</CardTitle>
            <CardDescription>Répartition du MRR apporté par l&apos;affiliation</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : stats?.topAffiliates?.length ? (
              <div className="h-64">
                <RechartsResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={stats.topAffiliates.map((a) => ({
                      name: a.full_name || a.company_name || a.email?.split('@')[0] || 'Affilié',
                      mrr: a.mrr,
                      conversions: a.conversions,
                    }))}
                    margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                  >
                    <RechartsCartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <RechartsXAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string | number) => (String(v).length > 12 ? String(v).slice(0, 10) + '…' : String(v))}
                    />
                    <RechartsYAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `€${v}`}
                    />
                    <RechartsTooltip
                      formatter={(value: number) => [formatCurrency(value), 'MRR']}
                      labelFormatter={(_: unknown, payload: unknown) => (Array.isArray(payload) && payload[0] && typeof payload[0] === 'object' && payload[0] !== null && 'payload' in payload[0]) ? (payload[0] as { payload?: { name?: string } }).payload?.name : undefined}
                    />
                    <RechartsBar
                      dataKey="mrr"
                      fill="hsl(var(--brand-blue))"
                      radius={[4, 4, 0, 0]}
                      name="MRR"
                    />
                  </RechartsBarChart>
                </RechartsResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée à afficher
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
