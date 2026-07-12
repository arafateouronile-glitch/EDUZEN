'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from '@/components/ui/motion'

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}

/**
 * Bouton CTA "magnétique" : suit légèrement le curseur (motif de
 * components/landing/Hero.tsx), désactivé sur tactile/prefers-reduced-motion.
 * Rendu en <a> si `href` est fourni, sinon en <button>.
 */
export function MagneticButton({ children, className, style, href, onClick, type = 'button' }: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const frameRef = useRef<number | null>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const [isMagneticEnabled, setIsMagneticEnabled] = useState(false)

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hoverFine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const update = () => setIsMagneticEnabled(hoverFine.matches && !reducedMotion.matches)
    update()

    hoverFine.addEventListener('change', update)
    reducedMotion.addEventListener('change', update)

    return () => {
      hoverFine.removeEventListener('change', update)
      reducedMotion.removeEventListener('change', update)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMagneticEnabled || !ref.current) return
    pointerRef.current = { x: e.clientX, y: e.clientY }
    if (frameRef.current !== null) return

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      if (!ref.current || !pointerRef.current) return
      const { left, top, width, height } = ref.current.getBoundingClientRect()
      const centerX = left + width / 2
      const centerY = top + height / 2
      x.set((pointerRef.current.x - centerX) * 0.2)
      y.set((pointerRef.current.y - centerY) * 0.2)
    })
  }

  const handleMouseLeave = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    pointerRef.current = null
    x.set(0)
    y.set(0)
  }

  const motionProps = {
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    style: { x: springX, y: springY, ...style },
    className,
  }

  if (href) {
    return (
      <motion.a ref={ref as any} href={href} {...motionProps}>
        {children}
      </motion.a>
    )
  }

  return (
    <motion.button
      ref={ref as any}
      type={type}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </motion.button>
  )
}
