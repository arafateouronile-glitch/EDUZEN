'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion } from '@/components/ui/motion'
import { PremiumChartContainer } from './premium-chart-container'
import { cn } from '@/lib/utils'

interface DataPoint {
  [key: string]: string | number
}

interface PremiumBarChartProps {
  data: DataPoint[]
  dataKey: string
  xAxisKey: string
  title?: string
  subtitle?: string
  color?: string
  colors?: string[]
  className?: string
  variant?: 'default' | 'glass' | 'dark'
  stacked?: boolean
}

export function PremiumBarChart({
  data,
  dataKey,
  xAxisKey,
  title,
  subtitle,
  color = '#335ACF',
  colors,
  className,
  variant = 'default',
  stacked = false,
}: PremiumBarChartProps) {
  const defaultColors = [
    '#335ACF', // brand-blue
    '#34B9EE', // brand-cyan
    '#3B82F6', // blue variant
    '#8B5CF6', // purple
    '#EF4444', // danger
    '#94a3b8', // gray
  ]

  const chartColors = colors || defaultColors

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number; fill?: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      // Si la couleur n'est pas passée dans payload (cas simple), utiliser la première couleur
      const itemColor = data.color || (data.payload.fill) || chartColors[0];
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 p-4 min-w-[140px]"
        >
          {/* Barre colorée en haut */}
          <div 
            className="absolute top-0 left-0 w-full h-1.5 rounded-t-2xl opacity-80"
            style={{ background: `linear-gradient(90deg, ${itemColor}00, ${itemColor}, ${itemColor}00)` }}
          />
          
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
            {data.payload[xAxisKey]}
          </p>
          
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" 
              style={{ 
                backgroundColor: itemColor,
                color: itemColor
              }} 
            />
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              {typeof data.value === 'number' 
                ? data.value.toLocaleString('fr-FR') 
                : data.value}
            </p>
          </div>
        </motion.div>
      )
    }
    return null
  }

  return (
    <PremiumChartContainer title={title} subtitle={subtitle} variant={variant} className={className}>
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
          barSize={40} // Barres plus larges
        >
          <defs>
            {/* Création de dégradés pour chaque couleur possible */}
            {chartColors.map((color, index) => (
              <linearGradient key={`barGradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            ))}
            <filter id="barShadow" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.1" />
            </filter>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#E5E7EB" 
            opacity={0.4} 
            vertical={false}
          />
          
          <XAxis
            dataKey={xAxisKey}
            stroke="#9ca3af"
            fontSize={11}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6B7280' }}
            dy={10}
          />
          
          <YAxis
            stroke="#9ca3af"
            fontSize={11}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6B7280' }}
            dx={-10}
          />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: '#F3F4F6', opacity: 0.5, radius: 8 }} 
          />
          
          <Bar 
            dataKey={dataKey} 
            radius={[8, 8, 0, 0]} // Coins arrondis en haut
            animationBegin={0}
            animationDuration={1200}
            animationEasing="ease-out"
            filter="url(#barShadow)" // Ombre portée
          >
            {data.map((entry, index) => {
              // Si des couleurs spécifiques sont fournies, les utiliser cycliquement
              const colorIndex = index % chartColors.length;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#barGradient-${colorIndex})`}
                  strokeWidth={0}
                />
              )
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </PremiumChartContainer>
  )
}
