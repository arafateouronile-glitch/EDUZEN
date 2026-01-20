'use client'

import { cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  iconBgColor?: string
  trend?: 'up' | 'down' | 'neutral'
  prefix?: string
  suffix?: string
  loading?: boolean
  className?: string
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBgColor = 'bg-brand-blue/10',
  trend = 'neutral',
  prefix,
  suffix,
  loading = false,
  className,
}: StatsCardProps) {
  if (loading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />
      case 'down':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Minus className="h-3 w-3" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
      case 'down':
        return 'text-red-600 bg-red-50 dark:bg-red-950/50'
      default:
        return 'text-muted-foreground bg-muted'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('relative overflow-hidden group hover:shadow-lg transition-shadow', className)}>
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <div className="flex items-baseline gap-1">
                {prefix && (
                  <span className="text-lg font-medium text-muted-foreground">
                    {prefix}
                  </span>
                )}
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
                </span>
                {suffix && (
                  <span className="text-lg font-medium text-muted-foreground">
                    {suffix}
                  </span>
                )}
              </div>
              {(change !== undefined || changeLabel) && (
                <div className="flex items-center gap-2">
                  {change !== undefined && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        getTrendColor()
                      )}
                    >
                      {getTrendIcon()}
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                  )}
                  {changeLabel && (
                    <span className="text-xs text-muted-foreground">
                      {changeLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl',
                iconBgColor
              )}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Skeleton version for loading states
export function StatsCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}
