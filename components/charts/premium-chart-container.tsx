'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface PremiumChartContainerProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
  variant?: 'default' | 'glass' | 'dark'
}

/**
 * Conteneur pour graphiques premium. Pas d'animation d'entrée pour que
 * ResponsiveContainer (Recharts) ait des dimensions dès le premier rendu
 * et que les graphiques s'affichent à l'arrivée sur la page / au refresh.
 */
export function PremiumChartContainer({
  children,
  title,
  subtitle,
  className,
  variant = 'default',
}: PremiumChartContainerProps) {
  const variants = {
    default: 'bg-white border border-bg-gray-200',
    glass: 'glass-morphism border border-white/20',
    dark: 'bg-bg-gray-50 border border-bg-gray-200 backdrop-blur-xl',
  }

  return (
    <div
      className={cn(
        'chart-container-premium rounded-2xl p-6 md:p-8',
        'transition-all duration-500 ease-out',
        'hover:shadow-ultra hover:scale-[1.01]',
        'relative overflow-hidden',
        variants[variant],
        className
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-blue-ghost via-brand-cyan-ghost to-transparent rounded-full blur-3xl animate-pulse" />
      </div>
      
      {(title || subtitle) && (
        <div className="mb-6 relative z-10">
          {title && (
            <h3 className="text-xl md:text-2xl font-display font-bold text-text-primary mb-2">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-text-tertiary font-medium">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="relative z-10 min-h-[300px]" style={{ minHeight: 300 }}>
        {children}
      </div>
    </div>
  )
}

