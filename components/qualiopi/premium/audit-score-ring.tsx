'use client'

import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface AuditScoreRingProps {
  score: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
  showLabel?: boolean
  animated?: boolean
}

export function AuditScoreRing({
  score,
  size = 180,
  strokeWidth = 12,
  className,
  showLabel = true,
  animated = true,
}: AuditScoreRingProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  // Animation du score avec spring
  const springScore = useSpring(0, {
    stiffness: 40,
    damping: 25,
  })

  const animatedProgress = useTransform(
    springScore,
    [0, 100],
    [circumference, 0]
  )

  const displayScore = useTransform(springScore, (value) => Math.round(value))

  useEffect(() => {
    if (mounted && animated) {
      springScore.set(score)
    } else if (!animated) {
      springScore.set(score)
    }
  }, [score, mounted, animated, springScore])

  // Déterminer la couleur selon le score
  const getScoreColor = (score: number) => {
    if (score >= 90) return { primary: '#22C55E', secondary: '#16A34A', label: 'Excellent' }
    if (score >= 75) return { primary: '#34B9EE', secondary: '#0EA5E9', label: 'Bon' }
    if (score >= 50) return { primary: '#F59E0B', secondary: '#D97706', label: 'À améliorer' }
    return { primary: '#EF4444', secondary: '#DC2626', label: 'Critique' }
  }

  const colors = getScoreColor(score)

  // Icône selon le score
  const ScoreIcon = score >= 90
    ? CheckCircle2
    : score >= 75
    ? TrendingUp
    : score >= 50
    ? AlertTriangle
    : AlertTriangle

  const progress = circumference - (score / 100) * circumference

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      {/* SVG Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200/50 dark:text-slate-700/50"
          />

          {/* Progress circle animé */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? animatedProgress : progress}
            filter="url(#glow)"
            className="transition-all duration-300"
          />

          {/* Particles/dots décoratifs autour du ring */}
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * 2 * Math.PI - Math.PI / 2
            const dotRadius = radius + strokeWidth + 8
            const x = center + dotRadius * Math.cos(angle)
            const y = center + dotRadius * Math.sin(angle)
            const isActive = (i / 8) * 100 <= score

            return (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r={2}
                fill={isActive ? colors.primary : 'currentColor'}
                className={cn(
                  'transition-colors duration-500',
                  isActive ? '' : 'text-slate-300 dark:text-slate-600'
                )}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              />
            )
          })}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Score animé */}
          <div className="flex items-baseline gap-0.5">
            <motion.span
              className="font-space-grotesk text-4xl font-black tracking-tight"
              style={{ color: colors.primary }}
            >
              {animated && mounted ? (
                <motion.span>{displayScore}</motion.span>
              ) : (
                score
              )}
            </motion.span>
            <span
              className="text-xl font-bold"
              style={{ color: colors.secondary }}
            >
              %
            </span>
          </div>

          {/* Label */}
          {showLabel && (
            <motion.div
              className="mt-1 flex items-center gap-1 text-xs font-medium"
              style={{ color: colors.secondary }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <ScoreIcon className="h-3 w-3" />
              <span>{colors.label}</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Label sous le ring */}
      <motion.div
        className="mt-3 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-[#274472]" />
          <span className="font-space-grotesk text-sm font-semibold text-[#274472]">
            Score de Préparation à l'Audit
          </span>
        </div>
      </motion.div>
    </div>
  )
}
