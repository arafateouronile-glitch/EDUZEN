'use client'

import { motion } from '@/components/ui/motion'
import { useEffect, useState } from 'react'

interface StatsRingChartProps {
  value: number
  max: number
  label: string
  color: string
  size?: number
}

export function StatsRingChart({ value, max, label, color, size = 120 }: StatsRingChartProps) {
  const [progress, setProgress] = useState(0)
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0

  useEffect(() => {
    const timer = setTimeout(() => setProgress(percentage), 100)
    return () => clearTimeout(timer)
  }, [percentage])

  const circumference = 2 * Math.PI * (size / 2 - 10)
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              filter: `drop-shadow(0 0 8px ${color}40)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl font-bold text-gray-900"
          >
            {value}
          </motion.div>
          <div className="text-xs text-gray-500">/ {max}</div>
        </div>
      </div>

      <div className="text-center">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="text-xs text-gray-500">{Math.round(percentage)}% complété</div>
      </div>
    </div>
  )
}
