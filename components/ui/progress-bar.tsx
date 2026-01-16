'use client'

import React from 'react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number // 0-100
  className?: string
  variant?: 'default' | 'gradient' | 'success' | 'warning' | 'destructive'
  showLabel?: boolean
  height?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function ProgressBar({
  progress,
  className,
  variant = 'default',
  showLabel = false,
  height = 'md',
  animated = true,
}: ProgressBarProps) {
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const variantClasses = {
    default: 'bg-primary',
    gradient: 'bg-gradient-to-r from-brand-blue to-brand-cyan',
    success: 'bg-brand-cyan',
    warning: 'bg-brand-blue',
    destructive: 'bg-red-500',
  }

  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progression</span>
          <span className="text-sm font-semibold text-muted-foreground">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-muted overflow-hidden',
          heightClasses[height]
        )}
      >
        <motion.div
          className={cn('h-full rounded-full transition-colors duration-300', variantClasses[variant])}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${clampedProgress}%` }}
          transition={{
            duration: animated ? 1 : 0,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </div>
    </div>
  )
}

