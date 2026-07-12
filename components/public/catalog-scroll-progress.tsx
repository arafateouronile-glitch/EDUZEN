'use client'

import { motion, useScroll, useSpring } from '@/components/ui/motion'

interface CatalogScrollProgressProps {
  primaryColor: string
}

export function CatalogScrollProgress({ primaryColor }: CatalogScrollProgressProps) {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left"
      style={{ scaleX, backgroundColor: primaryColor }}
    />
  )
}
