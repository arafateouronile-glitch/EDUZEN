'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from '@/components/ui/motion'

export function Preloader() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Force un minimum de temps d'affichage pour l'effet premium
    // et s'assure que la page est chargée
    const timer = setTimeout(() => {
      setIsLoading(false)
      document.body.style.overflow = 'auto'
    }, 2000)

    // Bloquer le scroll pendant le chargement
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(timer)
      document.body.style.overflow = 'auto'
    }
  }, [])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
        >
          <div className="flex flex-col items-center gap-4">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative w-16 h-16 md:w-20 md:h-20"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan shadow-xl flex items-center justify-center">
                <span className="text-white font-black text-3xl md:text-4xl italic">E</span>
              </div>
              {/* Pulse effect */}
              <motion.div 
                className="absolute inset-0 rounded-2xl bg-brand-cyan/20 z-[-1]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>

            {/* Text Reveal */}
            <div className="overflow-hidden h-8">
              <motion.span
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
                className="block text-sm font-medium text-gray-400 tracking-widest uppercase"
              >
                EduZen
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
