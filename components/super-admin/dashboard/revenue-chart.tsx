'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
// Lazy load recharts pour réduire le bundle initial
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

interface RevenueChartProps {
  data?: {
    name: string
    mrr: number
    newRevenue: number
    churnedRevenue: number
  }[]
  loading?: boolean
  className?: string
}

// Sample data for demonstration
const sampleData = [
  { name: 'Jan', mrr: 4500, newRevenue: 800, churnedRevenue: 200 },
  { name: 'Fév', mrr: 5100, newRevenue: 900, churnedRevenue: 300 },
  { name: 'Mar', mrr: 5800, newRevenue: 1100, churnedRevenue: 400 },
  { name: 'Avr', mrr: 6200, newRevenue: 700, churnedRevenue: 300 },
  { name: 'Mai', mrr: 7100, newRevenue: 1200, churnedRevenue: 300 },
  { name: 'Juin', mrr: 7800, newRevenue: 1000, churnedRevenue: 300 },
  { name: 'Juil', mrr: 8500, newRevenue: 1100, churnedRevenue: 400 },
  { name: 'Août', mrr: 9200, newRevenue: 1000, churnedRevenue: 300 },
  { name: 'Sep', mrr: 10100, newRevenue: 1300, churnedRevenue: 400 },
  { name: 'Oct', mrr: 11200, newRevenue: 1400, churnedRevenue: 300 },
  { name: 'Nov', mrr: 12500, newRevenue: 1600, churnedRevenue: 300 },
  { name: 'Déc', mrr: 14000, newRevenue: 1800, churnedRevenue: 300 },
]

type Period = '7d' | '30d' | '90d' | '12m'

export function RevenueChart({ data = sampleData, loading = false, className }: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>('12m')

  const periods: { value: Period; label: string }[] = [
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '90 jours' },
    { value: '12m', label: '12 mois' },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
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
            {periods.map((p) => (
              <Skeleton key={p.value} className="h-8 w-16" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
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
              className={cn(
                'h-8 px-3 text-xs',
                period === p.value && 'bg-brand-blue hover:bg-brand-blue/90'
              )}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <RechartsResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart
              {...({} as any)}
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
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
              <RechartsCartesianGrid {...({} as any)} strokeDasharray="3 3" className="stroke-muted" />
              <RechartsXAxis
                {...({} as any)}
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <RechartsYAxis
                {...({} as any)}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value: any) => `${(value / 1000).toFixed(0)}k€`}
              />
              <RechartsTooltip {...({} as any)} content={<CustomTooltip />} />
              <RechartsLegend
                {...({} as any)}
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value: any) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
              <RechartsArea
                {...({} as any)}
                type="monotone"
                dataKey="mrr"
                name="MRR"
                stroke="#274472"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMrr)"
              />
              <RechartsArea
                {...({} as any)}
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
