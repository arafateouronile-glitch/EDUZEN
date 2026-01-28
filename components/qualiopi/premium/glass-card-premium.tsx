'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'

export interface GlassCardPremiumProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: 'default' | 'deep-blue' | 'cyan-accent' | 'danger' | 'success'
  hoverable?: boolean
  glow?: boolean
  glowColor?: string
  animate?: boolean
  delay?: number
}

const GlassCardPremium = React.forwardRef<HTMLDivElement, GlassCardPremiumProps>(
  (
    {
      className,
      variant = 'default',
      hoverable = false,
      glow = false,
      glowColor,
      animate = true,
      delay = 0,
      ...props
    },
    ref
  ) => {
    // Couleurs de glow par variant
    const defaultGlowColor = {
      default: 'rgba(39, 68, 114, 0.15)',
      'deep-blue': 'rgba(39, 68, 114, 0.25)',
      'cyan-accent': 'rgba(52, 185, 238, 0.25)',
      danger: 'rgba(239, 68, 68, 0.2)',
      success: 'rgba(34, 197, 94, 0.2)',
    }

    const resolvedGlowColor = glowColor || defaultGlowColor[variant]

    return (
      <motion.div
        ref={ref}
        className={cn(
          // Base styles - Ultra premium glass effect
          'relative rounded-2xl border transition-all duration-300',
          // Backdrop blur 40px comme demandé
          'backdrop-blur-[40px]',
          // Shadow diffuse
          'shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
          {
            // Default variant - fond semi-transparent, bordure fine blanche à 10%
            'bg-white/70 dark:bg-slate-900/70 border-white/10': variant === 'default',

            // Deep Blue variant - structure
            'bg-[#274472]/5 dark:bg-[#274472]/20 border-[#274472]/10': variant === 'deep-blue',

            // Cyan Accent variant - accents et progressions
            'bg-[#34B9EE]/5 dark:bg-[#34B9EE]/15 border-[#34B9EE]/15': variant === 'cyan-accent',

            // Danger variant - alertes
            'bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-red-900/20 dark:to-orange-900/20 border-red-200/30':
              variant === 'danger',

            // Success variant
            'bg-green-50/80 dark:bg-green-900/20 border-green-200/30': variant === 'success',

            // Hoverable effects
            'cursor-pointer': hoverable,
          },
          className
        )}
        initial={animate ? { opacity: 0, y: 20, scale: 0.95 } : false}
        animate={animate ? { opacity: 1, y: 0, scale: 1 } : false}
        transition={{
          duration: 0.5,
          delay: delay,
          type: 'spring',
          stiffness: 100,
          damping: 15,
        }}
        whileHover={
          hoverable
            ? {
                scale: 1.02,
                y: -4,
                boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
              }
            : undefined
        }
        {...(props as any)}
      >
        {/* Glow effect animé */}
        {glow && (
          <motion.div
            className="absolute -inset-0.5 rounded-2xl opacity-0 blur-xl -z-10"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${resolvedGlowColor} 0%, transparent 70%)`,
            }}
            animate={{
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Reflet premium en haut */}
        <div
          className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.4) 50%, transparent)',
          }}
        />

        {/* Content */}
        <div className="relative z-10">{props.children}</div>
      </motion.div>
    )
  }
)
GlassCardPremium.displayName = 'GlassCardPremium'

export { GlassCardPremium }
