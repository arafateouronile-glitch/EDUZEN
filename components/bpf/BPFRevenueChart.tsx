'use client'

/**
 * BPF Revenue Chart - Graphique de ventilation du CA par source de financement
 * Design premium avec Donut Chart et légende interactive
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RechartsPieChart,
  RechartsPie,
  RechartsCell,
  RechartsTooltip,
  RechartsLegend,
  RechartsResponsiveContainer,
  RechartsSector,
} from '@/components/charts/recharts-wrapper'
import { BPFRevenueBreakdown, BPF_CATEGORIES, BPFCategory } from '@/lib/services/bpf.service'
import { DollarSign, TrendingUp, Info } from 'lucide-react'

// Couleurs premium pour chaque catégorie BPF
const CATEGORY_COLORS: Record<BPFCategory, string> = {
  cpf: '#3B82F6', // Blue
  opco: '#8B5CF6', // Purple
  companies: '#10B981', // Emerald
  individuals: '#F59E0B', // Amber
  pole_emploi: '#EF4444', // Red
  regions: '#06B6D4', // Cyan
  state: '#6366F1', // Indigo
  other: '#9CA3AF', // Gray
}

interface BPFRevenueChartProps {
  data: BPFRevenueBreakdown | null
  loading?: boolean
  year: number
  onCategoryClick?: (category: BPFCategory) => void
}

interface ChartDataItem {
  name: string
  value: number
  category: BPFCategory
  color: string
  percentage: number
  cerfaLine: string
}

// Custom active shape for hover effect
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
  } = props

  return (
    <g>
      <text x={cx} y={cy - 15} textAnchor="middle" className="fill-foreground text-lg font-bold">
        {formatCurrency(value)}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground text-sm">
        {payload.name}
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" className="fill-muted-foreground text-xs">
        ({payload.percentage.toFixed(1)}%)
      </text>
      <RechartsSector
        {...({} as any)}
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <RechartsSector
        {...({} as any)}
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 15}
        outerRadius={outerRadius + 20}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
    </g>
  )
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('fr-FR').format(num)
}

export function BPFRevenueChart({ data, loading, year, onCategoryClick }: BPFRevenueChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  // Transform data for chart
  const chartData: ChartDataItem[] = data
    ? (Object.entries(BPF_CATEGORIES) as [BPFCategory, { label: string; cerfaLine: string }][])
        .map(([key, config]) => {
          const revenueKey = `revenue_${key}` as keyof BPFRevenueBreakdown
          const value = (data[revenueKey] as number) || 0
          return {
            name: config.label,
            value,
            category: key,
            color: CATEGORY_COLORS[key],
            percentage: data.total_revenue > 0 ? (value / data.total_revenue) * 100 : 0,
            cerfaLine: config.cerfaLine,
          }
        })
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
    : []

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index)
  }, [])

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined)
  }, [])

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <Skeleton className="h-64 w-64 rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasData = chartData.length > 0 && data && data.total_revenue > 0

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-md">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Ventilation du Chiffre d'Affaires
              </CardTitle>
              <CardDescription className="text-sm">
                Cadre F - Origine des produits de l'activité ({year})
              </CardDescription>
            </div>
          </div>
          {hasData && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <TrendingUp className="h-3 w-3 mr-1" />
              {formatCurrency(data!.total_revenue)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Info className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">Aucune donnée de CA pour {year}</p>
            <p className="text-gray-400 text-sm mt-1">
              Les données seront affichées une fois les inscriptions enregistrées
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <div className="h-72">
              <RechartsResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <RechartsPie
                    {...({} as any)}
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    onClick={(_: any, index: any) => onCategoryClick?.(chartData[index].category)}
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, index) => (
                      <RechartsCell
                        {...({} as any)}
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </RechartsPie>
                  <RechartsTooltip
                    {...({} as any)}
                    content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as ChartDataItem
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                            <p className="font-semibold text-gray-900">{data.name}</p>
                            <p className="text-lg font-bold" style={{ color: data.color }}>
                              {formatCurrency(data.value)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {data.percentage.toFixed(1)}% du CA total
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Ligne Cerfa: {data.cerfaLine}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </RechartsPieChart>
              </RechartsResponsiveContainer>
            </div>

            {/* Legend & Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Répartition par financeur
              </h4>
              {chartData.map((item, index) => (
                <button
                  key={item.category}
                  onClick={() => onCategoryClick?.(item.category)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    activeIndex === index
                      ? 'bg-gray-100 shadow-sm scale-[1.02]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">Ligne {item.cerfaLine}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(item.value)}</p>
                    <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                  </div>
                </button>
              ))}

              {/* Total */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">CA Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(data!.total_revenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BPFRevenueChart
