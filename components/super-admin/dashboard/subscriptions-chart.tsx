'use client'

import { PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RechartsPieChart,
  RechartsPie,
  RechartsCell,
  RechartsResponsiveContainer,
  RechartsLegend,
  RechartsTooltip,
} from '@/components/charts/recharts-wrapper'

export interface SubscriptionDataPoint {
  name: string
  value: number
  color: string
}

interface SubscriptionsChartProps {
  data?: SubscriptionDataPoint[]
  loading?: boolean
  className?: string
}

const PLAN_COLORS: Record<string, string> = {
  free: '#94a3b8',
  trial: '#34B9EE',
  essai: '#34B9EE',
  starter: '#6366f1',
  pro: '#274472',
  premium: '#10b981',
  enterprise: '#f59e0b',
}

export function getPlanColor(code: string): string {
  return PLAN_COLORS[code.toLowerCase()] ?? '#94a3b8'
}

export function SubscriptionsChart({ data = [], loading = false, className }: SubscriptionsChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  type TooltipPayloadItem = { payload?: { value?: number; name?: string; color?: string } }
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload
      if (!item?.value) return null
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-medium">{item.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {item.value} organisation{item.value > 1 ? 's' : ''} ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomLegend = ({ payload }: { payload?: Array<{ color?: string; value?: string }> }) => (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {(payload ?? []).map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-sm text-muted-foreground">{entry.value}</span>
          <span className="text-sm font-medium">{data.find((d) => d.name === entry.value)?.value ?? 0}</span>
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Répartition des abonnements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <Skeleton className="h-[220px] w-[220px] rounded-full" />
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-16" />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0 || total === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Répartition des abonnements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <PieChart className="h-10 w-10 opacity-20" />
            <p className="text-sm">Aucun abonnement actif</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Répartition des abonnements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <RechartsResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <RechartsPie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <RechartsCell key={`cell-${index}`} fill={entry.color} />
                ))}
              </RechartsPie>
              <RechartsTooltip content={<CustomTooltip />} />
              <RechartsLegend content={renderCustomLegend} />
            </RechartsPieChart>
          </RechartsResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <p className="text-3xl font-bold">{total}</p>
          <p className="text-sm text-muted-foreground">Total organisations</p>
        </div>
      </CardContent>
    </Card>
  )
}
