'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
}

const BentoGrid = React.forwardRef<HTMLDivElement, BentoGridProps>(
  ({ className, columns = 4, gap = 'md', children, ...props }, ref) => {
    const gapClass = {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8',
    }[gap]

    const gridCols = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    }[columns]

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          gridCols,
          gapClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
BentoGrid.displayName = 'BentoGrid'

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2 | 3
  className?: string
}

const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  ({ className, span = 1, rowSpan = 1, children, ...props }, ref) => {
    const colSpan = {
      1: 'col-span-1',
      2: 'col-span-1 md:col-span-2',
      3: 'col-span-1 md:col-span-2 lg:col-span-3',
      4: 'col-span-1 md:col-span-2 lg:col-span-4',
    }[span]

    const rowSpanClass = {
      1: 'row-span-1',
      2: 'row-span-1 md:row-span-2',
      3: 'row-span-1 md:row-span-3',
    }[rowSpan]

    return (
      <motion.div
        ref={ref}
        className={cn(
          colSpan,
          rowSpanClass,
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
BentoCard.displayName = 'BentoCard'

export { BentoGrid, BentoCard }
