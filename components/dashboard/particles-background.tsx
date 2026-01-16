'use client'

import { motion } from '@/components/ui/motion'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { useMemo } from 'react'

/**
 * Composant optimisé pour les particules animées en arrière-plan
 * - Réduit de 20 à 6 particules pour améliorer les performances
 * - Respecte prefers-reduced-motion
 * - Utilise will-change pour optimisation GPU
 */
export function ParticlesBackground() {
  const prefersReducedMotion = useReducedMotion()
  
  // Générer les positions des particules une seule fois (memoization)
  const particles = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 2,
    }))
  }, [])

  // Si l'utilisateur préfère les animations réduites, ne pas afficher les particules
  if (prefersReducedMotion) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-brand-blue/20 rounded-full"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            willChange: 'transform, opacity', // Optimisation GPU
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.5, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}



