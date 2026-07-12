'use client'

import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from '@/components/ui/motion'

/**
 * Transition douce (fondu + léger glissement) entre les pages du catalogue
 * public et des fiches programme. Pas de View Transitions API native (elle
 * exige React en canal expérimental) : ceci reste sur React/Next stables.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
