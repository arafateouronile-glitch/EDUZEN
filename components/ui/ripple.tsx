'use client'

import { motion } from '@/components/ui/motion'
import { useEffect, useRef, useState } from 'react'

export interface RippleProps {
  className?: string
  duration?: number
  style?: React.CSSProperties
}

export function useRipple<T extends HTMLElement = HTMLButtonElement>() {
  const ref = useRef<T>(null)
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleClick = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const newRipple = {
        x,
        y,
        id: Date.now(),
      }

      setRipples((prev) => [...prev, newRipple])

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
      }, 600)
    }

    element.addEventListener('click', handleClick)
    return () => {
      element.removeEventListener('click', handleClick)
    }
  }, [])

  return { ref, ripples }
}

export function Ripple({
  className = '',
  duration = 600,
}: RippleProps) {
  return (
    <motion.div
      className={`absolute inset-0 rounded-full bg-white/30 pointer-events-none ${className}`}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 4, opacity: 0 }}
      transition={{ duration: duration / 1000, ease: 'easeOut' }}
    />
  )
}
























