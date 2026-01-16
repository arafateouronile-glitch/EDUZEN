'use client'

import { useTransform, useScroll, MotionValue } from '@/components/ui/motion'
import { useRef } from 'react'

export function useParallax(distance: number = 100) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance])

  return { ref, y }
}

export function useMultiLayerParallax() {
  return {
    layer1: { speed: 0.2, distance: 100 },
    layer2: { speed: 0.4, distance: 60 },
    layer3: { speed: 0.6, distance: 40 },
    layer4: { speed: 1.0, distance: 0 },
  }
}
