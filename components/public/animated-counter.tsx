'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform } from '@/components/ui/motion'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  className?: string
}

/** Compte de 0 jusqu'à `value` quand l'élément entre dans le viewport, au lieu d'un affichage statique. */
export function AnimatedCounter({ value, suffix = '', className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { stiffness: 60, damping: 20 })
  const display = useTransform(springValue, (latest) => `${Math.round(latest).toLocaleString('fr-FR')}${suffix}`)

  useEffect(() => {
    if (isInView) motionValue.set(value)
  }, [isInView, value, motionValue])

  return <motion.span ref={ref} className={className}>{display}</motion.span>
}
