'use client'

import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts'
import { motion } from '@/components/ui/motion'
import { PremiumChartContainer } from './premium-chart-container'

interface DataPoint {
  name: string
  value: number
}

interface PremiumPieChartProps {
  data: DataPoint[]
  title?: string
  subtitle?: string
  colors?: string[]
  className?: string
  variant?: 'default' | 'glass' | 'dark'
  innerRadius?: number
  outerRadius?: number
}

// Rendu personnalisé pour le secteur actif (effet d'agrandissement)
const renderActiveShape = (props: { cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number; fill: string; payload: { name: string }; percent: number; value: number }) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#1F2937" className="text-xl font-bold" style={{ fontSize: '24px' }}>
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={20} textAnchor="middle" fill="#6B7280" className="text-sm font-medium">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10} // Agrandissement
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={8}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
        opacity={0.3}
        cornerRadius={4}
      />
    </g>
  );
};

export function PremiumPieChart({
  data,
  title,
  subtitle,
  colors = ['#335ACF', '#34B9EE', '#3B82F6', '#8B5CF6', '#EF4444', '#94a3b8'],
  className,
  variant = 'default',
  innerRadius = 70,
  outerRadius = 100,
}: PremiumPieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number; total?: number; fill?: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0] as any
      const total = (data.payload?.total as number) || data.value
      const percentage = ((data.value / total) * 100).toFixed(1)
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4 min-w-[140px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full shadow-md" 
              style={{ backgroundColor: data.payload?.fill || '#335ACF' }} 
            />
            <span className="text-sm font-medium text-gray-600 uppercase tracking-wider">
              {data.name}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {data.value.toLocaleString('fr-FR')}
            </span>
            <span className="text-sm font-medium text-gray-400">
              ({percentage}%)
            </span>
          </div>
        </motion.div>
      )
    }
    return null
  }

  // Calcul du total pour les pourcentages
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const dataWithTotal = data.map((item, index) => ({ 
    ...item, 
    total,
    fill: colors[index % colors.length] // Assigner la couleur directement aux données pour l'accès facile
  }))

  return (
    <PremiumChartContainer title={title} subtitle={subtitle} variant={variant} className={className}>
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <PieChart>
          <defs>
            {dataWithTotal.map((entry, index) => (
              <linearGradient key={`pieGradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                <stop offset="100%" stopColor={entry.fill} stopOpacity={0.85} />
              </linearGradient>
            ))}
            <filter id="pieShadow" height="150%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape as any}
            onMouseEnter={onPieEnter}
            data={dataWithTotal}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={4}
            dataKey="value"
            stroke="none" // Pas de bordure blanche pour un look plus clean
            animationBegin={0}
            animationDuration={1000}
            animationEasing="ease-out"
            filter="url(#pieShadow)" // Ombre portée globale
          >
            {dataWithTotal.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#pieGradient-${index})`}
                stroke="none"
              />
            ))}
          </Pie>
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Légende personnalisée et élégante */}
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ 
              paddingTop: '20px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#4B5563'
            }}
            formatter={(value) => <span className="ml-1 text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </PremiumChartContainer>
  )
}
