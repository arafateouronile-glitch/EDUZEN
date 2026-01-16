'use client'

import { motion, useAnimationControls } from '@/components/ui/motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface BounceOnHoverProps {
  children: ReactNode
  intensity?: number
  className?: string
}

export function BounceOnHover({
  children,
  intensity = 0.05,
  className,
}: BounceOnHoverProps) {
  const controls = useAnimationControls()

  return (
    <motion.div
      className={cn(className)}
      onHoverStart={() => {
        controls.start({
          scale: 1 + intensity,
          y: -2,
          transition: { type: 'spring', stiffness: 400, damping: 10 },
        })
      }}
      onHoverEnd={() => {
        controls.start({
          scale: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 400, damping: 10 },
        })
      }}
      animate={controls}
    >
      {children}
    </motion.div>
  )
}

export interface PulseOnMountProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function PulseOnMount({
  children,
  delay = 0,
  className,
}: PulseOnMountProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        delay,
        duration: 0.5,
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
    >
      {children}
    </motion.div>
  )
}

export interface ShakeOnErrorProps {
  children: ReactNode
  shouldShake: boolean
  className?: string
}

export function ShakeOnError({
  children,
  shouldShake,
  className,
}: ShakeOnErrorProps) {
  return (
    <motion.div
      className={cn(className)}
      animate={shouldShake ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 },
      } : {}}
    >
      {children}
    </motion.div>
  )
}

export interface ScaleOnClickProps {
  children: ReactNode
  className?: string
  scale?: number
}

export function ScaleOnClick({
  children,
  className,
  scale = 0.95,
}: ScaleOnClickProps) {
  return (
    <motion.div
      className={cn(className)}
      whileTap={{ scale }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  )
}

