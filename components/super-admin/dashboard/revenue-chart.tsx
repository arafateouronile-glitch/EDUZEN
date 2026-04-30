'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp } from 'lucide-react'
import {
  RechartsAreaChart,
  RechartsArea,
  RechartsXAxis,
  RechartsYAxis,
  RechartsCartesianGrid,
  RechartsTooltip,
  RechartsResponsiveContainer,
  RechartsLegend,
} from '@/components/charts/recharts-wrapper'

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export interface RevenueDataPoint {
  name: string
  mrr: number
  newRevenue: number
  churnedRevenue: number
}

interface RevenueChartProps {
  data?: RevenueDataPoint[]
  loading?: boolean
  className?: string
}

type Period = '3m' | '6m' | '12m'

export function RevenueChart({ data = [], loading = false, className }: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>('12m')

  const periods: { value: Period; label: string }[] = [
    { value: '3m', label: '3 mois' },
    { value: '6m', label: '6 mois' },
    { value: '12m', label: '12 mois' },
  ]

  const periodLimits: Record<Period, number> = { '3m': 3, '6m': 6, '12m': 12 }
  const displayData = data.slice(-periodLimits[period])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Évolution du MRR</CardTitle>
          <div className="flex gap-1">
            {periods.map((p) => <Skeleton key={p.value} className="h-8 w-16" />)}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Évolution du MRR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <TrendingUp className="h-10 w-10 opacity-20" />
            <p className="text-sm">Aucune donnée de revenu disponible</p>
            <p className="text-xs opacity-60">Les métriques apparaîtront ici une fois des abonnements enregistrés</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Évolution du MRR</CardTitle>
        <div className="flex gap-1">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={cn('h-8 px-3 text-xs', period === p.value && 'bg-brand-blue hover:bg-brand-blue/90')}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <RechartsResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#274472" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#274472" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <RechartsCartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <RechartsXAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <RechartsYAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k€`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <RechartsLegend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value: any) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
              <RechartsArea
                type="monotone"
                dataKey="mrr"
                name="MRR"
                stroke="#274472"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMrr)"
              />
              <RechartsArea
                type="monotone"
                dataKey="newRevenue"
                name="Nouveau revenu"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorNew)"
              />
            </RechartsAreaChart>
          </RechartsResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export { MONTH_LABELS }
