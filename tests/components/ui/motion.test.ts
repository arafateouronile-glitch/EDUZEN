/**
 * Tests des réexports de components/ui/motion.tsx
 * Vérifie que le wrapper framer-motion expose bien l'API attendue.
 */

import { describe, it, expect } from 'vitest'
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useTransform,
  useSpring,
  useAnimationControls,
  useScroll,
  Reorder,
} from '@/components/ui/motion'

describe('components/ui/motion', () => {
  it('devrait réexporter motion et AnimatePresence', () => {
    expect(motion).toBeDefined()
    expect(AnimatePresence).toBeDefined()
  })

  it('devrait réexporter les hooks useInView, useMotionValue, useTransform, useSpring', () => {
    expect(typeof useInView).toBe('function')
    expect(typeof useMotionValue).toBe('function')
    expect(typeof useTransform).toBe('function')
    expect(typeof useSpring).toBe('function')
  })

  it('devrait réexporter useAnimationControls et useScroll', () => {
    expect(typeof useAnimationControls).toBe('function')
    expect(typeof useScroll).toBe('function')
  })

  it('devrait réexporter Reorder', () => {
    expect(Reorder).toBeDefined()
  })
})
