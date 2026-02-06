'use client'

import { motion, AnimatePresence } from '@/components/ui/motion'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

const DURATION = 0.15

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          duration: DURATION,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}







