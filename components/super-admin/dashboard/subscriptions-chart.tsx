'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface SubscriptionsChartProps {
  data?: {
    name: string
    value: number
    color: string
  }[]
  loading?: boolean
  className?: string
}

const sampleData = [
  { name: 'Free', value: 45, color: '#94a3b8' },
  { name: 'Essai', value: 20, color: '#34B9EE' },
  { name: 'Pro', value: 85, color: '#274472' },
  { name: 'Premium', value: 35, color: '#10b981' },
  { name: 'Enterprise', value: 8, color: '#f59e0b' },
]

export function SubscriptionsChart({
  data = sampleData,
  loading = false,
  className,
}: SubscriptionsChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const percentage = ((item.value / total) * 100).toFixed(1)
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium">{item.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {item.value} organisations ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.value}
            </span>
            <span className="text-sm font-medium">
              {data.find((d) => d.name === entry.value)?.value || 0}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Répartition des abonnements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <Skeleton className="h-[220px] w-[220px] rounded-full" />
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Répartition des abonnements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderCustomLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <p className="text-3xl font-bold">{total}</p>
          <p className="text-sm text-muted-foreground">Total organisations</p>
        </div>
      </CardContent>
    </Card>
  )
}
