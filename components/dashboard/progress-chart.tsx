'use client'

import { motion } from '@/components/ui/motion'
import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ProgressChartProps {
  data?: Array<{
    date: string
    hours: number
    courses: number
  }>
  timeRange?: number // nombre de jours à afficher
}

export function ProgressChart({ data, timeRange = 14 }: ProgressChartProps) {
  // Générer les données par défaut si non fournies
  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      return data
    }

    // Données factices pour démo
    const mockData = []
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      mockData.push({
        date: format(date, 'dd/MM'),
        hours: Math.random() * 4,
        courses: Math.floor(Math.random() * 3),
      })
    }
    return mockData
  }, [data, timeRange])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl p-3 shadow-xl"
        >
          <p className="text-sm font-semibold text-gray-900 mb-2">{payload[0].payload.date}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-blue" />
              <span className="text-xs text-gray-600">Heures: {payload[0].value.toFixed(1)}h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs text-gray-600">Cours: {payload[1].value}</span>
            </div>
          </div>
        </motion.div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCourses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 2 }} />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#colorHours)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="courses"
            stroke="#a855f7"
            strokeWidth={3}
            fill="url(#colorCourses)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
