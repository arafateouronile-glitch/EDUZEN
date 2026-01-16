'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { motion } from '@/components/ui/motion'
import { PremiumChartContainer } from './premium-chart-container'
import { cn } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

interface DataPoint {
  [key: string]: string | number
}

interface PremiumLineChartProps {
  data: DataPoint[]
  dataKey: string
  xAxisKey: string
  title?: string
  subtitle?: string
  color?: string
  gradientColors?: {
    from: string
    to: string
  }
  showArea?: boolean
  strokeWidth?: number
  className?: string
  variant?: 'default' | 'glass' | 'dark'
  valueFormatter?: (val: any) => string
}

export function PremiumLineChart({
  data,
  dataKey,
  xAxisKey,
  title,
  subtitle,
  color = '#335ACF',
  gradientColors = { from: '#335ACF', to: '#34B9EE' },
  showArea = false,
  strokeWidth = 5, // Plus épais pour le style premium avec effet de vague
  className,
  variant = 'default',
  valueFormatter,
}: PremiumLineChartProps) {

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number | string; name?: string }> }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const formattedValue = valueFormatter 
        ? valueFormatter(value)
        : typeof value === 'number' 
          ? value.toLocaleString('fr-FR') 
          : value;

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4 min-w-[140px]"
        >
          {/* Petit indicateur coloré en haut */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full opacity-80"
            style={{ backgroundColor: color }}
          />
          
          <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider text-center">
            {payload[0].payload[xAxisKey]}
          </p>
          
          <div className="flex items-center justify-center gap-2">
            <div 
              className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]"
              style={{ color: color, backgroundColor: color }}
            />
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              {formattedValue}
            </p>
          </div>
        </motion.div>
      )
    }
    return null
  }

  const ChartContent = () => {
    const commonProps = {
      data: data,
      margin: { top: 20, right: 20, left: 0, bottom: 0 },
    };

    const gridProps = {
      strokeDasharray: "3 3",
      stroke: "#E5E7EB",
      opacity: 0.4,
      vertical: false,
    };

    const axisProps = {
      stroke: "#9CA3AF",
      fontSize: 12,
      tickLine: false,
      axisLine: false,
      tick: { fill: '#6B7280', fontSize: 11, fontWeight: 500 },
      dy: 10,
    };

    const yAxisProps = {
      ...axisProps,
      dy: 0,
      dx: -10,
    };

    if (showArea) {
      return (
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientColors.from} stopOpacity={0.95} />
                <stop offset="25%" stopColor={gradientColors.from} stopOpacity={0.75} />
                <stop offset="50%" stopColor={gradientColors.to} stopOpacity={0.5} />
                <stop offset="75%" stopColor={gradientColors.to} stopOpacity={0.25} />
                <stop offset="100%" stopColor={gradientColors.to} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xAxisKey} {...axisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: color,
                strokeWidth: 1,
                strokeDasharray: '4 4',
                opacity: 0.5
              }}
            />
            <Area
              type="natural"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={strokeWidth}
              fill={`url(#gradient-${dataKey})`}
              fillOpacity={1}
              animationDuration={1500}
              animationEasing="ease-out"
              activeDot={{
                r: 7,
                strokeWidth: 2,
                stroke: "#fff",
                fill: color,
                className: "drop-shadow-lg"
              }}
              dot={false}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    // Composant GradientDef pour le LineChart
    const GradientDef = () => (
      <defs>
        <linearGradient id={`line-gradient-${dataKey}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={gradientColors.from} stopOpacity={1} />
          <stop offset="100%" stopColor={gradientColors.to} stopOpacity={1} />
        </linearGradient>
      </defs>
    )

    return (
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <LineChart {...commonProps}>
          <GradientDef />
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xAxisKey} {...axisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ 
              stroke: '#E5E7EB', 
              strokeWidth: 40, 
              opacity: 0.3 // Effet de surbrillance colonne
            }}
          />
          <Line
            type="natural"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            activeDot={{
              r: 8,
              fill: '#fff',
              stroke: color,
              strokeWidth: 3,
              className: "shadow-lg"
            }}
            filter="url(#glow)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // Si pas de titre/subtitle, rendre juste le graphique sans wrapper
  if (!title && !subtitle) {
    return (
      <div className={cn("w-full", className)}>
        <ChartContent />
      </div>
    )
  }

  // Sinon, rendre avec le wrapper complet
  return (
    <motion.div
      className={cn("relative overflow-hidden", className)}
      whileHover={{ scale: 1.002 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="relative overflow-hidden rounded-3xl border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]">
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Glass card effect */}
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-gray-100/80">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-xl"
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <TrendingUp className="h-6 w-6 text-white drop-shadow-lg" />
              </motion.div>
              <div>
                {title && (
                  <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">{title}</h2>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-600 font-semibold tracking-tight">{subtitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="p-6 relative z-10">
            <ChartContent />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
