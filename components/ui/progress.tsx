'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indicatorClassName?: string
  'aria-label'?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indicatorClassName, 'aria-label': ariaLabel, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    // Générer un label par défaut si aucun n'est fourni
    const defaultLabel = ariaLabel || `Progression: ${Math.round(percentage)}%`

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={defaultLabel}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-gray-100',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full bg-brand-blue transition-all duration-300 ease-in-out',
            indicatorClassName
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
export type { ProgressProps }
