'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'premium' | 'subtle'
  hoverable?: boolean
  glow?: boolean
  glowColor?: string
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', hoverable = false, glow = false, glowColor = 'rgba(51, 90, 207, 0.3)', ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative rounded-2xl border backdrop-blur-xl transition-all duration-300',
          {
            // Default variant
            'bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/30 shadow-lg': variant === 'default',
            
            // Premium variant with stronger glass effect
            'bg-white/80 dark:bg-gray-900/80 border-white/30 dark:border-gray-700/40 shadow-xl': variant === 'premium',
            
            // Subtle variant
            'bg-white/50 dark:bg-gray-900/50 border-white/10 dark:border-gray-700/20 shadow-md': variant === 'subtle',
            
            // Hoverable effects
            'cursor-pointer': hoverable,
            'hover:shadow-2xl hover:scale-[1.02]': hoverable,
            'hover:bg-white/90 dark:hover:bg-gray-900/90': hoverable,
          },
          className
        )}
        whileHover={hoverable ? { scale: 1.02, y: -2 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        {...props}
      >
        {/* Glow effect */}
        {glow && (
          <motion.div
            className="absolute inset-0 rounded-2xl opacity-0 blur-xl"
            style={{
              background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            }}
            animate={{
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {props.children}
        </div>
      </motion.div>
    )
  }
)
GlassCard.displayName = 'GlassCard'

export { GlassCard }
