'use client'

import { motion } from '@/components/ui/motion'
import { useEffect, useState } from 'react'

interface AdminStatsRingProps {
  value: number
  max: number
  label: string
  sublabel?: string
  color?: string
  size?: number
  strokeWidth?: number
}

export function AdminStatsRing({
  value,
  max,
  label,
  sublabel,
  color = '#335ACF',
  size = 140,
  strokeWidth = 12,
}: AdminStatsRingProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress((value / max) * 100)
    }, 300)
    return () => clearTimeout(timer)
  }, [value, max])

  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  const progressLabel = `${label}${sublabel ? ` ${sublabel}` : ''}: ${value} sur ${max} (${Math.round(percentage)}%)`

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="relative"
        style={{ width: size, height: size }}
      >
        <svg 
          width={size} 
          height={size} 
          className="transform -rotate-90"
          role="img"
          aria-label={progressLabel}
        >
          {/* Glow filter */}
          <defs>
            <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            className="opacity-20"
          />

          {/* Progress circle with animation */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            style={{
              filter: `drop-shadow(0 0 8px ${color}40)`,
            }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={progressLabel}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-center"
          >
            <div className="text-4xl font-display font-bold text-gray-900 mb-1 tracking-tighter">{value}</div>
            <div className="text-sm text-gray-600 font-medium tracking-tight">sur {max}</div>
            <div className="text-xs font-bold text-gray-500 mt-1.5 tracking-tight">{Math.round(percentage)}%</div>
          </motion.div>
        </div>

        {/* Rotating glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Label */}
      <div className="text-center">
        <p className="text-base font-display font-bold text-gray-800 tracking-tight">{label}</p>
        {sublabel && <p className="text-sm text-gray-600 font-medium mt-1 tracking-tight">{sublabel}</p>}
      </div>
    </div>
  )
}
