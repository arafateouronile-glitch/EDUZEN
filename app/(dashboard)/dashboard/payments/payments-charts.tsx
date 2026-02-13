'use client'

import { useEffect, useRef, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'
import { BRAND_COLORS } from '@/lib/config/app-config'
import { formatCurrency } from '@/lib/utils'

const CHART_HEIGHT = 300

type MethodEntry = { name: string; value: number; color: string }
type CategoryEntry = { name: string; value: number; count: number; color: string }
type MonthEntry = { month: string; amount: number }

/** Hook qui mesure le conteneur et retourne width/height en pixels. */
function useChartSize(height: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (w > 0 && h > 0) setSize({ width: w, height: h })
    }

    update()
    const rafId = requestAnimationFrame(update)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  return { ref, width: size.width, height: size.height, ready: size.width > 0 && size.height > 0 }
}

/** Placeholder de même hauteur pour éviter tout décalage. */
function ChartPlaceholder({ height }: { height: number }) {
  return (
    <div
      className="flex w-full items-center justify-center bg-gray-50/50 rounded-2xl"
      style={{ height: `${height}px` }}
    >
      <div className="h-8 w-8 animate-pulse rounded-full border-2 border-brand-blue border-t-transparent" />
    </div>
  )
}

export function PaymentMethodsChart({ data }: { data: MethodEntry[] }) {
  const { ref, width, height, ready } = useChartSize(CHART_HEIGHT)

  if (!data.length) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl bg-gray-50/80">
        <p className="text-sm font-medium text-gray-500">Aucune donnée sur la période</p>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ width: '100%', height: CHART_HEIGHT, minHeight: CHART_HEIGHT }} className="flex-shrink-0">
      {ready ? (
        <PieChart width={width} height={height}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={6}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value, 'EUR')}
            contentStyle={{
              borderRadius: '16px',
              border: 'none',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
              fontWeight: '600',
            }}
          />
          <Legend verticalAlign="bottom" height={48} wrapperStyle={{ fontSize: '14px', fontWeight: '600' }} />
        </PieChart>
      ) : (
        <ChartPlaceholder height={CHART_HEIGHT} />
      )}
    </div>
  )
}

export function PaymentEvolutionChart({ data }: { data: MonthEntry[] }) {
  const { ref, width, height, ready } = useChartSize(CHART_HEIGHT)

  if (!data?.length) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl bg-gray-50/80 p-8">
        <div className="mb-4 rounded-full bg-gray-200 p-4">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-700">Aucune donnée sur la période</p>
        <p className="mt-2 text-sm text-gray-500">Aucun paiement complété trouvé pour cette période</p>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ width: '100%', height: CHART_HEIGHT, minHeight: CHART_HEIGHT }} className="flex-shrink-0">
      {ready ? (
        <LineChart width={width} height={height} data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 12, fontWeight: '600' }}
            dy={12}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 12, fontWeight: '600' }}
            dx={-10}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value, 'EUR')}
            contentStyle={{
              borderRadius: '16px',
              border: 'none',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
              fontWeight: '600',
            }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="url(#payment-evolution-gradient)"
            strokeWidth={4}
            dot={{ fill: BRAND_COLORS.secondary, r: 5, strokeWidth: 3, stroke: '#fff' }}
            activeDot={{ r: 7, strokeWidth: 0, fill: BRAND_COLORS.primary }}
          />
          <defs>
            <linearGradient id="payment-evolution-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={BRAND_COLORS.primary} />
              <stop offset="100%" stopColor={BRAND_COLORS.secondary} />
            </linearGradient>
          </defs>
        </LineChart>
      ) : (
        <ChartPlaceholder height={CHART_HEIGHT} />
      )}
    </div>
  )
}

export function CategoryPieChart({ data }: { data: CategoryEntry[] }) {
  const chartHeight = 280
  const { ref, width, height, ready } = useChartSize(chartHeight)

  if (!data.length) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl bg-gray-50/80">
        <p className="text-sm font-medium text-gray-500">Aucune donnée</p>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ width: '100%', height: chartHeight, minHeight: chartHeight }} className="flex-shrink-0">
      {ready ? (
        <PieChart width={width} height={height}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value, 'EUR')}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '10px 14px',
              fontWeight: '600',
            }}
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: '500' }} />
        </PieChart>
      ) : (
        <ChartPlaceholder height={chartHeight} />
      )}
    </div>
  )
}

export function MonthlyChargesBarChart({ data }: { data: MonthEntry[] }) {
  const chartHeight = 280
  const { ref, width, height, ready } = useChartSize(chartHeight)

  if (!data.length) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl bg-gray-50/80">
        <p className="text-sm font-medium text-gray-500">Aucune donnée</p>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ width: '100%', height: chartHeight, minHeight: chartHeight }} className="flex-shrink-0">
      {ready ? (
        <BarChart width={width} height={height} data={data}>
          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: '500' }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: '500' }}
            dx={-8}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value, 'EUR')}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '10px 14px',
              fontWeight: '600',
            }}
          />
          <Bar dataKey="amount" fill="url(#chargeGradient)" radius={[6, 6, 0, 0]} />
          <defs>
            <linearGradient id="chargeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
        </BarChart>
      ) : (
        <ChartPlaceholder height={chartHeight} />
      )}
    </div>
  )
}
