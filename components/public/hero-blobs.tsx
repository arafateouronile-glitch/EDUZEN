'use client'

import { motion } from '@/components/ui/motion'

/**
 * Dégradé "mesh" respirant en arrière-plan (motif landing page), partagé entre
 * les hero du catalogue et des pages programme. Trois masses de couleur qui
 * dérivent, pulsent en échelle et en opacité de façon désynchronisée pour un
 * effet organique plutôt qu'un simple flottement vertical.
 */
export function HeroBlobs({ primaryColor, accentColor }: { primaryColor: string; accentColor: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <motion.div
        className="absolute left-[-6%] top-[10%] w-[420px] h-[420px] rounded-full blur-[110px]"
        style={{ backgroundColor: accentColor }}
        animate={{ y: [0, -24, 0], x: [0, 12, 0], scale: [1, 1.12, 1], opacity: [0.2, 0.32, 0.2] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-8%] bottom-[-5%] w-[520px] h-[520px] rounded-full blur-[130px]"
        style={{ backgroundColor: primaryColor }}
        animate={{ y: [0, 20, 0], x: [0, -16, 0], scale: [1, 1.08, 1], opacity: [0.25, 0.36, 0.25] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.div
        className="absolute left-[35%] top-[45%] w-[320px] h-[320px] rounded-full blur-[100px]"
        style={{ backgroundColor: accentColor }}
        animate={{ y: [0, 18, 0], x: [0, -10, 0], scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
      />
    </div>
  )
}
