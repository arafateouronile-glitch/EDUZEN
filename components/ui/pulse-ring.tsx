'use client'

import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

interface PulseRingProps {
  className?: string
  size?: number
  color?: string
}

export function PulseRing({ className, size = 40, color = 'rgba(99, 102, 241, 0.5)' }: PulseRingProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          width: size,
          height: size,
          borderColor: color,
        }}
        animate={{
          scale: [1, 1.5, 2],
          opacity: [0.8, 0.4, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          width: size,
          height: size,
          borderColor: color,
        }}
        animate={{
          scale: [1, 1.5, 2],
          opacity: [0.8, 0.4, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
          delay: 0.5,
        }}
      />
      <motion.div
        className="absolute rounded-full bg-primary"
        style={{
          width: size * 0.4,
          height: size * 0.4,
        }}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}
























