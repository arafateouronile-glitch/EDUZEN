'use client'

import { motion, useInView } from '@/components/ui/motion'
import { useRef } from 'react'
import { Clock, Shield, TrendingUp, Award, Sparkles } from 'lucide-react'

const benefits = [
  {
    icon: Clock,
    title: 'Gagnez 20h par semaine',
    description: 'Automatisez 80% de vos tâches administratives. Feuilles de présence, attestations, conventions... tout est généré en 1 clic.',
    highlight: '80%',
    highlightLabel: 'moins d\'admin',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Award,
    title: 'Passez Qualiopi sereinement',
    description: 'Tous vos documents sont automatiquement conformes aux critères Qualiopi. Préparez votre audit en quelques clics, pas en quelques semaines.',
    highlight: '100%',
    highlightLabel: 'conforme',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: TrendingUp,
    title: 'Augmentez vos revenus',
    description: 'Proposez des formations e-learning 24/7, gérez plus de stagiaires avec moins d\'effort et réduisez vos coûts opérationnels.',
    highlight: '+30%',
    highlightLabel: 'de CA moyen',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Shield,
    title: 'Sécurisez vos données',
    description: 'Cryptage bancaire AES-256, hébergement en France, conformité RGPD totale. Vos données et celles de vos stagiaires sont en sécurité.',
    highlight: '99.9%',
    highlightLabel: 'disponibilité',
    gradient: 'from-orange-500 to-red-500'
  }
]

export function Benefits() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section id="benefices" className="relative py-24 md:py-32 lg:py-40 overflow-hidden bg-gradient-to-b from-white via-gray-50/30 to-white">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-brand-blue/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-brand-cyan/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-blue-ghost border border-brand-blue-pale mb-6"
          >
            <Sparkles className="w-4 h-4 text-brand-blue" />
            <span className="text-sm font-medium text-brand-blue-darker">Ce que vous gagnez</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6"
          >
            Concentrez-vous sur{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
              l'essentiel
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-600"
          >
            Pendant que vous formez vos stagiaires, EduZen s'occupe de tout le reste.
          </motion.p>
        </div>

        {/* Benefits grid */}
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative bg-white rounded-3xl p-8 md:p-10 border-2 border-gray-100 hover:border-brand-blue/30 shadow-lg hover:shadow-2xl hover:shadow-brand-blue/10 transition-all duration-500"
            >
              {/* Icon with gradient background */}
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.gradient} mb-6 shadow-lg`}>
                <benefit.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {benefit.title}
              </h3>

              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                {benefit.description}
              </p>

              {/* Highlight stat */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                <span className={`text-3xl md:text-4xl font-black bg-gradient-to-r ${benefit.gradient} bg-clip-text text-transparent`}>
                  {benefit.highlight}
                </span>
                <span className="text-sm font-medium text-gray-500">
                  {benefit.highlightLabel}
                </span>
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
