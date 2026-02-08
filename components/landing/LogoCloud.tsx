'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef } from 'react'

// Logos fictifs représentant différents types d'organismes de formation
const logos = [
  { name: 'Formation Excellence', initials: 'FE' },
  { name: 'Institut Pro', initials: 'IP' },
  { name: 'Académie Digital', initials: 'AD' },
  { name: 'Centre Formation', initials: 'CF' },
  { name: 'Skills Academy', initials: 'SA' },
  { name: 'Learn & Grow', initials: 'LG' },
]

export function LogoCloud() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-50px' })

  return (
    <section className="relative py-16 md:py-20 overflow-hidden bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <p className="text-sm md:text-base font-medium text-gray-500 uppercase tracking-wider">
            Ils nous font confiance
          </p>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-2 text-2xl md:text-3xl font-bold text-gray-900"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
              +500
            </span>{' '}
            organismes de formation
          </motion.p>
        </motion.div>

        {/* Logo grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-8 md:gap-12 items-center justify-items-center max-w-5xl mx-auto">
          {logos.map((logo, index) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.1 * index,
                ease: [0.16, 1, 0.3, 1]
              }}
              whileHover={{ scale: 1.1, y: -4 }}
              className="group flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center shadow-sm group-hover:shadow-lg group-hover:border-brand-blue-pale transition-all duration-300">
                <span className="text-lg md:text-xl font-bold text-gray-400 group-hover:text-brand-blue transition-colors duration-300">
                  {logo.initials}
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {logo.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Certifications badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mt-12 pt-10 border-t border-gray-100"
        >
          {[
            { label: 'Certifié Qualiopi', color: 'brand-blue' },
            { label: 'RGPD Conforme', color: 'brand-cyan' },
            { label: 'Hébergé en France', color: 'brand-blue' },
            { label: 'Support 24/7', color: 'brand-cyan' },
          ].map((badge, index) => (
            <motion.div
              key={badge.label}
              whileHover={{ scale: 1.05 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full bg-${badge.color}/5 border border-${badge.color}/20`}
            >
              <div className={`w-2 h-2 rounded-full bg-${badge.color}`} />
              <span className="text-sm font-medium text-gray-700">{badge.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
