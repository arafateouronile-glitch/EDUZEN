'use client'

import {
  RechartsAreaChart,
  RechartsArea,
  RechartsXAxis,
  RechartsYAxis,
  RechartsCartesianGrid,
  RechartsTooltip,
  RechartsLegend,
  RechartsResponsiveContainer,
} from '@/components/charts/recharts-wrapper'
import { Skeleton } from '@/components/ui/skeleton'
import type { SkillsEvolutionData } from '@/lib/services/enterprise-portal.service'
import { BRAND_COLORS } from '@/lib/config/app-config'

interface SkillsEvolutionChartProps {
  data: SkillsEvolutionData[]
  isLoading?: boolean
}

export function SkillsEvolutionChart({ data, isLoading }: SkillsEvolutionChartProps) {
  if (isLoading) {
    return <Skeleton className="h-80 w-full rounded-lg" />
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    )
  }

  // Format month labels
  const formattedData = data.map((item) => {
    const [year, month] = item.month.split('-')
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    return {
      ...item,
      monthLabel: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
    }
  })

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BRAND_COLORS.primary }} />
              <span className="text-sm text-gray-600">
                Niveau moyen: <span className="font-medium text-gray-900">{payload[0]?.value}%</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-600">
                Compétences acquises: <span className="font-medium text-gray-900">{payload[1]?.value}</span>
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-80 w-full">
      <RechartsResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          {...({} as any)}
          data={formattedData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSkillLevel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BRAND_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={BRAND_COLORS.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSkillsAcquired" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <RechartsCartesianGrid {...({} as any)} strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <RechartsXAxis
            {...({} as any)}
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            dy={10}
          />
          <RechartsYAxis
            {...({} as any)}
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(value: any) => `${value}%`}
          />
          <RechartsYAxis
            {...({} as any)}
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            domain={[0, 'auto']}
          />
          <RechartsTooltip {...({} as any)} content={<CustomTooltip />} />
          <RechartsLegend
            {...({} as any)}
            verticalAlign="top"
            height={36}
            formatter={(value: any) => {
              const labels: Record<string, string> = {
                averageSkillLevel: 'Niveau de compétence moyen',
                skillsAcquired: 'Compétences acquises',
              }
              return <span className="text-sm text-gray-600">{labels[value] || value}</span>
            }}
          />
          <RechartsArea
            {...({} as any)}
            yAxisId="left"
            type="monotone"
            dataKey="averageSkillLevel"
            stroke={BRAND_COLORS.primary}
            strokeWidth={2}
            fill="url(#colorSkillLevel)"
            dot={{ fill: BRAND_COLORS.primary, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, stroke: BRAND_COLORS.primary, strokeWidth: 2, fill: '#fff' }}
          />
          <RechartsArea
            {...({} as any)}
            yAxisId="right"
            type="monotone"
            dataKey="skillsAcquired"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorSkillsAcquired)"
            dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
          />
        </RechartsAreaChart>
      </RechartsResponsiveContainer>
    </div>
  )
}
